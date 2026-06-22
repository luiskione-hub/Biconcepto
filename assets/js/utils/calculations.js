// ─── CÁLCULOS DE NEGOCIO ─────────────────────────────────────

const salesOn = ds => DB.salesHistory.filter(s=>s.date===ds).reduce((a,s)=>a+(s.amount||0),0);
const laborOn = ds => DB.shifts.filter(s=>s.date===ds).reduce((a,s)=>a+(s.cost||0),0);

// estSales: previsión con factores de tendencia por día de semana
// Modelo: ventas_mismo_día_año_anterior × factor_tendencia_por_dow
// Fuentes en orden de prioridad:
//   1. Dato real en salesHistory
//   2. FORECAST_SEED (previsiones calculadas con datos reales)
//   3. Mismo día año anterior × factor dow
//   4. Media ponderada del histórico por dow
//   5. HOURLY fallback
const estSales = ds => {
  // Dato real
  const real = salesOn(ds);
  if(real > 0) return real;

  // Previsión pre-calculada
  const seed = (typeof FORECAST_SEED !== 'undefined') ? FORECAST_SEED.find(f=>f.date===ds) : null;
  if(seed) return seed.amount;

  // Calcular en tiempo real: mismo dow año anterior × factor tendencia
  const dow = new Date(ds).getDay(); // app: 0=Dom,1=Lun...
  const factors = (typeof TREND_FACTORS !== 'undefined') ? TREND_FACTORS : null;
  const factor = factors ? (factors.byDow[String(dow)] || factors.global || 0.83) : 0.83;

  // Buscar mismo día de semana del año anterior
  const dObj = new Date(ds);
  const lyBase = new Date(dObj);
  lyBase.setFullYear(lyBase.getFullYear() - 1);
  const lyDow = lyBase.getDay();
  lyBase.setDate(lyBase.getDate() + (dow - lyDow));
  const lyDs = lyBase.toISOString().slice(0,10);
  const lyVenta = salesOn(lyDs);
  if(lyVenta > 0) return Math.round(lyVenta * factor);

  // Fallback: media ponderada por dow del histórico
  const mismosDow = DB.salesHistory.filter(s=>{
    if(!s.date||s.date.length<10||s.date>=ds)return false;
    return new Date(s.date).getDay()===dow;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  if(mismosDow.length >= 2){
    let sumP=0, sumV=0;
    mismosDow.slice(0,12).forEach((s,i)=>{ const p=1/(i+1); sumV+=(s.amount||0)*p; sumP+=p; });
    return Math.round(sumV/sumP * factor);
  }

  // Último fallback: HOURLY
  const d = dk(ds);
  return Object.values(HOURLY).reduce((a,v)=>a+(v[d]||0),0);
};



function dynFixedDay(){
  // Coste fijo diario = suma de costes fijos activos / días del mes
  const active = DB.fixedCosts && DB.fixedCosts.length
    ? DB.fixedCosts.filter(c=>c.active!==false).reduce((a,c)=>a+(c.amount||0),0)
    : FIXED_MONTHLY;
  const d = new Date();
  return Math.round(active / new Date(d.getFullYear(), d.getMonth()+1, 0).getDate());
}

function planFactor(ds){
  // Ajusta ±1 persona según si las ventas del día son >25% sobre/bajo la media
  const ventas=salesOn(ds)||estSales(ds)||0;
  if(!ventas) return 0;
  const dow=new Date(ds).getDay();
  const mismosDow=DB.salesHistory.filter(s=>s.date&&s.date<ds&&new Date(s.date).getDay()===dow);
  if(mismosDow.length<3) return 0;
  const media=mismosDow.slice(0,8).reduce((a,s)=>a+(s.amount||0),0)/Math.min(8,mismosDow.length);
  if(media<=0) return 0;
  if(ventas>media*1.25) return 1;
  if(ventas<media*0.75) return -1;
  return 0;
}

const hrate   = () => {
  const b=DB.conv.sal+DB.conv.plus;
  return parseFloat(((b*(1+DB.conv.ss/100))/(40*52/12)).toFixed(2));
};

function staffForShift(start,end,dow,ds){
  const needs=getStaffNeeds(ds);
  if(!Object.keys(needs).length) return 0;
  const hStart=parseInt(start);
  const hEnd=parseInt(end)||0;
  let max=0;
  for(let h=hStart;h!==hEnd;h=(h+1)%24){
    const n=needs[String(h)]?(needs[String(h)][String(dow)]||0):0;
    if(n>max) max=n;
    if(h===23&&hEnd===0) break;
  }
  return max;
}

function getStaffNeeds(ds){
  const date=ds||today();
  if(DB.staffSeasons&&DB.staffSeasons.length){
    const season=DB.staffSeasons.find(s=>s.from<=date&&s.to>=date);
    if(season&&season.needs&&Object.keys(season.needs).length) return season.needs;
    const past=DB.staffSeasons.filter(s=>s.from<=date).sort((a,b)=>b.from.localeCompare(a.from));
    if(past.length) return past[0].needs;
  }
  if(DB.staffNeeds&&Object.keys(DB.staffNeeds).length) return DB.staffNeeds;
  if(typeof STAFF_NEEDS_SEED!=='undefined') return STAFF_NEEDS_SEED;
  return {};
}

function availableEmps(ds){
  const dow=new Date(ds).getDay();
  const dsNorm=ds.slice(0,10);
  const vacas=new Set(DB.vacations.filter(v=>{
    if(v.status==='rejected') return false;
    const vStart=(v.start||'').slice(0,10);
    const vEnd=(v.end||'').slice(0,10);
    return vStart<=dsNorm && vEnd>=dsNorm;
  }).map(v=>v.employee_id));
  return DB.employees.filter(e=>{
    if(!e.active||e.sick>0) return false;
    if(vacas.has(e.id)) return false;
    if(e.type!=='full'&&e.fs&&e.fs.length){
      if(!e.fs.some(f=>f.d===dow)) return false;
    }
    return true;
  });
}

function applyAssignRules(candidates, ds, turnoStart, turnoEnd, alreadyAssignedIds){
  const cfg=getPlanConfig();
  const rules=(cfg.assignRules||[]).filter(r=>r.active!==false);
  const dow=new Date(ds).getDay();

  // Filtrar candidatos según reglas duras (separate)
  let pool=[...candidates];

  rules.forEach(r=>{
    if(r.type==='separate'){
      // Si alguno del grupo ya está asignado en este turno, excluir al resto del grupo
      const grupoEnTurno=r.employees.some(id=>alreadyAssignedIds.has(id));
      if(grupoEnTurno){
        pool=pool.filter(e=>!r.employees.includes(e.id)||alreadyAssignedIds.has(e.id));
      }
    }
    if(r.type==='rest_min'){
      // Excluir empleados que terminaron un turno hace menos de r.hours horas
      pool=pool.filter(e=>{
        if(!r.employees.includes(e.id))return true;
        const lastShift=DB.shifts.filter(s=>s.employee_id===e.id&&s.date<ds)
          .sort((a,b)=>b.date.localeCompare(a.date)||b.end.localeCompare(a.end))[0];
        if(!lastShift)return true;
        // Si el último turno fue ayer, comprobar gap
        if(lastShift.date===new Date(new Date(ds).getTime()-86400000).toISOString().slice(0,10)){
          const gap=hrsOf(lastShift.end,turnoStart)+24; // cruzando medianoche
          return gap>=(r.hours||10);
        }
        return true;
      });
    }
  });

  // Ordenar candidatos: priorizar según reglas blandas (prefer_sep, strong_day, coverage)
  pool.sort((a,b)=>{
    let scoreA=0, scoreB=0;

    rules.forEach(r=>{
      if(r.type==='prefer_sep'){
        // Penalizar si el otro del grupo ya está asignado
        const otroEnTurno=r.employees.filter(id=>id!==a.id).some(id=>alreadyAssignedIds.has(id));
        if(otroEnTurno&&r.employees.includes(a.id)) scoreA+=10;
        const otroEnTurnoB=r.employees.filter(id=>id!==b.id).some(id=>alreadyAssignedIds.has(id));
        if(otroEnTurnoB&&r.employees.includes(b.id)) scoreB+=10;
      }
      if(r.type==='coverage'){
        // Priorizar encargados de cobertura cuando no hay ninguno asignado aún
        const hayCobertura=r.employees.some(id=>alreadyAssignedIds.has(id));
        if(!hayCobertura){
          if(r.employees.includes(a.id)) scoreA-=20; // subir en la lista
          if(r.employees.includes(b.id)) scoreB-=20;
        }
      }
      if(r.type==='strong_day'&&r.employees.includes(a.id)){
        const esStrong=r.dows?r.dows.includes(dow):[3,4,5,6,0].includes(dow);
        if(esStrong) scoreA-=15;
      }
      if(r.type==='strong_day'&&r.employees.includes(b.id)){
        const esStrong=r.dows?r.dows.includes(dow):[3,4,5,6,0].includes(dow);
        if(esStrong) scoreB-=15;
      }
    });

    return scoreA-scoreB;
  });

  return pool;
}

function checkCoverageRule(ds, turnoStart, assignedIds){
  const cfg=getPlanConfig();
  const rules=(cfg.assignRules||[]).filter(r=>r.active!==false&&r.type==='coverage');
  const warnings=[];
  rules.forEach(r=>{
    const hayAlguno=r.employees.some(id=>assignedIds.has(id));
    if(!hayAlguno){
      const names=r.employees.map(id=>{const e=DB.employees.find(x=>x.id===id);return e?e.name.split(' ')[0]:'?';}).join('/');
      warnings.push(`${ds} ${turnoStart}: sin cobertura obligatoria (${names})`);
    }
  });
  return warnings;
}

function calcOptimalStaff(year, month){
  const mStr=`${year}-${String(month).padStart(2,'0')}`;
  const days=new Date(year,month,0).getDate();
  const cfg=getPlanConfig();
  const costHrMedio=12; // €/hora media (encima de convenio con SS)

  // Ventas del mes en histórico
  const salesMes=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(mStr));
  const totalVentas=salesMes.reduce((a,s)=>a+(s.amount||0),0);

  // Si no hay datos reales, estimar por patrón semanal
  let ventasEstimadas=totalVentas;
  if(!totalVentas){
    // Estimar usando mismo mes del año anterior o media mensual
    const prevYear=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(`${year-1}-${String(month).padStart(2,'0')}`));
    ventasEstimadas=prevYear.reduce((a,s)=>a+(s.amount||0),0);
    if(!ventasEstimadas){
      // Media de todos los días disponibles por día de semana
      const weekAvg={};
      DB.salesHistory.forEach(s=>{
        if(!s.date||s.date.length<10)return;
        const d=new Date(s.date).getDay();
        if(!weekAvg[d]) weekAvg[d]=[];
        weekAvg[d].push(s.amount||0);
      });
      for(let d=1;d<=days;d++){
        const dow=new Date(`${mStr}-${String(d).padStart(2,'0')}`).getDay();
        const avg=weekAvg[dow]&&weekAvg[dow].length?weekAvg[dow].reduce((a,b)=>a+b,0)/weekAvg[dow].length:2500;
        ventasEstimadas+=avg;
      }
    }
  }

  // Presupuesto laboral objetivo (30% de ventas = convenio hostelería)
  const ratioLaboral=DB.obj&&DB.obj.laborPct?DB.obj.laborPct/100:0.30;
  const budgetLaboral=ventasEstimadas*ratioLaboral;

  // Horas totales necesarias por mes según reglas de negocio
  let hrsComida=0, hrsCena=0, hrsPartido=0;
  for(let d=1;d<=days;d++){
    const dow=new Date(`${mStr}-${String(d).padStart(2,'0')}`).getDay();
    const rule=cfg.rules[dow];
    const sh=cfg.shifts;
    hrsComida+=(rule.c-rule.p)*hrsOf(sh.comida.start,sh.comida.end);
    hrsCena+=(rule.n-rule.p)*hrsOf(sh.cena.start,sh.cena.end);
    hrsPartido+=rule.p*(hrsOf(sh.partido1.start,sh.partido1.end)+hrsOf(sh.partido2.start,sh.partido2.end));
  }
  const hrsTotales=hrsComida+hrsCena+hrsPartido;

  // Coste laboral si contratamos las horas necesarias
  const costeLaboralNecesario=hrsTotales*costHrMedio;

  // Personas a jornada completa (160h/mes aprox) y parcial (80h/mes)
  const hrsJC=40*4.33; // ~173h/mes
  const hrsJP=20*4.33; // ~87h/mes

  // Distribución óptima minimizando coste con budget laboral
  const nJC=Math.floor(hrsTotales/hrsJC);
  const hrsRestantes=hrsTotales-(nJC*hrsJC);
  const nJP=Math.ceil(hrsRestantes/hrsJP);

  // Alternativa: solo parciales
  const nJP_solo=Math.ceil(hrsTotales/hrsJP);

  // Alternativa: mix equilibrado
  const costeJC=nJC*hrsJC*costHrMedio;
  const costeJP_resto=nJP*hrsJP*costHrMedio;
  const costeMix=costeJC+costeJP_resto;
  const costeSoloParcial=nJP_solo*hrsJP*costHrMedio;

  // Horas extra (si se supera budget)
  const dentroDePresupuesto=costeLaboralNecesario<=budgetLaboral;

  return{
    mStr, year, month, days,
    ventasEstimadas:Math.round(ventasEstimadas),
    budgetLaboral:Math.round(budgetLaboral),
    hrsTotales:Math.round(hrsTotales),
    costeLaboralNecesario:Math.round(costeLaboralNecesario),
    dentroDePresupuesto,
    opciones:[
      {label:'Mix óptimo', nJC, nJP, horas:Math.round(nJC*hrsJC+nJP*hrsJP), coste:Math.round(costeMix), personas:nJC+nJP},
      {label:'Solo 20h', nJC:0, nJP:nJP_solo, horas:Math.round(nJP_solo*hrsJP), coste:Math.round(costeSoloParcial), personas:nJP_solo},
      {label:'Solo 40h', nJC:Math.ceil(hrsTotales/hrsJC), nJP:0, horas:Math.round(Math.ceil(hrsTotales/hrsJC)*hrsJC), coste:Math.round(Math.ceil(hrsTotales/hrsJC)*hrsJC*costHrMedio), personas:Math.ceil(hrsTotales/hrsJC)},
    ],
    // Vacaciones del mes: personas en vacaciones reducen horas disponibles
    vacInMes: DB.vacations.filter(v=>v.start.startsWith(mStr)||v.end.startsWith(mStr)||(v.start<mStr&&v.end>mStr+'-31')).length,
    hrsComida:Math.round(hrsComida), hrsCena:Math.round(hrsCena), hrsPartido:Math.round(hrsPartido),
    fuente: totalVentas>0 ? 'real' : (DB.salesHistory.length>0 ? 'histórico' : 'estimado')
  };
}

function staffingReport(){
  const COSTE_HR=12;
  const OBJ_MIN=25, OBJ_MAX=35;
  const DOW_LABEL=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const cfg=getPlanConfig();
  const byDow={0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  DB.salesHistory.filter(s=>s.date&&s.date.length>=10).forEach(s=>{
    const d=new Date(s.date).getDay();
    if(!isNaN(d)) byDow[d].push(s.amount||0);
  });
  const dowAnalysis=[1,2,3,4,5,6,0].map(dow=>{
    const rule=cfg.rules[dow], sh=cfg.shifts;
    const nP=rule.p+Math.max(0,rule.c-rule.p)+Math.max(0,rule.n-rule.p);
    const horas=rule.p*(hrsOf(sh.partido1.start,sh.partido1.end)+hrsOf(sh.partido2.start,sh.partido2.end))
               +Math.max(0,rule.c-rule.p)*hrsOf(sh.comida.start,sh.comida.end)
               +Math.max(0,rule.n-rule.p)*hrsOf(sh.cena.start,sh.cena.end);
    const coste=horas*COSTE_HR;
    const vals=byDow[dow];
    const venta=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const ratio=venta>0?coste/venta*100:null;
    let estado,color;
    if(ratio===null){estado='Sin datos';color='var(--text3)';}
    else if(ratio<OBJ_MIN){estado='Infradimensionado';color='var(--amber)';}
    else if(ratio>OBJ_MAX){estado='Sobredimensionado';color='var(--red)';}
    else{estado='Óptimo';color='var(--green)';}
    return{dow,label:DOW_LABEL[dow],nP,horas:Math.round(horas),coste:Math.round(coste),venta:Math.round(venta),ratio,estado,color,n:vals.length};
  });
  const conDatos=dowAnalysis.filter(d=>d.ratio!==null);
  const ratioGlobal=conDatos.length?conDatos.reduce((a,d)=>a+d.coste,0)/conDatos.reduce((a,d)=>a+d.venta,0)*100:null;
  let estadoG,colorG;
  if(!ratioGlobal){estadoG='Sin datos';colorG='var(--text3)';}
  else if(ratioGlobal<OBJ_MIN){estadoG='Infradimensionado';colorG='var(--amber)';}
  else if(ratioGlobal>OBJ_MAX){estadoG='Sobredimensionado';colorG='var(--red)';}
  else{estadoG='Óptimo';colorG='var(--green)';}
  const tableRows=dowAnalysis.map(d=>{
    const barW=d.ratio?Math.min(100,d.ratio/50*100):0;
    const barCol=!d.ratio?'var(--border)':d.ratio<OBJ_MIN?'var(--amber)':d.ratio>OBJ_MAX?'var(--red)':'var(--green)';
    return`<tr><td style="font-weight:600">${d.label}</td>
      <td style="text-align:center">${d.nP}p</td>
      <td class="td-mono">${d.venta>0?eur(d.venta):'—'}</td>
      <td class="td-mono;color:var(--amber)">${eur(d.coste)}</td>
      <td style="min-width:120px"><div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;background:var(--bg3);border-radius:4px;height:6px">
          <div style="width:${barW}%;background:${barCol};height:6px;border-radius:4px"></div>
        </div>
        <span style="font-family:var(--mono);font-size:11px;color:${barCol};min-width:36px">${d.ratio?d.ratio.toFixed(0)+'%':'—'}</span>
      </div></td>
      <td><span style="color:${d.color};font-size:12px">${d.estado}</span></td>
      <td style="font-size:11px;color:var(--text3)">${d.n}d</td>
    </tr>`;
  }).join('');
  return`<div class="card" style="margin-top:16px;border-top:3px solid ${colorG}">
    <div class="card-header">
      <span class="card-title"><i class="fa fa-users" style="color:${colorG}"></i> Análisis de plantilla</span>
      <span style="font-size:12px;font-weight:600;color:${colorG}">${estadoG}${ratioGlobal?' · '+ratioGlobal.toFixed(1)+'% ratio':''}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Día</th><th>Personal</th><th>Venta media</th><th>Coste</th><th>Ratio laboral</th><th>Estado</th><th>Muestra</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div>
  </div>`;
}

function recalcTrendFactors(){
  // Recalcular TREND_FACTORS dinámicamente desde salesHistory
  // Para cada día de semana: media 2026 / media mismo dow 2025
  const avg = {2025:{}, 2026:{}};
  DB.salesHistory.forEach(s=>{
    if(!s.date||s.date.length<10)return;
    const y = s.date.slice(0,4);
    if(y!=='2025'&&y!=='2026')return;
    const dow = new Date(s.date).getDay(); // app: 0=Dom
    if(!avg[y][dow]) avg[y][dow]=[];
    avg[y][dow].push(s.amount||0);
  });

  const byDow = {};
  let total=0, count=0;
  for(let d=0;d<7;d++){
    const v25 = avg['2025'][d]&&avg['2025'][d].length ?
      avg['2025'][d].reduce((a,b)=>a+b,0)/avg['2025'][d].length : 0;
    const v26 = avg['2026'][d]&&avg['2026'][d].length ?
      avg['2026'][d].reduce((a,b)=>a+b,0)/avg['2026'][d].length : 0;
    if(v25>0&&v26>0){
      const f = Math.round(v26/v25*10000)/10000;
      byDow[String(d)] = f;
      total+=f; count++;
    }
  }
  const global = count>0 ? Math.round(total/count*10000)/10000 : 0.80;

  // Actualizar en TREND_FACTORS (variable global)
  if(typeof TREND_FACTORS !== 'undefined'){
    Object.assign(TREND_FACTORS, {byDow, global, updatedAt: today()});
  }

  // También regenerar previsiones futuras en FORECAST_SEED
  if(typeof FORECAST_SEED !== 'undefined'){
    const t = today();
    FORECAST_SEED.forEach(f=>{
      if(f.date <= t) return; // no recalcular días pasados
      const dow = new Date(f.date).getDay();
      const factor = byDow[String(dow)] || global;

      // Buscar mismo dow año anterior
      const dObj = new Date(f.date);
      const ly = new Date(dObj); ly.setFullYear(ly.getFullYear()-1);
      const lyDiff = dow - ly.getDay(); ly.setDate(ly.getDate()+lyDiff);
      const lyDs = ly.toISOString().slice(0,10);
      const lyV = DB.salesHistory.find(s=>s.date===lyDs);
      if(lyV&&lyV.amount>0) f.amount = Math.round(lyV.amount*factor*100)/100;
    });
  }
}

function analyzeStaffingNeeds(targetMonth){
  const needs = getStaffNeeds();
  if(!Object.keys(needs).length) return null;

  const now = new Date();
  const y = targetMonth ? parseInt(targetMonth.split('-')[0]) : now.getFullYear();
  const m = targetMonth ? parseInt(targetMonth.split('-')[1]) : now.getMonth()+1;
  const mStr = `${y}-${String(m).padStart(2,'0')}`;
  const daysInMonth = new Date(y,m,0).getDate();
  const COSTE_HR = 12; // €/h bruto + SS estimado

  // 1. Horas necesarias por semana según tabla (suma de todas las celdas = horas-persona/semana)
  const dowNames = {0:'Dom',1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb'};
  let hrsNecSemana = 0;
  Object.entries(needs).forEach(([h, dows])=>{
    Object.values(dows).forEach(v=>{ hrsNecSemana += (v||0); });
  });
  const hrsNecMes = Math.round(hrsNecSemana * 4.33);

  // 2. Horas disponibles con plantilla actual ese mes
  // Descontar: bajas médicas, vacaciones aprobadas en ese mes
  const vacEmpIds = new Set(DB.vacations.filter(v=>{
    if(v.status==='rejected') return false;
    return v.start.slice(0,7)===mStr || v.end.slice(0,7)===mStr ||
           (v.start<mStr+'-01' && v.end>mStr+'-31');
  }).map(v=>v.employee_id));

  const activos = DB.employees.filter(e=>e.active&&e.sick===0);
  const activosSinVac = activos.filter(e=>!vacEmpIds.has(e.id));
  const activosConVac = activos.filter(e=>vacEmpIds.has(e.id));

  // Calcular horas reales descontando días de vacaciones
  let hrsDisp = 0;
  activos.forEach(e=>{
    let hrsBase = e.wh * 4.33;
    if(vacEmpIds.has(e.id)){
      // Calcular días de vaca ese mes
      const vacs = DB.vacations.filter(v=>v.employee_id===e.id&&v.status!=='rejected'&&
        (v.start.slice(0,7)===mStr||v.end.slice(0,7)===mStr||(v.start<mStr+'-01'&&v.end>mStr+'-31')));
      let vacDias = 0;
      vacs.forEach(v=>{
        let cur = new Date(Math.max(new Date(v.start), new Date(`${mStr}-01`)));
        const end = new Date(Math.min(new Date(v.end), new Date(y,m,0)));
        while(cur<=end){ vacDias++; cur.setDate(cur.getDate()+1); }
      });
      hrsBase = Math.max(0, hrsBase - (e.wh/5)*vacDias);
    }
    hrsDisp += hrsBase;
  });
  hrsDisp = Math.round(hrsDisp);

  const deficit = hrsNecMes - hrsDisp;
  const pct = hrsNecMes>0 ? Math.round(Math.abs(deficit)/hrsNecMes*100) : 0;
  const esDeficit = deficit > 0;
  const esOptimo = pct <= 8; // ±8% = óptimo

  // 3. Estado
  let estado, color;
  if(esOptimo){ estado='óptimo'; color='var(--green)'; }
  else if(esDeficit){ estado='infradimensionado'; color='var(--red)'; }
  else { estado='sobredimensionado'; color='var(--amber)'; }

  // 4. Propuestas concretas
  const propuestas = [];
  const hrsGap = Math.abs(deficit);
  const costeGap = Math.round(hrsGap * COSTE_HR);

  if(esDeficit){
    // Calcular contratos que cubren el gap
    const opciones = [
      {h:40, label:'jornada completa (40h)'},
      {h:35, label:'jornada reducida (35h)'},
      {h:30, label:'jornada reducida (30h)'},
      {h:20, label:'media jornada (20h)'},
    ];
    // Combinaciones para cubrir el gap
    const hMes = h => h*4.33;
    propuestas.push({
      tipo:'contratar',
      icon:'fa-user-plus',
      color:'var(--red)',
      titulo:'Contratar personal',
      opciones: opciones.map(o=>{
        const n = Math.ceil(hrsGap/hMes(o.h));
        const resto = hrsGap - (n-1)*hMes(o.h);
        const coste = Math.round(n*o.h*4.33*COSTE_HR);
        return `${n} persona${n>1?'s':''} a ${o.label} (~${coste}€/mes)`;
      })
    });
    // Horas extra
    const hrsExtraPerPerson = Math.round(hrsGap / activosSinVac.length);
    if(hrsExtraPerPerson <= 20){
      propuestas.push({
        tipo:'extras',
        icon:'fa-clock',
        color:'var(--amber)',
        titulo:'Horas extra temporales',
        opciones:[
          `Distribuir ${Math.round(hrsGap)}h extra entre los ${activosSinVac.length} empleados disponibles (~${hrsExtraPerPerson}h/persona)`,
          `Coste adicional estimado: ${eur(costeGap)} (sin recargos de horas extra)`,
          `Ideal para picos temporales de temporada sin contratación permanente`
        ]
      });
    }
    // Retrasar vacaciones
    if(activosConVac.length > 0){
      propuestas.push({
        tipo:'vacaciones',
        icon:'fa-calendar-xmark',
        color:'var(--teal)',
        titulo:'Revisar vacaciones del mes',
        opciones:[
          `${activosConVac.length} empleado${activosConVac.length>1?'s están':'está'} de vacaciones en ${new Date(y,m-1,1).toLocaleString('es-ES',{month:'long'})}`,
          `Retrasar o fraccionar sus vacaciones recuperaría horas disponibles`,
          `Revisar en la sección Vacaciones si alguna puede moverse`
        ]
      });
    }
  } else if(!esOptimo){
    // Sobredimensionado
    const hSobra = Math.abs(deficit);
    const personasExtra = Math.round(hSobra / (20*4.33));
    propuestas.push({
      tipo:'vacaciones',
      icon:'fa-umbrella-beach',
      color:'var(--teal)',
      titulo:'Adelantar vacaciones',
      opciones:[
        `Sobran ~${Math.round(hSobra)}h (${pct}%) — es buen momento para dar vacaciones`,
        `${personasExtra} persona${personasExtra>1?'s':''} de 20h podrían estar de vacaciones sin afectar la operativa`,
        `Revisar qué empleados tienen días pendientes en Vacaciones`
      ]
    });
    propuestas.push({
      tipo:'reducir',
      icon:'fa-arrow-down',
      color:'var(--amber)',
      titulo:'Reducir jornadas',
      opciones:[
        `Negociar reducción temporal de jornada con empleados de 40h`,
        `Plantear ERTE parcial si el sobredimensionamiento es estructural (>${pct}% más de ${3} meses)`,
        personasExtra>0?`A largo plazo: no renovar ${personasExtra} contrato${personasExtra>1?'s':''} de 20h al vencer`:''
      ].filter(Boolean)
    });
    // No renovar si muy sobredimensionado
    if(pct>20){
      const personasNORenovar = Math.floor(hSobra/(40*4.33));
      if(personasNORenovar>0){
        propuestas.push({
          tipo:'despido',
          icon:'fa-user-minus',
          color:'var(--red)',
          titulo:'Ajuste estructural de plantilla',
          opciones:[
            `Con ${pct}% de sobredimensionamiento sostenido, valorar no renovar ${personasNORenovar} contrato${personasNORenovar>1?'s':''} de 40h`,
            `Ahorro estimado: ~${eur(personasNORenovar*40*4.33*COSTE_HR)}/mes`,
            `Consultar con asesoría laboral antes de tomar esta decisión`
          ]
        });
      }
    }
  }

  return {
    mStr, mLabel: new Date(y,m-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'}),
    hrsNecSemana, hrsNecMes, hrsDisp, deficit, pct, estado, color,
    esDeficit, esOptimo, propuestas,
    nActivos: activos.length, nConVac: activosConVac.length, nSinVac: activosSinVac.length,
    costeActual: Math.round(hrsDisp*COSTE_HR),
    costeNecesario: Math.round(hrsNecMes*COSTE_HR)
  };
}

function renderStaffingAnalysis(a){
  const icon = a.esOptimo?'fa-circle-check':a.esDeficit?'fa-triangle-exclamation':'fa-circle-info';
  const pctBar = Math.min(100, Math.round(a.hrsDisp/a.hrsNecMes*100));

  const propCards = a.propuestas.map(p=>`
    <div style="border:1px solid var(--border2);border-radius:8px;overflow:hidden;margin-bottom:8px">
      <div style="padding:8px 12px;background:var(--bg3);display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border2)">
        <i class="fa ${p.icon}" style="color:${p.color}"></i>
        <span style="font-weight:600;font-size:13px">${p.titulo}</span>
      </div>
      <div style="padding:8px 12px">
        ${p.opciones.map((o,i)=>`<div style="display:flex;gap:8px;font-size:12px;color:var(--text2);padding:3px 0">
          <span style="color:var(--text3);min-width:14px">${i+1}.</span><span>${o}</span>
        </div>`).join('')}
      </div>
    </div>`).join('');

  return`<div class="card" style="border-top:3px solid ${a.color}">
    <div class="card-header">
      <span class="card-title"><i class="fa ${icon}" style="color:${a.color}"></i> Análisis de plantilla — ${a.mLabel}</span>
      <span style="font-weight:700;color:${a.color};font-size:13px;text-transform:capitalize">${a.estado}</span>
    </div>
    <div style="padding:14px 16px">
      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">Horas necesarias/mes</div>
          <div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--text)">${a.hrsNecMes}h</div>
          <div style="font-size:10px;color:var(--text3)">${a.hrsNecSemana}h/semana</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">Horas disponibles</div>
          <div style="font-size:20px;font-weight:700;font-family:var(--mono);color:${a.color}">${a.hrsDisp}h</div>
          <div style="font-size:10px;color:var(--text3)">${a.nActivos} empleados (${a.nConVac} de vaca)</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">${a.esDeficit?'Déficit':'Exceso'}</div>
          <div style="font-size:20px;font-weight:700;font-family:var(--mono);color:${a.color}">${Math.abs(a.deficit)}h</div>
          <div style="font-size:10px;color:var(--text3)">${a.pct}% ${a.esDeficit?'por debajo':'por encima'}</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">Coste laboral est.</div>
          <div style="font-size:18px;font-weight:700;font-family:var(--mono);color:var(--text)">${eur(a.costeActual)}</div>
          <div style="font-size:10px;color:var(--text3)">Necesario: ${eur(a.costeNecesario)}</div>
        </div>
      </div>
      <!-- Barra de cobertura -->
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
          <span>Cobertura de horas</span><span style="color:${a.color};font-weight:600">${pctBar}%</span>
        </div>
        <div style="background:var(--bg3);border-radius:6px;height:8px;position:relative">
          <div style="width:${Math.min(100,pctBar)}%;background:${a.color};height:8px;border-radius:6px;transition:width .5s"></div>
          <div style="position:absolute;left:92%;top:-4px;width:2px;height:16px;background:var(--green);border-radius:1px" title="Óptimo (100%)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:3px">
          <span>0%</span><span style="color:var(--green)">Óptimo</span><span>Exceso</span>
        </div>
      </div>
      <!-- Propuestas -->
      ${a.propuestas.length?`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--text3);margin-bottom:8px">Propuestas de acción</div>${propCards}`:'<div style="color:var(--green);font-size:13px"><i class="fa fa-circle-check"></i> Plantilla equilibrada para este mes. No se requieren ajustes.</div>'}
    </div>
  </div>`;
}

// ─── CONFIGURACIÓN DEL PLANIFICADOR ───
function getPlanConfig(){
  if(!DB.planConfig) DB.planConfig={
    rules:{1:{c:4,n:4,p:2},2:{c:4,n:4,p:2},3:{c:5,n:8,p:5},4:{c:5,n:8,p:5},5:{c:4,n:6,p:4},6:{c:5,n:9,p:5},0:{c:6,n:7,p:6}},
    shifts:{comida:{start:'10:00',end:'18:30'},cena:{start:'19:00',end:'01:30'},partido1:{start:'12:00',end:'16:00'},partido2:{start:'20:00',end:'00:30'}},
    noCoincide:[[1,2]], encargados:[1,2], assignRules:[]
  };
  if(!DB.planConfig.assignRules) DB.planConfig.assignRules=[];
  return DB.planConfig;
}