// ─── DASHBOARD ──────────────────────────────────────────────

function pgDashboard(){
  const t=today(),sal=salesOn(t)||estSales(t),jd=WEEKLY_LABOR[t];
  const lab=jd?jd.cost:laborOn(t),mmp=Math.round(sal*RATIO_MMPP);
  const fd=dynFixedDay();
  const ebt=Math.round(sal-mmp-lab-fd),lp=sal>0?Math.round(lab/sal*1000)/10:0;
  const w7=[]; for(let i=6;i>=0;i--){const d=new Date(t);d.setDate(d.getDate()-i);const ds=d.toISOString().split('T')[0];w7.push(salesOn(ds)||estSales(ds));}
  return`<div class="page-header"><div><h2>Dashboard</h2><p>${dayN(t)}, ${t}</p></div><div class="page-actions"><button class="btn btn-primary btn-sm" onclick="go('shifts')"><i class="fa fa-plus"></i> Turno</button></div></div>
  <div class="page-body">
    <div class="kpi-grid" style="grid-template-columns:repeat(6,1fr)">
      <div class="kpi-card green"><div class="kpi-label">Ventas hoy</div><div class="kpi-value" style="font-size:20px;color:var(--green)">${eur(Math.round(sal))}</div></div>
      <div class="kpi-card"><div class="kpi-label">MMPP ${Math.round(RATIO_MMPP*100)}%</div><div class="kpi-value" style="font-size:20px;color:var(--teal)">-${eur(mmp)}</div></div>
      <div class="kpi-card ${lp<=30?'green':'red'}"><div class="kpi-label">Personal</div><div class="kpi-value" style="font-size:20px;color:var(--${lp<=30?'green':'red'})">-${eur(Math.round(lab))}</div><div class="kpi-sub">${lp}%</div></div>
      <div class="kpi-card"><div class="kpi-label">Fijos/día</div><div class="kpi-value" style="font-size:20px">-${eur(fd)}</div></div>
      <div class="kpi-card ${ebt>0?'green':'red'}"><div class="kpi-label">EBITDA</div><div class="kpi-value" style="font-size:20px;color:var(--${ebt>0?'green':'red'})">${ebt>0?'+':''}${eur(ebt)}</div></div>
      <div class="kpi-card accent"><div class="kpi-label">Ventas 7 días</div><div class="kpi-value" style="font-size:20px">${eur(Math.round(w7.reduce((a,x)=>a+x,0)))}</div></div>
    </div>
    <div class="grid-2 section-gap" style="margin-top:16px">
      <div class="card"><div class="card-header"><span class="card-title">Ventas últimos 7 días</span></div><div class="chart-wrap" style="height:200px"><canvas id="c_dash"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">Patrón horario hoy</span></div><div class="chart-wrap" style="height:200px"><canvas id="c_hrly"></canvas></div></div>
    </div>
    <div class="card section-gap"><div class="card-header"><span class="card-title">Alertas</span><a href="#" onclick="go('alerts')" style="font-size:12px;color:var(--accent)">Ver todas</a></div>
      ${DB.alerts.filter(a=>!a.done).map(a=>`<div class="alert-item ${a.sev}" style="margin-bottom:6px"><i class="fa fa-triangle-exclamation alert-icon"></i><div class="alert-msg">${a.msg}</div></div>`).join('')||'<div style="color:var(--text3);padding:12px">Sin alertas activas</div>'}
    </div>
    <div class="card section-gap"><div class="card-header"><span class="card-title">Plantilla</span><span style="font-size:12px;color:var(--text3)">${DB.employees.filter(e=>e.active&&!e.sick).length} disponibles · ${DB.employees.filter(e=>e.sick>0).length} de baja</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px">
        ${DB.employees.map(e=>`<span class="badge badge-${e.sick>0?'red':e.type==='full'?'blue':'amber'}">${e.name.split(' ')[0]}${e.sick>0?' 🔴':''}</span>`).join('')}
      </div>
    </div>
  </div>`;
}

function afDashboard(){
  const t=today(),labels=[],sv=[];
  for(let i=6;i>=0;i--){const d=new Date(t);d.setDate(d.getDate()-i);const ds=d.toISOString().split('T')[0];labels.push(sDay(ds));sv.push(Math.round(salesOn(ds)||estSales(ds)));}
  const e1=$('c_dash');
  if(e1)new Chart(e1,{type:'bar',data:{labels,datasets:[{data:sv,backgroundColor:'rgba(79,124,255,0.5)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a'}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a',callback:v=>'€'+v}}}}});
  const d=dk(t),hrs=Object.keys(HOURLY).map(Number).sort((a,b)=>a-b);
  const e2=$('c_hrly');
  if(e2)new Chart(e2,{type:'line',data:{labels:hrs.map(h=>h+':00'),datasets:[{data:hrs.map(h=>(HOURLY[h]||{})[d]||0),borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.08)',fill:true,tension:0.4,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a',callback:v=>'€'+v}}}}});
}

function recalcularTodo(){
  // 1. Limpiar alertas automáticas (se regeneran a continuación)
  DB.alerts = DB.alerts.filter(a=>a.done || (!a._sk));

  // 2. Recalcular factores de tendencia desde salesHistory actual
  recalcTrendFactors();

  // 3. Regenerar alertas
  checkStockAlarm();
  checkStaffingAlarm();
  checkForecastAlarm();

  // 4. Guardar
  save();
  updateBadge();
  flash('✓ Todo recalculado');
  go(Object.keys(PAGES)[0]==='dashboard'?'dashboard':'dashboard');
}

function checkStockAlarm(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const key=`stock_real_${y}_${String(m).padStart(2,'0')}`;
  const done=DB.stockSnapshots.some(s=>s.month===key);
  if(!done){
    const exists=DB.alerts.some(a=>a._sk===key&&!a.done);
    if(!exists){
      DB.alerts.push({id:maxId(DB.alerts),sev:'warning',msg:`📦 Stock: es el momento de introducir el inventario real de ${now.toLocaleString('es-ES',{month:'long',year:'numeric'})}`,done:false,_sk:key});
      save();updateBadge();
    }
  }
}

function checkStaffingAlarm(){
  const OBJ_MIN=25, OBJ_MAX=35, COSTE_HR=12;
  const cfg=getPlanConfig();
  const now=new Date();

  [0,1].forEach(offset=>{
    const d=new Date(now.getFullYear(), now.getMonth()+offset+1, 0);
    const y=d.getFullYear(), m=d.getMonth()+1;
    const mStr=`${y}-${String(m).padStart(2,'0')}`;
    const mLabel=d.toLocaleString('es-ES',{month:'long',year:'numeric'});
    const key=`staff_${mStr}`;
    if(DB.alerts.some(a=>a._sk===key&&!a.done))return;

    const days=new Date(y,m,0).getDate();
    let hrsTotales=0;
    for(let day=1;day<=days;day++){
      const dow=new Date(`${mStr}-${String(day).padStart(2,'0')}`).getDay();
      const rule=cfg.rules[dow], sh=cfg.shifts;
      hrsTotales+=rule.p*(hrsOf(sh.partido1.start,sh.partido1.end)+hrsOf(sh.partido2.start,sh.partido2.end));
      hrsTotales+=Math.max(0,rule.c-rule.p)*hrsOf(sh.comida.start,sh.comida.end);
      hrsTotales+=Math.max(0,rule.n-rule.p)*hrsOf(sh.cena.start,sh.cena.end);
    }

    const activos=DB.employees.filter(e=>e.active&&e.sick===0);
    const hrsDisponibles=activos.reduce((a,e)=>a+(e.wh*4.33),0);
    const vacHrs=DB.vacations.filter(v=>v.start.startsWith(mStr)||v.end.startsWith(mStr)||(v.start<mStr&&v.end>mStr+'-31'))
      .reduce((a,v)=>{
        const e=DB.employees.find(x=>x.id===v.employee_id); if(!e)return a;
        let cur=new Date(Math.max(new Date(v.start),new Date(`${mStr}-01`)));
        const end=new Date(Math.min(new Date(v.end),new Date(y,m,0)));
        let ds=0; while(cur<=end){ds++;cur.setDate(cur.getDate()+1);}
        return a+(e.wh/5)*ds;
      },0);
    const hrsEfectivas=hrsDisponibles-vacHrs;
    const deficit=hrsTotales-hrsEfectivas;
    const pctDesvio=hrsTotales>0?Math.round(Math.abs(deficit)/hrsTotales*100):0;
    if(pctDesvio<10)return;

    const esDeficit=deficit>0;
    const hrsExtra=Math.abs(Math.round(deficit));
    const nPersonas40=Math.ceil(hrsExtra/(40*4.33));
    const nPersonas20=Math.ceil(hrsExtra/(20*4.33));
    const costeExtra=Math.round(hrsExtra*COSTE_HR);
    const ventasEst=Array.from({length:days},(_,i)=>{
      const ds=`${mStr}-${String(i+1).padStart(2,'0')}`;
      return salesOn(ds)||estSales(ds)||0;
    }).reduce((a,b)=>a+b,0);
    const ratioLaboral=ventasEst>0?Math.round(hrsTotales*COSTE_HR/ventasEst*100):0;

    let msg, sev, soluciones;
    if(esDeficit){
      sev='warning';
      msg=`Plantilla insuficiente en ${mLabel}: faltan ~${hrsExtra}h (${pctDesvio}% del total necesario)`;
      soluciones=[
        `Horas extra: distribuir ${hrsExtra}h entre los ${activos.length} empleados activos (~${Math.ceil(hrsExtra/activos.length)}h/persona)`,
        `Contratar refuerzo: ${nPersonas20} persona${nPersonas20>1?'s':''} a 20h/mes — coste estimado ${eur(costeExtra)}`,
        `Revisar vacaciones: si hay empleados de vacaciones en ${mLabel}, valorar retrasar o fraccionar`,
        `Ajustar reglas en Config. turnos para reducir personal mínimo si la demanda lo permite`,
      ];
    } else {
      sev='info';
      msg=`Plantilla sobredimensionada en ${mLabel}: sobran ~${hrsExtra}h (${pctDesvio}% sobre lo necesario)`;
      soluciones=[
        `Adelantar vacaciones: es buen momento para que el equipo gaste días en ${mLabel}`,
        `Reducir turnos opcionales o cerrar antes en días de baja afluencia`,
        ratioLaboral>0&&ratioLaboral<OBJ_MIN?`Ratio laboral muy bajo (${ratioLaboral}%) — valorar ampliar horario de apertura para aumentar ventas`:`Revisar Config. turnos si el personal mínimo por día está sobredimensionado`,
        `A medio plazo: valorar no renovar ${nPersonas20} contrato${nPersonas20>1?'s':''} de 20h al vencer`,
      ].filter(Boolean);
    }

    DB.alerts.push({id:maxId(DB.alerts),sev,msg,soluciones,mStr,done:false,_sk:key,ts:now.toLocaleDateString('es-ES')});
  });

  save(); updateBadge();
}

function checkForecastAlarm(){
  const t=today();
  const now=new Date(t);
  const nextM=new Date(now.getFullYear(), now.getMonth()+1, 1);
  const mStr=`${nextM.getFullYear()}-${String(nextM.getMonth()+1).padStart(2,'0')}`;
  const key=`forecast_${mStr}`;
  if(DB.alerts.some(a=>a._sk===key&&!a.done))return;

  // Calcular previsión mes siguiente
  const days=new Date(nextM.getFullYear(),nextM.getMonth()+1,0).getDate();
  let totalPrev=0;
  for(let d=1;d<=days;d++){
    const ds=`${mStr}-${String(d).padStart(2,'0')}`;
    totalPrev+=estSales(ds);
  }

  // Comparar con mes anterior
  const prevM=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const prevTotal=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(prevM)).reduce((a,s)=>a+(s.amount||0),0);
  const pct=prevTotal>0?Math.round((totalPrev/prevTotal-1)*100):null;

  const mLabel=nextM.toLocaleString('es-ES',{month:'long',year:'numeric'});
  let msg=`📈 Previsión ${mLabel}: ~${eur(totalPrev)}`;
  if(pct!==null) msg+=` (${pct>=0?'+':''}${pct}% vs mes anterior)`;

  const soluciones=pct!==null&&pct<-15?[
    `Las ventas previstas caen un ${Math.abs(pct)}% — revisar el cuadrante para ajustar personal a la baja`,
    `Considerar adelantar vacaciones de empleados en este período`,
    `Ver análisis detallado en Plantilla óptima`,
  ]:pct!==null&&pct>15?[
    `Las ventas previstas suben un ${pct}% — verificar que la plantilla es suficiente`,
    `Revisar si hay suficientes empleados disponibles (sin vacaciones) para los turnos fuertes`,
  ]:[`Previsión estable — revisar cuadrante en Plantilla óptima`];

  DB.alerts.push({
    id:maxId(DB.alerts),
    sev: pct!==null&&Math.abs(pct)>15?'warning':'info',
    msg, soluciones, mStr, done:false, _sk:key,
    ts:now.toLocaleDateString('es-ES')
  });
  save(); updateBadge();
}