// ─── VENTAS Y PREVISIÓN ─────────────────────────────────────

function pgSales(){
  const t=today();
  const days=[];
  for(let i=29;i>=0;i--){const d=new Date(t);d.setDate(d.getDate()-i);const ds=d.toISOString().split('T')[0];const real=salesOn(ds);days.push({ds,s:real||estSales(ds),real:real>0});}
  const realDays=days.filter(x=>x.real),estDays=days.filter(x=>!x.real);
  const totalReal=realDays.reduce((a,x)=>a+x.s,0);
  const avg=days.reduce((a,x)=>a+x.s,0)/30;
  const maxS=Math.max(...days.map(x=>x.s));
  const bars=days.map(d=>{
    const h=Math.round(d.s/maxS*80);
    return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="width:100%;background:var(--bg3);border-radius:3px 3px 0 0;height:80px;display:flex;align-items:flex-end">
        <div style="width:100%;height:${h}px;background:${d.real?'var(--green)':'rgba(79,124,255,0.4)'};border-radius:3px 3px 0 0"></div>
      </div>
      <div style="font-size:8px;color:var(--text3);writing-mode:vertical-rl;transform:rotate(180deg);height:28px">${d.ds.slice(5)}</div>
    </div>`;
  }).join('');
  return`<div class="page-header"><div><h2>Ventas</h2><p>Últimos 30 días</p></div></div>
  <div class="page-body">
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card"><div class="kpi-label">Total real (30d)</div><div class="kpi-val">${eur(totalReal)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Media diaria</div><div class="kpi-val">${eur(Math.round(avg))}</div></div>
      <div class="kpi-card"><div class="kpi-label">Días con datos</div><div class="kpi-val">${realDays.length}</div><div class="kpi-sub">de 30</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">Ventas diarias</span>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text3)">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></span> Real</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:rgba(79,124,255,0.4);border-radius:2px"></span> Estimado</span>
        </div>
      </div>
      <div style="padding:16px;display:flex;gap:2px;align-items:flex-end">${bars}</div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-header"><span class="card-title">Detalle por día</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Día</th><th>Ventas</th><th>Tipo</th></tr></thead>
      <tbody>${days.slice().reverse().map(d=>`<tr>
        <td class="td-mono">${d.ds}</td>
        <td>${dayN(d.ds)}</td>
        <td class="td-mono" style="color:${d.real?'var(--green)':'var(--teal)'}">${eur(Math.round(d.s))}</td>
        <td><span class="badge badge-${d.real?'green':'gray'}">${d.real?'Real':'Estimado'}</span></td>
      </tr>`).join('')}</tbody>
    </table></div></div>
  </div>`;
}

function afSales(){ /* charts rendered inline */ }

function pgForecast(){
  const t=today();
  const now=new Date(t);
  const curY=now.getFullYear(), curM=now.getMonth()+1;

  // Vista semana actual
  const weekDays=[];
  for(let i=0;i<7;i++){
    const d=new Date(now); d.setDate(d.getDate()-now.getDay()+1+i); // lun-dom
    const ds=d.toISOString().slice(0,10);
    const real=salesOn(ds);
    const prev=estSales(ds);
    weekDays.push({ds,real,prev,label:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i]});
  }
  const wPrev=weekDays.reduce((a,d)=>a+d.prev,0);
  const wReal=weekDays.filter(d=>d.real>0).reduce((a,d)=>a+d.real,0);

  // Vista mensual — todos los meses 2026
  const months=[];
  for(let m=1;m<=12;m++){
    const mStr=`${curY}-${String(m).padStart(2,'0')}`;
    const days=new Date(curY,m,0).getDate();
    let totalPrev=0,totalReal=0,diasReal=0;
    for(let d=1;d<=days;d++){
      const ds=`${mStr}-${String(d).padStart(2,'0')}`;
      const real=salesOn(ds);
      const prev=real>0?real:estSales(ds);
      if(real>0){totalReal+=real;diasReal++;}
      totalPrev+=prev;
    }
    const pct2025=(()=>{
      const mStr25=`${curY-1}-${String(m).padStart(2,'0')}`;
      const v25=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(mStr25)).reduce((a,s)=>a+(s.amount||0),0);
      return v25>0?Math.round((totalPrev/v25-1)*100):null;
    })();
    // Desviación previsión vs real (para meses con datos reales)
    const prevSoloFuturo=diasReal<days?(()=>{
      let p=0;
      for(let d=1;d<=days;d++){
        const ds=`${mStr}-${String(d).padStart(2,'0')}`;
        p+=estSales(ds);
      }
      return p;
    })():totalPrev;
    const pctDevReal=totalReal>0&&prevSoloFuturo>0?Math.round((totalReal/prevSoloFuturo-1)*100):null;
    const esFuturo=mStr>t.slice(0,7);
    const esCurrent=mStr===t.slice(0,7);
    months.push({m,mStr,label:new Date(curY,m-1,1).toLocaleString('es-ES',{month:'long'}),
      totalPrev:prevSoloFuturo,totalReal,diasReal,pct2025,pctDevReal,esFuturo,esCurrent,dias:days});
  }

  // Factores tendencia
  const factors=typeof TREND_FACTORS!=='undefined'?TREND_FACTORS:null;
  const dowNames={0:'Dom',1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb'};

  const monthRows=months.map(mo=>{
    const badge=mo.pct2025!==null
      ?`<span class="badge badge-${mo.pct2025>=0?'green':'red'}">${mo.pct2025>=0?'+':''}${mo.pct2025}% vs 2025</span>`:'';
    const barW=Math.min(100,mo.totalPrev/100000*100);
    const barColor=mo.esCurrent?'var(--accent)':mo.esFuturo?'var(--teal)':'var(--text3)';
    const estado=mo.esCurrent?'Mes actual':mo.esFuturo?'Previsión':mo.diasReal===mo.dias?'Completo':`${mo.diasReal}/${mo.dias} días`;
    // Desviación real vs previsto
    const devBadge=mo.pctDevReal!==null&&!mo.esFuturo
      ?`<span class="badge badge-${Math.abs(mo.pctDevReal)<=5?'green':mo.pctDevReal>0?'green':'red'}" title="Real vs previsión">Real ${mo.pctDevReal>=0?'+':''}${mo.pctDevReal}%</span>`:'';
    return`<tr style="${mo.esCurrent?'background:var(--bg3)':''}">
      <td style="font-weight:${mo.esCurrent?'700':'400'}">${mo.label}</td>
      <td class="td-mono" style="color:var(--teal)">
        ${mo.esFuturo||!mo.totalReal?`~${eur(mo.totalPrev)}`:eur(mo.totalPrev)}
      </td>
      <td class="td-mono" style="color:${mo.totalReal>0?'var(--green)':'var(--text3)'}">
        ${mo.totalReal>0?eur(mo.totalReal):mo.esFuturo?'—':'Sin datos'}
      </td>
      <td class="td-mono" style="font-size:11px;color:var(--text3)">${mo.totalReal>0?eur(Math.round(mo.totalReal/mo.diasReal))+'/d':mo.esFuturo?eur(Math.round(mo.totalPrev/mo.dias))+'/d':'—'}</td>
      <td style="min-width:80px">
        <div style="background:var(--bg3);border-radius:3px;height:5px">
          <div style="width:${barW}%;background:${barColor};height:5px;border-radius:3px"></div>
          ${mo.totalReal>0&&!mo.esFuturo?`<div style="width:${Math.min(100,mo.totalReal/100000*100)}%;background:var(--green);height:5px;border-radius:3px;margin-top:2px"></div>`:''}
        </div>
      </td>
      <td>${badge} ${devBadge}</td>
      <td style="font-size:11px;color:var(--text3)">${estado}</td>
    </tr>`;
  }).join('');

  const weekBars=weekDays.map(d=>{
    const max=Math.max(...weekDays.map(x=>x.prev));
    const h=Math.round(d.prev/max*60);
    const hasReal=d.real>0;
    return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="font-family:var(--mono);font-size:10px;color:${hasReal?'var(--green)':'var(--teal)'}">${eur(hasReal?d.real:d.prev)}</div>
      <div style="width:100%;background:var(--bg3);border-radius:4px;height:60px;display:flex;align-items:flex-end;overflow:hidden">
        <div style="width:100%;height:${h}px;background:${hasReal?'var(--green)':'rgba(79,124,255,0.5)'};border-radius:4px 4px 0 0;transition:height .3s"></div>
      </div>
      <div style="font-size:11px;font-weight:600;color:${d.ds===t?'var(--accent)':'var(--text2)'}">${d.label}</div>
      <div style="font-size:9px;color:var(--text3)">${d.ds.slice(5)}</div>
    </div>`;
  }).join('');

  return`<div class="page-header">
    <div><h2><i class="fa fa-chart-mixed"></i> Previsión de ventas</h2>
    <p>Basada en histórico real 2025-2026 · Factor tendencia: ${factors?`${((factors.global-1)*100).toFixed(1)}% vs año anterior`:'calculando...'}</p></div>
  </div>
  <div class="page-body" style="display:flex;flex-direction:column;gap:16px">

    <!-- KPIs semana -->
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card"><div class="kpi-label">Previsión semana actual</div><div class="kpi-val">${eur(wPrev)}</div><div class="kpi-sub">~${eur(Math.round(wPrev/7))}/día</div></div>
      <div class="kpi-card"><div class="kpi-label">Real acumulado semana</div><div class="kpi-val" style="color:var(--green)">${eur(wReal)}</div><div class="kpi-sub">${weekDays.filter(d=>d.real>0).length} días con datos</div></div>
      <div class="kpi-card"><div class="kpi-label">Previsión mes actual</div><div class="kpi-val" style="color:var(--teal)">${eur(months.find(m=>m.esCurrent)?.totalPrev||0)}</div><div class="kpi-sub">${months.find(m=>m.esCurrent)?.label}</div></div>
    </div>

    <!-- Semana en barras -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Semana actual — día a día</span>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text3)">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></span> Real</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:rgba(79,124,255,0.5);border-radius:2px"></span> Previsto</span>
        </div>
      </div>
      <div style="padding:16px;display:flex;gap:8px">${weekBars}</div>
    </div>

    <!-- Tabla mensual -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Previsión mensual ${curY}</span>
        <span style="font-size:11px;color:var(--text3)">Verde = datos reales · Turquesa = previsión</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Mes</th><th style="color:var(--teal)">Previsión</th><th style="color:var(--green)">Real</th><th>Media/día</th><th>Volumen</th><th>Comparativa</th><th>Estado</th></tr></thead>
        <tbody>${monthRows}</tbody>
        <tfoot><tr style="font-weight:700;background:var(--bg3)">
          <td>TOTAL ANUAL</td>
          <td class="td-mono">~${eur(months.reduce((a,m)=>a+(m.totalReal||m.totalPrev),0))}</td>
          <td colspan="4"></td>
        </tr></tfoot>
      </table></div>
    </div>

    <!-- Metodología -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-circle-info"></i> Cómo se calcula la previsión</span></div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div style="font-size:12px;color:var(--text2)">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text)">📊 Modelo</div>
          Ventas mismo día año anterior × factor de tendencia por día de semana
        </div>
        <div style="font-size:12px;color:var(--text2)">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text)">📅 Base de datos</div>
          386 días reales (mayo 2025 → mayo 2026) + previsiones calculadas para junio-dic 2026
        </div>
        <div style="font-size:12px;color:var(--text2)">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text)">📉 Tendencia actual</div>
          ${factors?Object.entries(factors.byDow).map(([d,f])=>`${dowNames[d]}: ${((f-1)*100).toFixed(0)}%`).join(' · '):'Calculando...'}
        </div>
        <div style="font-size:12px;color:var(--text2)">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text)">⚠️ Limitaciones</div>
          No incluye festivos locales de Ceuta ni eventos puntuales. Importa datos mensuales para mejorar la precisión.
        </div>
      </div>
    </div>

  </div>`;
}

function afForecast(){
  // No necesita canvas — las barras son SVG inline
}