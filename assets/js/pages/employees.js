// ─── EMPLEADOS ──────────────────────────────────────────────

function pgEmployees(){
  const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const rows=DB.employees.map(e=>{
    // Días fijos info - usando concatenación para evitar backticks anidados
    let fsInfo;
    if(e.type!=='full'&&e.fs&&e.fs.length){
      fsInfo=e.fs.map(f=>'<span style="background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:2px 5px;font-size:10px;font-family:var(--mono);white-space:nowrap">'+DOW[f.d]+' '+f.s+'-'+f.e+'</span>').join(' ');
    } else if(e.type!=='full'){
      fsInfo='<span style="color:var(--red);font-size:11px">⚠ Sin configurar</span>';
    } else {
      fsInfo='<span style="color:var(--text3);font-size:11px">—</span>';
    }
    // Días de vacaciones
    const vacUsed=DB.vacations.filter(v=>v.employee_id===e.id&&v.status!=='rejected'&&new Date(v.start).getFullYear()===new Date().getFullYear()).reduce((a,v)=>a+(v.days||Math.round((new Date(v.end)-new Date(v.start))/86400000)+1),0);
    const vacTotal=e.vacDias||30;
    const vacLeft=vacTotal-vacUsed;
    const vacColor=vacLeft<=5?'var(--red)':vacLeft<=10?'var(--amber)':'var(--green)';
    const statusBadge=e.sick>0?'<span class="badge badge-red">🏥 Baja</span>':e.active?'<span class="badge badge-green">Activo</span>':'<span class="badge badge-gray">Inactivo</span>';
    return '<tr>'
      +'<td><div style="font-weight:600">'+e.name+'</div>'+(e.tel?'<div style="font-size:11px;color:var(--text3)">'+e.tel+'</div>':'')+'</td>'
      +'<td style="font-size:12px;color:var(--text2)">'+(e.cat||'—')+'</td>'
      +'<td><span class="badge badge-'+(e.type==='full'?'blue':'amber')+'">'+e.wh+'h</span></td>'
      +'<td class="td-mono">'+e.hc+'€</td>'
      +'<td style="display:flex;flex-wrap:wrap;gap:3px;max-width:200px">'+fsInfo+'</td>'
      +'<td style="text-align:center"><span style="font-weight:600;color:'+vacColor+'">'+vacLeft+'</span><span style="font-size:10px;color:var(--text3)">/'+ vacTotal+'d</span></td>'
      +'<td>'+statusBadge+'</td>'
      +'<td><button class="btn btn-secondary btn-sm btn-icon" onclick="empMdl('+e.id+')"><i class="fa fa-pencil"></i></button></td>'
      +'</tr>';
  }).join('');
  return '<div class="page-header"><div><h2>Empleados</h2>'
    +'<p>'+DB.employees.filter(e=>e.active).length+' activos · '+DB.employees.filter(e=>e.sick>0).length+' de baja · '+DB.employees.filter(e=>!e.active).length+' inactivos</p>'
    +'</div><div class="page-actions"><button class="btn btn-primary" onclick="empMdl()"><i class="fa fa-plus"></i> Nuevo</button></div></div>'
    +'<div class="page-body"><div class="card"><div class="table-wrap"><table>'
    +'<thead><tr><th>Nombre</th><th>Categoría</th><th>Jornada</th><th>€/h</th><th>Días fijos</th><th>Vacaciones</th><th>Estado</th><th></th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table></div></div></div>';
}

function empMdl(id){
  const e=id?DB.employees.find(x=>x.id===id):null;
  const isPart=e&&e.type==='part';
  const fs=e&&e.fs&&e.fs.length?e.fs:[];
  window._fsSlots=JSON.parse(JSON.stringify(fs));
  const dows=[{v:1,l:'Lunes'},{v:2,l:'Martes'},{v:3,l:'Miércoles'},{v:4,l:'Jueves'},{v:5,l:'Viernes'},{v:6,l:'Sábado'},{v:0,l:'Domingo'}];
  const CATS=['Jefe/a de cocina','Cocinero/a','Ayudante cocina','Encargado/a sala','Camarero/a','Ayudante camarero/a','Barista','Limpieza','Otro'];

  function fsRows(slots){
    if(!slots.length) return '<div style="color:var(--text3);font-size:12px;padding:6px 0">Sin días configurados</div>';
    return slots.map((f,i)=>{
      const dowOpts=dows.map(d=>'<option value="'+d.v+'"'+(f.d===d.v?' selected':'')+'>'+d.l+'</option>').join('');
      return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px">'
        +'<select data-fs-d="'+i+'" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:4px 6px;border-radius:6px;font-size:12px;flex:1">'+dowOpts+'</select>'
        +'<input type="time" value="'+f.s+'" data-fs-s="'+i+'" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:4px 6px;border-radius:6px;font-family:var(--mono);font-size:12px;width:90px">'
        +'<span style="color:var(--text3);font-size:11px">&rarr;</span>'
        +'<input type="time" value="'+f.e+'" data-fs-e="'+i+'" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:4px 6px;border-radius:6px;font-family:var(--mono);font-size:12px;width:90px">'
        +'<button type="button" class="btn btn-danger btn-sm btn-icon" onclick="removeFsRow('+i+')"><i class="fa fa-xmark"></i></button>'
        +'</div>';
    }).join('');
  }

  const catOpts = CATS.map(c=>'<option'+(e&&e.cat===c?' selected':'')+'>'+c+'</option>').join('');
  const n = e?e.name:'';
  const vacDias = e&&e.vacDias?e.vacDias:30;
  const hc = e?e.hc:9.25;
  const mc = e?e.mc:1603;
  const nick = e&&e.nick?e.nick:'';
  const notes = e&&e.notes?e.notes:'';
  const tel = e&&e.tel?e.tel:'';

  modal(`<div class="modal" style="max-width:520px;max-height:90vh;overflow-y:auto">
    <div class="modal-header">
      <h3>${e?'Editar':'Nuevo'} empleado</h3>
      <button class="btn-close-modal" onclick="closeModal()"><i class="fa fa-xmark"></i></button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">

      <div class="form-row">
        <div class="form-group"><label class="form-label">Nombre completo</label>
          <input type="text" class="form-control" id="eN" value="${n}" required></div>
        <div class="form-group"><label class="form-label">Alias (cuadrante)</label>
          <input type="text" class="form-control" id="eNick" value="${nick}" placeholder="${e?n.split(' ')[0]:''}"></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Teléfono</label>
          <input type="tel" class="form-control" id="eTel" value="${tel}"></div>
        <div class="form-group"><label class="form-label">Categoría</label>
          <select class="form-control" id="eCat">${catOpts}</select></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Jornada</label>
          <select class="form-control" id="eT" onchange="toggleFsSection(this.value)">
            <option value="full" ${!e||e.type==='full'?'selected':''}>40h — Jornada completa</option>
            <option value="part35" ${e&&e.type==='part35'?'selected':''}>35h — Jornada reducida</option>
            <option value="part30" ${e&&e.type==='part30'?'selected':''}>30h — Jornada reducida</option>
            <option value="part25" ${e&&e.type==='part25'?'selected':''}>25h — Media jornada +</option>
            <option value="part" ${e&&e.type==='part'?'selected':''}>20h — Media jornada</option>
            <option value="part15" ${e&&e.type==='part15'?'selected':''}>15h — Jornada parcial</option>
            <option value="part10" ${e&&e.type==='part10'?'selected':''}>10h — Jornada parcial</option>
          </select></div>
        <div class="form-group"><label class="form-label">Estado</label>
          <select class="form-control" id="eS">
            <option value="a" ${!e||(!e.sick&&e.active)?'selected':''}>✅ Activo</option>
            <option value="s" ${e&&e.sick>0?'selected':''}>🏥 Baja médica</option>
            <option value="i" ${e&&!e.active?'selected':''}>⛔ Inactivo</option>
          </select></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">€/hora bruto</label>
          <input type="number" class="form-control" id="eCH" value="${hc}" step="0.01"></div>
        <div class="form-group"><label class="form-label">€/mes bruto</label>
          <input type="number" class="form-control" id="eCM" value="${mc}"></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Días vacaciones/año</label>
          <input type="number" class="form-control" id="eVacDias" value="${vacDias}" min="0" max="60"></div>
        <div class="form-group"><label class="form-label">Notas</label>
          <input class="form-control" id="eObs" value="${notes}" placeholder="Observaciones…"></div>
      </div>

      <!-- Días fijos para parciales -->
      <div id="fsSect" style="display:${isPart?'block':'none'};border-top:1px solid var(--border);padding-top:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3)">Días y horarios fijos</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Solo se planificará en estos días</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addFsRow()"><i class="fa fa-plus"></i> Añadir día</button>
        </div>
        <div id="fsContainer">${fsRows(fs)}</div>
      </div>

    </div>
    <div class="modal-footer">
      ${e?`<button class="btn btn-danger btn-sm" onclick="if(confirm('¿Eliminar a ${n}?')){DB.employees=DB.employees.filter(x=>x.id!==${e.id});save();audit('empleado_eliminado','${n}');closeModal();go('employees')}">Eliminar</button>`:''}
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveEmp(${e?e.id:'null'})"><i class="fa fa-check"></i> Guardar</button>
    </div>
  </div>`);
}

async function saveEmp(id){
  const n=$('eN').value.trim(); if(!n){alert('Introduce el nombre');return;}
  const type=$('eT').value, st=$('eS').value;
  const hr=parseFloat($('eCH').value)||hrate();
  const whMap={'full':40,'part35':35,'part30':30,'part25':25,'part':20,'part15':15,'part10':10};
  const wh=whMap[type]||20;
  let fs=[];
  if(type!=='full'){
    const dSelects=document.querySelectorAll('[data-fs-d]');
    dSelects.forEach((sel,i)=>{
      const sEl=document.querySelector('[data-fs-s="'+i+'"]');
      const eEl=document.querySelector('[data-fs-e="'+i+'"]');
      if(sEl&&eEl&&sEl.value&&eEl.value) fs.push({d:parseInt(sel.value),s:sEl.value,e:eEl.value});
    });
  }
  const data={
    name:n, nick:$('eNick').value.trim()||n.split(' ')[0],
    type, wh, hc:hr,
    mc:parseInt($('eCM').value)||Math.round(hr*wh*52/12),
    sick:st==='s'?1:0, active:st!=='i',
    cat:$('eCat').value, tel:$('eTel').value.trim(),
    vacDias:parseInt($('eVacDias').value)||30,
    notes:$('eObs').value.trim(),
    fs, avatar:n[0].toUpperCase()
  };

  const btnSave = document.querySelector('.modal-footer .btn-primary');
  if(btnSave){ btnSave.disabled = true; btnSave.textContent = 'Guardando...'; }

  const existing = id ? DB.employees.find(x=>x.id===id) : null;
  const toSync = existing ? {...existing, ...data, id: existing.id} : {...data, id: null};
  const result = await dbSaveEmployee(toSync);

  if(!result.ok){
    if(btnSave){ btnSave.disabled = false; btnSave.textContent = 'Guardar'; }
    alert('Error al guardar en la base de datos: ' + result.error);
    return;
  }

  data.id = result.id;

  if(existing){
    Object.assign(existing, data);
    audit('empleado_editado',n+' — '+data.wh+'h');
  } else {
    DB.employees.push(data);
    audit('empleado_creado',n+' — '+data.wh+'h');
  }
  save(); flash('✓ Empleado guardado'); closeModal(); go('employees');
}

function toggleFsSection(val){
  const s=document.getElementById('fsSect');
  if(s) s.style.display=val!=='full'?'block':'none';
}

function addFsRow(){
  window._fsSlots=window._fsSlots||[];
  window._fsSlots.push({d:1,s:'10:00',e:'18:30'});
  // Re-renderizar el contenedor
  const dows=[{v:1,l:'Lunes'},{v:2,l:'Martes'},{v:3,l:'Miércoles'},{v:4,l:'Jueves'},{v:5,l:'Viernes'},{v:6,l:'Sábado'},{v:0,l:'Domingo'}];
  const cont=document.getElementById('fsContainer');
  if(!cont)return;
  cont.innerHTML=window._fsSlots.map((f,i)=>`
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-size:12px;flex:1" data-fs-d="${i}">
        ${dows.map(d=>`<option value="${d.v}"${f.d===d.v?' selected':''}>${d.l}</option>`).join('')}
      </select>
      <input type="time" value="${f.s}" data-fs-s="${i}" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-family:var(--mono);font-size:12px">
      <span style="color:var(--text3)">→</span>
      <input type="time" value="${f.e}" data-fs-e="${i}" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-family:var(--mono);font-size:12px">
      <button type="button" class="btn btn-danger btn-sm btn-icon" onclick="removeFsRow(${i})"><i class="fa fa-xmark"></i></button>
    </div>`).join('');
}

function removeFsRow(i){
  window._fsSlots=window._fsSlots||[];
  window._fsSlots.splice(i,1);
  addFsRow(); // re-renderiza (reutilizamos la función que redibuja)
}