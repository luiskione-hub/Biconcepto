// ─── INFORMES Y JIBBLE ──────────────────────────────────────

function pgReports(){
  return`<div class="page-header"><div><h2>Informes</h2></div></div>
  <div class="page-body"><div class="grid-3">
    ${[['fa-circle-dollar-to-slot','Beneficio diario','Rentabilidad día a día','profit'],['fa-file-invoice-dollar','Cuenta de resultados','P&G ene-abr 2026','results'],['fa-chart-bar','Ventas históricas','Análisis ventas','sales'],['fa-user-clock','Plan. vs Real','Jibble vs cuadrante','jibble'],['fa-chart-mixed','Previsión ventas','Próximos 7 días','forecast'],['fa-users-gear','Empleados','Gestión plantilla','employees'],['fa-boxes-stacking','Stocks','Inventario y pedidos','stocks'],['fa-cart-plus','Pedido sugerido','Recomendación Logirest','stockOrder'],['fa-sliders','Costes fijos','Gestión costes','costs']].map(([ic,t,d,pg])=>`<div class="card" style="cursor:pointer" onclick="go('${pg}')"><div style="display:flex;align-items:flex-start;gap:14px"><div style="width:40px;height:40px;border-radius:10px;background:rgba(79,124,255,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa ${ic}" style="color:var(--accent);font-size:18px"></i></div><div><div style="font-weight:500;margin-bottom:4px">${t}</div><div style="font-size:12px;color:var(--text3)">${d}</div></div></div></div>`).join('')}
  </div></div>`;
}

function pgJibble(){
  const jd=DB.jibbleData||[];
  if(!jd.length)return`<div class="page-header"><div><h2>Planificado vs Real</h2></div></div><div class="page-body"><div class="empty-state"><i class="fa fa-clock"></i><p>Sin fichadas importadas.</p><button class="btn btn-primary" style="margin-top:12px" onclick="go('importer')">Importar Jibble</button></div></div>`;
  const comps=jd.map(j=>{
    const appN=jName(j.emp);
    const planned=DB.shifts.find(s=>{const e=DB.employees.find(x=>x.id===s.employee_id);return e&&(e.name===appN||e.name.toLowerCase().startsWith(appN.toLowerCase().split(' ')[0].toLowerCase()))&&s.date===j.date;});
    let pH=0;if(planned){const sh=parseInt(planned.start),eh=parseInt(planned.end);pH=eh>sh?eh-sh:24-sh+eh;}
    const dev=parseFloat((j.total_hrs-pH).toFixed(2));
    return{...j,appN,pH,dev,status:!planned?'sp':Math.abs(dev)<=.5?'ok':dev>0?'ex':'mn'};
  });
  const ok=comps.filter(c=>c.status==='ok').length,ex=comps.filter(c=>c.status==='ex').length;
  const mn=comps.filter(c=>c.status==='mn').length,sp=comps.filter(c=>c.status==='sp').length;
  const byE={};comps.forEach(c=>{if(!byE[c.appN])byE[c.appN]={n:c.appN,r:0,p:0,d:0,ex:0,mn:0};byE[c.appN].r+=c.total_hrs;byE[c.appN].p+=c.pH;byE[c.appN].d+=c.dev;if(c.status==='ex')byE[c.appN].ex++;if(c.status==='mn')byE[c.appN].mn++;});
  const es=Object.values(byE).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
  const last30s=new Date(today());last30s.setDate(last30s.getDate()-30);
  const l30=comps.filter(c=>c.date>=last30s.toISOString().split('T')[0]).slice().reverse().slice(0,50);
  return`<div class="page-header"><div><h2>Planificado vs Real — Jibble</h2><p>${jd.length} fichadas</p></div><div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="go('importer')"><i class="fa fa-file-import"></i> Actualizar</button></div></div>
  <div class="page-body">
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card green"><div class="kpi-label">OK (≤0.5h)</div><div class="kpi-value" style="font-size:20px;color:var(--green)">${ok}</div><div class="kpi-sub">${comps.length>0?Math.round(ok/comps.length*100):0}%</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Horas extra</div><div class="kpi-value" style="font-size:20px;color:var(--amber)">${ex}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Horas menos</div><div class="kpi-value" style="font-size:20px;color:var(--red)">${mn}</div></div>
      <div class="kpi-card"><div class="kpi-label">Sin planificar</div><div class="kpi-value" style="font-size:20px">${sp}</div></div>
    </div>
    <div class="grid-2 section-gap" style="margin-top:16px">
      <div class="card"><div class="card-header"><span class="card-title">Por empleado</span></div><div class="table-wrap"><table><thead><tr><th>Empleado</th><th>H.plan.</th><th>H.real</th><th>Desv.</th><th>Extra</th><th>Menos</th></tr></thead>
        <tbody>${es.map(e=>`<tr><td class="td-bold">${e.n.split(' ')[0]}</td><td class="td-mono">${e.p.toFixed(0)}h</td><td class="td-mono">${e.r.toFixed(1)}h</td><td class="td-mono" style="color:var(--${Math.abs(e.d)<5?'green':e.d>0?'amber':'red'})">${e.d>0?'+':''}${e.d.toFixed(1)}h</td><td>${e.ex>0?`<span class="badge badge-amber">${e.ex}d</span>`:'—'}</td><td>${e.mn>0?`<span class="badge badge-red">${e.mn}d</span>`:'—'}</td></tr>`).join('')}</tbody>
      </table></div></div>
      <div class="card"><div class="card-header"><span class="card-title">Comparativa horas</span></div><div class="chart-wrap" style="height:280px"><canvas id="c_jibble"></canvas></div></div>
    </div>
    <div class="card section-gap"><div class="card-header"><span class="card-title">Últimos 30 días</span></div>
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Empleado</th><th>Plan.</th><th>Real</th><th>Entrada</th><th>Salida</th><th>Desv.</th><th>Estado</th></tr></thead>
        <tbody>${l30.map(c=>`<tr><td style="font-size:12px;color:var(--text3)">${c.date}</td><td class="td-bold">${c.appN.split(' ')[0]}</td><td class="td-mono">${c.pH?c.pH+'h':'—'}</td><td class="td-mono">${c.total_hrs}h</td><td class="td-mono" style="color:var(--teal)">${c.first_in||'—'}</td><td class="td-mono" style="color:var(--teal)">${c.last_out||'—'}</td><td class="td-mono" style="color:var(--${c.status==='ok'?'green':c.status==='ex'?'amber':'red'})">${c.dev!==0?(c.dev>0?'+':'')+c.dev+'h':'±0'}</td><td>${c.status==='ok'?'<span class="badge badge-green">✓</span>':c.status==='ex'?'<span class="badge badge-amber">Extra</span>':c.status==='mn'?'<span class="badge badge-red">Menos</span>':'<span class="badge badge-gray">Sin turno</span>'}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>
  </div>`;
}

function afJibble(){
  const el=$('c_jibble');if(!el)return;
  const byE={};DB.jibbleData.forEach(j=>{const n=jName(j.emp);if(!byE[n])byE[n]={p:0,r:0};byE[n].r+=j.total_hrs;});
  DB.shifts.forEach(s=>{const e=DB.employees.find(x=>x.id===s.employee_id);if(!e)return;const n=e.name.split(' ')[0];const sh=parseInt(s.start),eh=parseInt(s.end);if(!byE[n])byE[n]={p:0,r:0};byE[n].p+=eh>sh?eh-sh:24-sh+eh;});
  const names=Object.keys(byE).sort();
  new Chart(el,{type:'bar',data:{labels:names,datasets:[{label:'Planificadas',data:names.map(n=>Math.round(byE[n].p)),backgroundColor:'rgba(79,124,255,0.5)',borderRadius:3},{label:'Reales',data:names.map(n=>Math.round(byE[n].r)),backgroundColor:'rgba(34,197,94,0.5)',borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#8b90a8',font:{size:10},boxWidth:8}}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a',font:{size:9}}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#565c7a',callback:v=>v+'h'}}}}});
}

function pgAlerts(){
  const open=DB.alerts.filter(a=>!a.done),done=DB.alerts.filter(a=>a.done);
  return`<div class="page-header"><div><h2>Alertas</h2><p>${open.length} activas</p></div><div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="DB.alerts.forEach(a=>a.done=true);save();updateBadge();go('alerts')">Resolver todas</button></div></div>
  <div class="page-body">
    ${open.map(a=>`<div class="alert-item ${a.sev}" style="margin-bottom:8px">
      <i class="fa fa-${a.sev==='warning'?'triangle-exclamation':'circle-info'} alert-icon"></i>
      <div style="flex:1">
        <div class="alert-msg">${a.msg}</div>
        ${a.soluciones&&a.soluciones.length?`
        <div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:8px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;opacity:.7;margin-bottom:4px">Posibles acciones:</div>
          ${a.soluciones.map((s,i)=>`<div style="display:flex;gap:6px;font-size:12px;margin-bottom:3px;opacity:.9">
            <span style="opacity:.5">${i+1}.</span><span>${s}</span>
          </div>`).join('')}
          ${a.mStr?`<a href="#" onclick="go('optimalStaff');_store.setItem('opt_m','${parseInt(a.mStr.split('-')[1])}');_store.setItem('opt_y','${a.mStr.split('-')[0]}');closeModal&&closeModal()" style="font-size:11px;color:inherit;opacity:.7;margin-top:6px;display:inline-block">→ Ver análisis completo en Plantilla óptima</a>`:''}
        </div>`:``}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="DB.alerts.find(x=>x.id===${a.id}).done=true;save();updateBadge();go('alerts')">Resolver</button>
    </div>`).join('')||'<div class="empty-state"><i class="fa fa-circle-check"></i><p>Sin alertas activas</p></div>'}
    ${done.length?`<div style="margin-top:20px;color:var(--text3);font-size:12px;margin-bottom:8px">RESUELTAS</div>${done.map(a=>`<div class="alert-item info" style="margin-bottom:6px;opacity:.5"><i class="fa fa-check-circle alert-icon"></i><div class="alert-msg">${a.msg}</div></div>`).join('')}`:''}
  </div>`;
}