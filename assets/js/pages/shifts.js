// ─── TURNOS Y CUADRANTE ─────────────────────────────────────

function pgShifts(){
  return`<div class="page-header"><div><h2>Turnos</h2><p>${DB.shifts.length} registrados</p></div><div class="page-actions"><button class="btn btn-primary" onclick="shiftMdl()"><i class="fa fa-plus"></i> Nuevo turno</button></div></div>
  <div class="page-body"><div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Empleado</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Coste</th><th></th></tr></thead>
    <tbody>${DB.shifts.length?DB.shifts.slice().reverse().slice(0,60).map(s=>{const e=DB.employees.find(x=>x.id===s.employee_id);return`<tr><td class="td-bold">${e?e.name.split(' ')[0]:'?'}</td><td>${sDay(s.date)} ${s.date}</td><td class="td-mono">${s.start}</td><td class="td-mono">${s.end}</td><td class="td-mono">${eur(s.cost)}</td><td><button class="btn btn-danger btn-sm btn-icon" onclick="DB.shifts=DB.shifts.filter(x=>x.id!==${s.id});save();go('shifts')"><i class="fa fa-trash"></i></button></td></tr>`;}).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--text3)">Sin turnos</td></tr>'}</tbody>
  </table></div></div></div>`;
}

function pgSchedule(){
  const t=today(),now=new Date(t);
  const y=parseInt(_store.getItem('cal_y')||now.getFullYear());
  const m=parseInt(_store.getItem('cal_m')||now.getMonth()+1);
  const first=new Date(y,m-1,1),last=new Date(y,m,0);
  const mStr=`${y}-${String(m).padStart(2,'0')}`;
  const mS=DB.shifts.filter(s=>s.date.startsWith(mStr));
  const startDow=(first.getDay()+6)%7;
  const mName=first.toLocaleString('es-ES',{month:'long',year:'numeric'});
  const COLS=['#4f7cff','#22c55e','#f59e0b','#8b5cf6','#14b8a6','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#10b981','#eab308','#a855f7','#0ea5e9','#64748b','#dc2626','#7c3aed'];
  const cm={}; DB.employees.forEach((e,i)=>{cm[e.id]=COLS[i%COLS.length];});
  const cells=[]; for(let i=0;i<startDow;i++)cells.push(null); for(let d=1;d<=last.getDate();d++)cells.push(d);
  const weeks=[]; for(let i=0;i<cells.length;i+=7)weeks.push(cells.slice(i,i+7));

  // KPIs del mes
  const totalCost=mS.reduce((a,s)=>a+(s.cost||0),0);
  const totalHrs=DB.employees.reduce((a,emp)=>{
    const hrs=mS.filter(s=>s.employee_id===emp.id).reduce((b,s)=>b+hrsOf(s.start,s.end),0);
    return a+hrs;
  },0);
  const hasTemplate=DB.employees.some(e=>e.fs&&e.fs.length);

  function rDay(day){
    if(!day)return'<div class="cal-cell cal-empty"></div>';
    const ds=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isT=ds===t;
    const ds2=mS.filter(s=>s.date===ds);
    const cost=ds2.reduce((a,s)=>a+(s.cost||0),0);
    const nPersonas=new Set(ds2.map(s=>s.employee_id)).size;
    const ventas=salesOn(ds);
    const ventasEst=!ventas?Math.round(estSales(ds)):0;
    // Mostrar: nº personas + coste personal (en amarillo) + ventas reales (verde) o estimadas (azul)
    const infoLine=ds2.length>0
      ?`<div style="font-size:9px;color:var(--amber);font-family:var(--mono)">${nPersonas}p · ${eur(cost)}</div>`
      :'';
    const ventasLine=ventas>0
      ?`<div style="font-size:9px;color:var(--green);font-family:var(--mono)">${eur(ventas)}</div>`
      :ventasEst>0
        ?`<div style="font-size:9px;color:var(--accent);font-family:var(--mono)">~${eur(ventasEst)}</div>`
        :'';
    return`<div class="cal-cell${isT?' cal-today':''}" onclick="calClick('${ds}')">
      <div class="cal-day-num${isT?' cal-today-num':''}">${day}</div>
      ${infoLine}${ventasLine}
      <div class="cal-shifts">
        ${ds2.slice(0,4).map(s=>{
          const e=DB.employees.find(x=>x.id===s.employee_id),c=cm[s.employee_id]||'#4f7cff';
          return`<div class="cal-shift-pill" style="background:${c}22;border-left:3px solid ${c};color:${c}">${e?e.name.split(' ')[0]:'?'} ${s.start?s.start.slice(0,5):''}</div>`;
        }).join('')}
        ${ds2.length>4?`<div class="cal-shift-more">+${ds2.length-4} más</div>`:''}
      </div>
    </div>`;
  }

  return`<div class="page-header"><div><h2>Cuadrante — ${mName}</h2><p>${mS.length} turnos · ${eur(Math.round(totalCost))} · ${Math.round(totalHrs)}h</p></div>
    <div class="page-actions">
      <button class="btn btn-secondary btn-sm" onclick="calNav(-1)"><i class="fa fa-arrow-left"></i></button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(0)">Hoy</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(1)"><i class="fa fa-arrow-right"></i></button>
      <button class="btn btn-accent btn-sm" onclick="autoplanMdl()" title="Planificación automática por ventas"><i class="fa fa-wand-magic-sparkles"></i> Autoplanificar</button>
      ${hasTemplate?`<button class="btn btn-secondary btn-sm" onclick="applyTplMdl(${y},${m})" title="Aplicar plantilla de turnos al mes"><i class="fa fa-calendar-days"></i> Plantilla</button>`:''}
      <button class="btn btn-secondary btn-sm" onclick="editTemplateMdl()" title="Editar plantilla semanal"><i class="fa fa-calendar-days"></i> Editar plantilla</button>
      <button class="btn btn-secondary btn-sm" onclick="exportScheduleMdl()"><i class="fa fa-file-export"></i> Exportar</button>
      <button class="btn btn-primary btn-sm" onclick="shiftMdl()"><i class="fa fa-plus"></i> Turno</button>
    </div>
  </div>
  <div class="page-body">
    <!-- Leyenda empleados -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
      ${DB.employees.filter(e=>e.active).map(e=>{const c=cm[e.id]||'#4f7cff';return`<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:12px;background:${c}22;border:1px solid ${c}44;color:${c}">${e.name.split(' ')[0]}${e.sick>0?' 🏥':''}</span>`;}).join('')}
    </div>
    <div class="cal-grid-wrap card" style="padding:0;overflow:hidden">
      <div class="cal-header-row">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-header-cell">${d}</div>`).join('')}</div>
      ${weeks.map(w=>`<div class="cal-week-row">${w.map(d=>rDay(d)).join('')}${w.length<7?Array(7-w.length).fill('<div class="cal-cell cal-empty"></div>').join(''):''}</div>`).join('')}
    </div>
    <div id="calDetail"></div>
  </div>`;
}

function calClick(ds){
  const el=$('calDetail'); if(!el)return;
  const dow=new Date(ds).getDay(); // 0=Dom...6=Sáb (app format)
  const ds2=DB.shifts.filter(s=>s.date===ds);
  const vacas=DB.vacations.filter(v=>v.start<=ds&&v.end>=ds);
  const needs=getStaffNeeds();
  const hasNeeds=Object.keys(needs).length>0;

  // Calcular cobertura real por hora (cuántas personas hay en cada franja)
  function coveredAtHour(h){
    return ds2.filter(s=>{
      const sh=parseInt(s.start);
      const eh=parseInt(s.end)||0;
      if(eh===0||eh<sh){ // turno cruza medianoche
        return h>=sh||h<eh;
      }
      return h>=sh&&h<eh;
    }).length;
  }

  // Horas activas: de 10 a 1 (cierre)
  const HOURS=[10,11,12,13,14,15,16,17,18,19,20,21,22,23,0];

  // Construir tabla de cobertura
  const coverageRows=hasNeeds?HOURS.map(h=>{
    const need=parseInt(needs[String(h)]?.[String(dow)]||0);
    const covered=coveredAtHour(h);
    const diff=covered-need;
    const pctBar=need>0?Math.min(100,Math.round(covered/need*100)):covered>0?100:0;
    const barColor=diff<0?'var(--red)':diff===0?'var(--green)':'var(--amber)';
    const label=h===0?'00:00–01:00':`${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00`;
    return`<tr style="${diff<0?'background:rgba(239,68,68,.05)':''}">
      <td style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:3px 8px;white-space:nowrap">${label}</td>
      <td style="text-align:center;font-weight:600;font-size:12px;padding:3px 6px">${need}</td>
      <td style="text-align:center;font-size:12px;padding:3px 6px;color:${barColor};font-weight:600">${covered}</td>
      <td style="padding:3px 8px;min-width:80px">
        <div style="display:flex;align-items:center;gap:4px">
          <div style="flex:1;background:var(--bg3);border-radius:3px;height:6px">
            <div style="width:${pctBar}%;background:${barColor};height:6px;border-radius:3px;max-width:100%"></div>
          </div>
          <span style="font-size:10px;color:${barColor};min-width:24px;text-align:right">${diff>=0?'+':''}${diff}</span>
        </div>
      </td>
    </tr>`;
  }).join(''):'';

  // Resumen cobertura total
  let totalNeed=0, totalCovered=0, horasDeficit=0;
  if(hasNeeds){
    HOURS.forEach(h=>{
      const n=parseInt(needs[String(h)]?.[String(dow)]||0);
      const c=coveredAtHour(h);
      totalNeed+=n; totalCovered+=c;
      if(c<n) horasDeficit++;
    });
  }

  el.innerHTML=`<div class="card" style="margin-top:16px">
    <div class="card-header">
      <span class="card-title">${dayN(ds)}, ${ds}</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="addVacDayMdl('${ds}')"><i class="fa fa-umbrella-beach"></i> Vacaciones</button>
        <button class="btn btn-secondary btn-sm" onclick="applyTemplateDayMdl('${ds}')"><i class="fa fa-wand-magic-sparkles"></i> Plantilla</button>
        <button class="btn btn-primary btn-sm" onclick="shiftMdl('${ds}')"><i class="fa fa-plus"></i> Añadir turno</button>
      </div>
    </div>

    ${vacas.length?`<div style="margin:8px 16px 0">${vacas.map(v=>{
      const e=DB.employees.find(x=>x.id===v.employee_id);
      return`<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--amber);padding:6px 10px;background:rgba(245,158,11,.08);border-radius:6px;margin-bottom:4px">
        <i class="fa fa-umbrella-beach"></i>
        <span style="flex:1">${e?e.name:'?'} — vacaciones</span>
        <button class="btn btn-danger btn-sm btn-icon" onclick="delVacDay(${v.id},'${ds}')" title="Quitar vacaciones"><i class="fa fa-xmark"></i></button>
      </div>`;
    }).join('')}</div>`:''}

    ${ds2.length?`<div class="table-wrap"><table>
      <thead><tr><th>Empleado</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Coste</th><th></th></tr></thead>
      <tbody>${ds2.map(s=>{
        const e=DB.employees.find(x=>x.id===s.employee_id);
        const hrs=hrsOf(s.start,s.end);
        const badge=s.status==='auto'?'<span class="badge badge-gray" style="font-size:9px">auto</span>':s.status==='template'?'<span class="badge badge-gray" style="font-size:9px">plantilla</span>':'';
        return`<tr>
          <td>
            <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:3px 6px;border-radius:4px;font-size:12px;max-width:160px"
              onchange="updateShift(${s.id},'employee_id',parseInt(this.value));calClick('${ds}')">
              ${DB.employees.filter(e=>e.active).map(emp=>`<option value="${emp.id}"${emp.id===s.employee_id?' selected':''}>${emp.name.split(' ')[0]} ${emp.name.split(' ')[1]||''}</option>`).join('')}
            </select>
            ${badge}
          </td>
          <td><input type="time" value="${s.start}" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:3px 6px;border-radius:4px;font-family:var(--mono);font-size:12px" onchange="updateShift(${s.id},'start',this.value)"></td>
          <td><input type="time" value="${s.end}" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:3px 6px;border-radius:4px;font-family:var(--mono);font-size:12px" onchange="updateShift(${s.id},'end',this.value)"></td>
          <td class="td-mono" style="color:var(--teal)">${hrs.toFixed(1)}h</td>
          <td class="td-mono">${eur(s.cost)}</td>
          <td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteShift(${s.id},'${ds}')"><i class="fa fa-trash"></i></button></td>
        </tr>`;
      }).join('')}
      <tr style="background:var(--bg3);font-weight:600">
        <td colspan="2">TOTAL</td><td></td>
        <td class="td-mono" style="color:var(--teal)">${ds2.reduce((a,s)=>a+hrsOf(s.start,s.end),0).toFixed(1)}h</td>
        <td class="td-mono">${eur(ds2.reduce((a,s)=>a+(s.cost||0),0))}</td>
        <td></td>
      </tr>
      </tbody></table></div>`
    :'<div style="color:var(--text3);padding:12px;font-size:13px">Sin turnos asignados. <a href="#" onclick="shiftMdl(\''+ds+'\')" style="color:var(--accent)">Añadir turno</a> o <a href="#" onclick="applyTemplateDayMdl(\''+ds+'\')" style="color:var(--accent)">aplicar plantilla</a>.</div>'}

    ${hasNeeds?`
    <div style="padding:10px 16px;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-weight:600;font-size:13px"><i class="fa fa-chart-bar" style="color:var(--accent)"></i> Cobertura vs necesidades</span>
        <div style="display:flex;gap:8px;font-size:11px">
          ${horasDeficit>0?'<span style="color:var(--red)">⚠ '+horasDeficit+' franjas con déficit</span>':'<span style="color:var(--green)">✓ Cobertura completa</span>'}
        </div>
      </div>
      <div class="table-wrap"><table style="min-width:300px">
        <thead><tr>
          <th style="padding:3px 8px;font-size:11px">Franja</th>
          <th style="text-align:center;padding:3px 6px;font-size:11px;color:var(--text3)">Necesario</th>
          <th style="text-align:center;padding:3px 6px;font-size:11px;color:var(--accent)">Cubierto</th>
          <th style="padding:3px 8px;font-size:11px">Cobertura</th>
        </tr></thead>
        <tbody>${coverageRows}</tbody>
      </table></div>
    </div>
    `:''}
  </div>`;
}

function calNav(dir){
  const y=parseInt(_store.getItem('cal_y')||new Date().getFullYear());
  const m=parseInt(_store.getItem('cal_m')||new Date().getMonth()+1);
  let ny=y,nm=m; if(dir===0){ny=new Date().getFullYear();nm=new Date().getMonth()+1;}
  else{nm+=dir;if(nm>12){nm=1;ny++;}if(nm<1){nm=12;ny--;}}
  _store.setItem('cal_y',ny);_store.setItem('cal_m',nm);go('schedule');
}

function shiftMdl(date){
  modal(`<div class="modal">
    <div class="modal-header"><h3>Nuevo turno</h3><button class="btn-close-modal" onclick="closeModal()"><i class="fa fa-xmark"></i></button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Empleado</label><select class="form-control" id="sEmp">${DB.employees.filter(e=>!e.sick).map(e=>`<option value="${e.id}">${e.name}</option>`).join('')}</select></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-control" id="sDate" value="${date||today()}"></div><div class="form-group"><label class="form-label">Entrada</label><input type="time" class="form-control" id="sStart" value="10:00"></div></div>
      <div class="form-group"><label class="form-label">Salida</label><input type="time" class="form-control" id="sEnd" value="18:00"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveShift()"><i class="fa fa-check"></i> Guardar</button></div>
  </div>`);
}

function saveShift(){
  const empId=parseInt($('sEmp').value),date=$('sDate').value,start=$('sStart').value,end=$('sEnd').value;
  const emp=DB.employees.find(e=>e.id===empId); if(!emp)return;
  DB.shifts.push({id:maxId(DB.shifts),employee_id:empId,date,start,end,cost:parseFloat((hrsOf(start,end)*emp.hc).toFixed(2)),status:'confirmed'});
  audit('turno_añadido',`${emp.name} — ${date} ${start}-${end}`);
  save();flash();closeModal();
  if($('calDetail'))go('schedule'); else go('shifts');
}

function updateShift(id, field, val){
  const s=DB.shifts.find(x=>x.id===id); if(!s)return;
  s[field]=val;
  // Recalcular coste si cambia hora
  if(field==='start'||field==='end'){
    const emp=DB.employees.find(e=>e.id===s.employee_id);
    if(emp) s.cost=parseFloat((hrsOf(s.start,s.end)*emp.hc).toFixed(2));
  }
  save();
}

function deleteShift(id, ds){
  DB.shifts=DB.shifts.filter(x=>x.id!==id);
  save(); calClick(ds);
}

function autoplanMdl(){
  const now=new Date();
  const selY=parseInt(_store.getItem('cal_y')||now.getFullYear());
  const selM=parseInt(_store.getItem('cal_m')||now.getMonth()+1);
  const mStr=`${selY}-${String(selM).padStart(2,'0')}`;
  const mLabel=new Date(selY,selM-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'});
  const existing=DB.shifts.filter(s=>s.date.startsWith(mStr));
  const vacMes=DB.vacations.filter(v=>v.status!=='rejected'&&
    (v.start.slice(0,7)===mStr||v.end.slice(0,7)===mStr)).length;
  const cfg=getPlanConfig();
  const activeRules=(cfg.assignRules||[]).filter(r=>r.active!==false);
  modal(`<div class="modal" style="max-width:480px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-wand-magic-sparkles"></i> Generar cuadrante — ${mLabel}</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div style="background:var(--bg3);border-radius:8px;padding:12px;font-size:12px;display:flex;flex-direction:column;gap:6px;color:var(--text2)">
        <div><i class="fa fa-users" style="color:var(--accent);width:16px"></i> <strong>${DB.employees.filter(e=>e.active&&!e.sick).length} empleados</strong> activos</div>
        <div><i class="fa fa-scale-balanced" style="color:var(--teal);width:16px"></i> Convenio Ceuta: max 5 dias/semana, 12h descanso</div>
        <div><i class="fa fa-umbrella-beach" style="color:var(--amber);width:16px"></i> ${vacMes} periodo${vacMes!==1?'s':''} de vacaciones en ${mLabel}</div>
        <div><i class="fa fa-shield-halved" style="color:var(--purple);width:16px"></i> ${activeRules.length} regla${activeRules.length!==1?'s':''} de asignacion activas</div>
      </div>
      ${existing.length>0?`<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--red)">
        <i class="fa fa-triangle-exclamation"></i> Hay <strong>${existing.length} turnos</strong> en ${mLabel}. Se <strong>borraran todos</strong> y se regeneraran desde cero.
      </div>`:``}
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="closeModal();autoplanMonth(${selY},${selM})">
        <i class="fa fa-wand-magic-sparkles"></i> Generar cuadrante desde cero
      </button>
    </div>
  </div>`);
}

function autoplanMonth(y,m){
  const cfg=getPlanConfig();
  const RULES=cfg.rules, ENCARGADOS=cfg.encargados||[], SH=cfg.shifts;
  const mStr=`${y}-${String(m).padStart(2,'0')}`;
  const days=new Date(y,m,0).getDate();
  let added=0, warnings=[];

  DB.shifts=DB.shifts.filter(s=>!s.date.startsWith(mStr));

  for(let d=1;d<=days;d++){
    const ds=`${mStr}-${String(d).padStart(2,'0')}`;
    const dow=new Date(ds).getDay();
    const rule=RULES[dow], factor=planFactor(ds);
    const wk=isoWeekMonday(ds);

    function diasEnSemana(empId){
      return new Set(DB.shifts.filter(s=>s.date.startsWith(mStr)&&s.employee_id===empId&&isoWeekMonday(s.date)===wk).map(s=>s.date)).size;
    }

    const disponibles=availableEmps(ds).filter(e=>{
      if(e.type==='part') return true;
      return diasEnSemana(e.id)<5;
    });
    if(!disponibles.length){warnings.push(ds+': sin disponibles');continue;}

    const hrsMap={};
    disponibles.forEach(e=>{hrsMap[e.id]=hrsInMonth(e.id,mStr);});
    const encDisp=disponibles.filter(e=>ENCARGADOS.includes(e.id));

    const hasNeeds=Object.keys(getStaffNeeds(ds)).length>0;
    let nP,nC,nN;
    if(hasNeeds){
      const nCo=staffForShift(SH.comida.start,SH.comida.end,dow,ds);
      const nCe=staffForShift(SH.cena.start,SH.cena.end,dow,ds);
      nP=Math.max(0,Math.min(nCo,nCe)+factor); nC=Math.max(0,nCo-nP); nN=Math.max(0,nCe-nP+factor);
    } else {
      nP=Math.max(0,rule.p+factor); nC=Math.max(0,rule.c-rule.p); nN=Math.max(0,rule.n-rule.p+factor);
    }

    const asignados=new Set();
    function elegir(pool,n,tipo){
      const shKey=tipo==='partido'?'partido1':tipo==='comida'?'comida':'cena';
      const tS=SH[shKey]?SH[shKey].start:'10:00', tE=SH[shKey]?SH[shKey].end:'18:30';
      const filt=applyAssignRules(pool,ds,tS,tE,asignados).filter(e=>!asignados.has(e.id));
      filt.sort((a,b)=>(hrsMap[a.id]||0)-(hrsMap[b.id]||0));
      if(tipo==='partido'){
        const enc=filt.filter(e=>ENCARGADOS.includes(e.id));
        const nenc=filt.filter(e=>!ENCARGADOS.includes(e.id));
        const r=enc.length>0?[enc[0]]:[];
        for(const e of nenc){if(r.length>=n)break;r.push(e);}
        return r.slice(0,n);
      }
      const enc=filt.filter(e=>ENCARGADOS.includes(e.id)).slice(0,1);
      const nenc=filt.filter(e=>!ENCARGADOS.includes(e.id));
      const r=[...enc];
      for(const e of nenc){if(r.length>=n)break;r.push(e);}
      return r.slice(0,n);
    }

    const pPart=disponibles.filter(e=>e.fs&&e.fs&&e.fs.some(f=>f.d===dow&&f.s===SH.partido1.start));
    const pCom=disponibles.filter(e=>e.fs&&e.fs.some(f=>f.d===dow&&f.s===SH.comida.start));
    const pCena=disponibles.filter(e=>e.fs&&e.fs.some(f=>f.d===dow&&f.s===SH.cena.start));
    const flex=disponibles.filter(e=>!e.fs||!e.fs.length);
    const encP=[...encDisp].sort((a,b)=>(hrsMap[a.id]||0)-(hrsMap[b.id]||0)).slice(0,1);
    const idsP=new Set([...pPart,...encP].map(e=>e.id));

    const empP=elegir([...pPart,...encP,...flex.filter(e=>!idsP.has(e.id))],nP,'partido');
    empP.forEach(emp=>{
      const s1=SH.partido1.start,e1=SH.partido1.end,s2=SH.partido2.start,e2=SH.partido2.end;
      DB.shifts.push({id:maxId(DB.shifts),employee_id:emp.id,date:ds,start:s1,end:e1,cost:parseFloat((hrsOf(s1,e1)*emp.hc).toFixed(2)),status:'auto',tipo:'partido-m'});
      DB.shifts.push({id:maxId(DB.shifts),employee_id:emp.id,date:ds,start:s2,end:e2,cost:parseFloat((hrsOf(s2,e2)*emp.hc).toFixed(2)),status:'auto',tipo:'partido-t'});
      asignados.add(emp.id);hrsMap[emp.id]=(hrsMap[emp.id]||0)+hrsOf(s1,e1)+hrsOf(s2,e2);added+=2;
    });
    warnings.push(...checkCoverageRule(ds,SH.partido1.start,asignados));

    const encNoP=encDisp.filter(e=>!asignados.has(e.id));
    const empC=elegir([...pCom.filter(e=>!asignados.has(e.id)),...encNoP,...flex.filter(e=>!asignados.has(e.id))],nC,'comida');
    empC.forEach(emp=>{
      const s=SH.comida.start,e=SH.comida.end;
      DB.shifts.push({id:maxId(DB.shifts),employee_id:emp.id,date:ds,start:s,end:e,cost:parseFloat((hrsOf(s,e)*emp.hc).toFixed(2)),status:'auto',tipo:'comida'});
      asignados.add(emp.id);hrsMap[emp.id]=(hrsMap[emp.id]||0)+hrsOf(s,e);added++;
    });

    const encNoC=encDisp.filter(e=>!asignados.has(e.id));
    const empN=elegir([...pCena.filter(e=>!asignados.has(e.id)),...encNoC,...flex.filter(e=>!asignados.has(e.id))],nN,'cena');
    empN.forEach(emp=>{
      const s=SH.cena.start,e=SH.cena.end;
      DB.shifts.push({id:maxId(DB.shifts),employee_id:emp.id,date:ds,start:s,end:e,cost:parseFloat((hrsOf(s,e)*emp.hc).toFixed(2)),status:'auto',tipo:'cena'});
      asignados.add(emp.id);hrsMap[emp.id]=(hrsMap[emp.id]||0)+hrsOf(s,e);added++;
    });

    // Alertas de cobertura
    const needs=getStaffNeeds(ds);
    if(Object.keys(needs).length){
      const HOURS=[10,11,12,13,14,15,16,17,18,19,20,21,22,23,0];
      const shifts=DB.shifts.filter(s=>s.date===ds);
      function covAt(h){return shifts.filter(s=>{const sh=parseInt(s.start),eh=parseInt(s.end)||0;if(eh===0||eh<sh)return h>=sh||h<eh;return h>=sh&&h<eh;}).length;}
      let maxDef=0,worstH='';
      HOURS.forEach(h=>{const n=parseInt(needs[String(h)]?.[String(dow)]||0);const def=n-covAt(h);if(def>maxDef){maxDef=def;worstH=String(h).padStart(2,'0')+':00';}});
      if(maxDef>0) warnings.push(ds+' déficit '+maxDef+'p a las '+worstH);
    }
  }

  // Generar alerta de cobertura si hay déficits
  const mStr2=mStr;
  const mLabel=new Date(y,m-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'});
  const deficitDays=warnings.filter(w=>w.includes('déficit'));
  DB.alerts=DB.alerts.filter(a=>!(a._sk&&a._sk.startsWith('cov_'+mStr)));
  if(deficitDays.length>0){
    DB.alerts.push({id:maxId(DB.alerts),sev:'warning',
      msg:'Cobertura insuficiente en '+deficitDays.length+' día(s) de '+mLabel,
      soluciones:[deficitDays.slice(0,5).join(' · '),'Revisa el cuadrante — pincha cada día para ver la cobertura hora a hora'],
      mStr,done:false,_sk:'cov_'+mStr+'_'+Date.now(),ts:new Date().toLocaleDateString('es-ES')});
  }

  save();
  audit('autoplan','Planificación '+y+'-'+String(m).padStart(2,'0')+': '+added+' turnos');
  flash('✓ '+added+' turnos generados'+(warnings.length?' · ⚠ '+warnings.length+' avisos':''));
  if(warnings.length) console.warn('Avisos:',warnings);
  go('schedule');
}

function applyTemplateDayMdl(ds){
  const dow=new Date(ds).getDay();
  const available=DB.employees.filter(e=>e.active&&!e.sick&&e.fs&&e.fs.some(f=>f.d===dow));
  if(!available.length){flash('No hay empleados con días fijos configurados para este día');return;}
  if(!confirm(`¿Aplicar plantilla de turnos fijos para el ${dayN(ds)} ${ds}? Se añadirán ${available.length} turnos.`))return;
  let added=0;
  available.forEach(emp=>{
    emp.fs.filter(f=>f.d===dow).forEach(f=>{
      if(DB.shifts.some(s=>s.employee_id===emp.id&&s.date===ds&&s.start===f.s))return;
      DB.shifts.push({id:maxId(DB.shifts),employee_id:emp.id,date:ds,start:f.s,end:f.e,
        cost:parseFloat((hrsOf(f.s,f.e)*emp.hc).toFixed(2)),status:'template'});
      added++;
    });
  });
  save(); flash(`✓ ${added} turnos de plantilla aplicados`); calClick(ds);
}

function applyTplMdl(y,m){
  const n=applyTemplateToMonth(y,m);
  save(); flash(`✓ ${n} turnos de plantilla aplicados al mes`); go('schedule');
}

function editTemplateMdl(){go('employees');}

function genScheduleFromOptimal(y, m){
  const mStr=`${y}-${String(m).padStart(2,'0')}`;
  const mLabel=new Date(y,m-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'});
  const existing=DB.shifts.filter(s=>s.date.startsWith(mStr)).length;
  const vacMes=DB.vacations.filter(v=>v.status!=='rejected'&&
    (v.start.slice(0,7)===mStr||v.end.slice(0,7)===mStr)).length;
  const cfg=getPlanConfig();
  const rules=cfg.assignRules||[];
  const activeRules=rules.filter(r=>r.active!==false);

  modal(`<div class="modal" style="max-width:520px">
    <div class="modal-header">
      <h3 class="modal-title"><i class="fa fa-wand-magic-sparkles"></i> Generar cuadrante — ${mLabel}</h3>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">

      <!-- Resumen de lo que se usará -->
      <div style="background:var(--bg3);border-radius:8px;padding:12px;font-size:12px">
        <div style="font-weight:600;margin-bottom:8px;color:var(--text)">El cuadrante se generará con:</div>
        <div style="display:flex;flex-direction:column;gap:5px;color:var(--text2)">
          <div style="display:flex;gap:8px">
            <i class="fa fa-users" style="color:var(--accent);width:14px;margin-top:2px"></i>
            <span><strong>${DB.employees.filter(e=>e.active&&!e.sick).length} empleados activos</strong>
              (${DB.employees.filter(e=>e.active&&!e.sick&&e.type==='full').length} a 40h,
               ${DB.employees.filter(e=>e.active&&!e.sick&&e.type==='part').length} parciales)
            </span>
          </div>
          <div style="display:flex;gap:8px">
            <i class="fa fa-scale-balanced" style="color:var(--teal);width:14px;margin-top:2px"></i>
            <span>Convenio hostelería Ceuta: máx 5 días/semana, 12h descanso entre jornadas</span>
          </div>
          <div style="display:flex;gap:8px">
            <i class="fa fa-umbrella-beach" style="color:var(--amber);width:14px;margin-top:2px"></i>
            <span>${vacMes} periodo${vacMes!==1?'s':''} de vacaciones aprobados en ${mLabel}</span>
          </div>
          <div style="display:flex;gap:8px">
            <i class="fa fa-shield-halved" style="color:var(--purple);width:14px;margin-top:2px"></i>
            <span>${activeRules.length} regla${activeRules.length!==1?'s':''} de asignación activa${activeRules.length!==1?'s':''}
              ${activeRules.map(r=>`<span style="background:var(--bg2);padding:1px 6px;border-radius:3px;margin-left:4px;font-size:11px">${r.label||r.type}</span>`).join('')}
            </span>
          </div>
          <div style="display:flex;gap:8px">
            <i class="fa fa-chart-mixed" style="color:var(--green);width:14px;margin-top:2px"></i>
            <span>Ajuste por ventas históricas (±1 persona si difieren >25%)</span>
          </div>
          ${Object.keys(getStaffNeeds()).length>0?`<div style="display:flex;gap:8px">
            <i class="fa fa-table" style="color:var(--accent);width:14px;margin-top:2px"></i>
            <span>Tabla de necesidades por hora importada</span>
          </div>`:''}
        </div>
      </div>

      ${existing>0?`<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--amber)">
        <i class="fa fa-triangle-exclamation"></i>
        Ya hay <strong>${existing} turnos</strong> en ${mLabel}.
        "Generar" solo añade donde falten. "Borrar y regenerar" elimina todos los automáticos y los rehace desde cero.
      </div>`:''}

    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="closeModal();_store.setItem('cal_y','${y}');_store.setItem('cal_m','${m}');autoplanMonth(${y},${m})">
        <i class="fa fa-wand-magic-sparkles"></i> Generar cuadrante desde cero
      </button>
    </div>
  </div>`);
}
