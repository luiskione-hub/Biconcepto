// ─── VACACIONES ─────────────────────────────────────────────

function pgVacations(){
  const vacs=DB.vacations.slice().sort((a,b)=>b.start.localeCompare(a.start));
  const pending=vacs.filter(v=>v.status==='pending').length;
  const rows=vacs.length?vacs.map(v=>{
    const e=DB.employees.find(x=>x.id===v.employee_id);
    const days=v.days||Math.round((new Date(v.end)-new Date(v.start))/86400000)+1;
    const st=v.status||'approved';
    const badge=st==='approved'?'<span class="badge badge-green">✓ Aprobada</span>':
                 st==='rejected'?'<span class="badge badge-red">✗ Rechazada</span>':
                 '<span class="badge badge-amber">⏳ Pendiente</span>';
    const actions=`
      ${st==='pending'?`<button class="btn btn-primary btn-sm" onclick="approveVac(${v.id})"><i class="fa fa-check"></i> Aprobar</button>
        <button class="btn btn-danger btn-sm" onclick="rejectVac(${v.id})"><i class="fa fa-xmark"></i> Rechazar</button>`:''}
      ${st==='approved'?`<button class="btn btn-secondary btn-sm btn-icon" onclick="rejectVac(${v.id})" title="Revocar"><i class="fa fa-rotate-left"></i></button>`:''}
      ${st==='rejected'?`<button class="btn btn-secondary btn-sm btn-icon" onclick="approveVac(${v.id})" title="Aprobar"><i class="fa fa-check"></i></button>`:''}
      <button class="btn btn-danger btn-sm btn-icon" onclick="if(confirm('¿Eliminar?')){DB.vacations=DB.vacations.filter(x=>x.id!==${v.id});save();go('vacations')}"><i class="fa fa-trash"></i></button>`;
    return`<tr>
      <td class="td-bold">${e?e.name:'?'}</td>
      <td>${v.start}</td><td>${v.end}</td>
      <td class="td-mono">${days}d</td>
      <td>${badge}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">${actions}</div></td>
    </tr>`;
  }).join(''):`<tr><td colspan="6" style="text-align:center;color:var(--text3)">Sin solicitudes de vacaciones</td></tr>`;

  return`<div class="page-header">
    <div><h2>Vacaciones y ausencias</h2><p>${vacs.length} registros · ${pending} pendientes</p></div>
    <div class="page-actions">
      ${pending>0?`<button class="btn btn-primary btn-sm" onclick="approveAllVac()"><i class="fa fa-check-double"></i> Aprobar todas</button>`:''}
      <button class="btn btn-primary btn-sm" onclick="vacMdl()"><i class="fa fa-plus"></i> Nueva</button>
    </div>
  </div>
  <div class="page-body">
    ${pending>0?`<div class="alert-item warning" style="margin-bottom:12px"><i class="fa fa-triangle-exclamation alert-icon"></i>
      <div><div class="alert-msg">${pending} vacaciones pendientes de aprobar</div>
      <div class="alert-meta">El cuadrante automático solo respeta las vacaciones aprobadas. Apruébalas antes de generar el cuadrante.</div></div>
    </div>`:''}
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Empleado</th><th>Desde</th><th>Hasta</th><th>Días</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
  </div>`;
}

function vacMdl(){
  const empOpts=DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  modal(`<div class="modal" style="max-width:380px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-umbrella-beach"></i> Nueva ausencia / vacaciones</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div><label class="form-label">Empleado</label>
        <select class="form-control" id="vE">${empOpts}</select></div>
      <div class="form-row">
        <div><label class="form-label">Desde</label><input type="date" class="form-control" id="vS"></div>
        <div><label class="form-label">Hasta</label><input type="date" class="form-control" id="vE2"></div>
      </div>
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveVac()">Guardar</button>
    </div>
  </div>`);
}

async function saveVac(){
  const s=$('vS').value, e=$('vE2').value;
  if(!s||!e){alert('Introduce fechas');return;}
  const days=Math.round((new Date(e)-new Date(s))/86400000)+1;
  const employee_id=$('vE').value;
  const result=await dbSaveVacation({id:null,employee_id,start:s,end:e,status:'pending'});
  if(!result.ok){alert('Error al guardar: '+result.error);return;}
  DB.vacations.push({id:result.id,employee_id,start:s,end:e,days,status:'pending'});
  save();flash('✓ Vacaciones registradas');closeModal();go('vacations');
}

async function approveVac(id){
  const v=DB.vacations.find(x=>x.id===id);
  if(!v)return;
  const result=await dbSaveVacation({...v,status:'approved'});
  if(!result.ok){alert('Error al actualizar: '+result.error);return;}
  v.status='approved';save();audit('vac_aprobada',DB.employees.find(e=>e.id===v.employee_id)?.name+' '+v.start+'→'+v.end);
  go('vacations');
}

async function rejectVac(id){
  const v=DB.vacations.find(x=>x.id===id);
  if(!v)return;
  const result=await dbSaveVacation({...v,status:'rejected'});
  if(!result.ok){alert('Error al actualizar: '+result.error);return;}
  v.status='rejected';save();
  go('vacations');
}

async function approveAllVac(){
  if(!confirm('¿Aprobar todas las vacaciones pendientes?'))return;
  const pending=DB.vacations.filter(v=>v.status==='pending');
  for(const v of pending){
    await dbSaveVacation({...v,status:'approved'});
    v.status='approved';
  }
  save();flash('✓ Todas aprobadas');go('vacations');
}

function addVacDayMdl(ds){
  const empOpts=DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  modal(`<div class="modal" style="max-width:340px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-umbrella-beach"></i> Vacaciones — ${ds}</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div><label class="form-label">Empleado</label>
        <select class="form-control" id="vacEmp">${empOpts}</select></div>
      <div class="form-row">
        <div><label class="form-label">Hasta</label>
          <input type="date" class="form-control" id="vacEnd" value="${ds}"></div>
      </div>
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveVacDay('${ds}')"><i class="fa fa-check"></i> Asignar</button>
    </div>
  </div>`);
}

async function saveVacDay(startDs){
  const empId=$('vacEmp').value;
  const endDs=$('vacEnd').value||startDs;
  const result=await dbSaveVacation({id:null,employee_id:empId,start:startDs,end:endDs,status:'approved',notes:'Manual'});
  if(!result.ok){alert('Error al guardar: '+result.error);return;}
  DB.vacations.push({id:result.id,employee_id:empId,start:startDs,end:endDs,note:'Manual',status:'approved'});
  save();closeModal();calClick(startDs);
}

async function delVacDay(vacId,ds){
  await dbDeleteVacation(vacId);
  DB.vacations=DB.vacations.filter(x=>x.id!==vacId);
  save();calClick(ds);
}

function vacResumenMdl(){
  const year=new Date().getFullYear();
  const rows=DB.employees.filter(e=>e.active).map(e=>{
    const used=DB.vacations.filter(v=>v.employee_id===e.id&&v.status!=='rejected'&&
      new Date(v.start).getFullYear()===year)
      .reduce((a,v)=>a+(v.days||Math.round((new Date(v.end)-new Date(v.start))/86400000)+1),0);
    const total=e.vacDias||30;
    const left=total-used;
    return`<tr><td>${e.name}</td><td class="td-mono">${total}</td>
      <td class="td-mono" style="color:var(--amber)">${used}</td>
      <td class="td-mono" style="color:${left<=5?'var(--red)':left<=10?'var(--amber)':'var(--green)'}">${left}</td></tr>`;
  }).join('');
  modal(`<div class="modal" style="max-width:420px">
    <div class="modal-header"><h3 class="modal-title">Resumen vacaciones ${year}</h3></div>
    <div class="modal-body"><div class="table-wrap"><table>
      <thead><tr><th>Empleado</th><th>Total</th><th>Usados</th><th>Disponibles</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  </div>`);
}