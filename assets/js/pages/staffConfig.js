// ─── CONFIGURACIÓN DE PLANTILLA ─────────────────────────────

function pgScheduleConfig(){
  const cfg=getPlanConfig();
  const r=cfg.rules;
  const sh=cfg.shifts;
  const days=[
    {dow:1,label:'Lunes'},{dow:2,label:'Martes'},{dow:3,label:'Miércoles'},
    {dow:4,label:'Jueves'},{dow:5,label:'Viernes'},{dow:6,label:'Sábado'},{dow:0,label:'Domingo'}
  ];

  // Encargados selector
  const empOpts=DB.employees.filter(e=>e.active).map(e=>
    `<option value="${e.id}"${cfg.encargados.includes(e.id)?' selected':''}>${e.name}</option>`
  ).join('');

  // Tabla de reglas por día
  const rulesRows=days.map(({dow,label})=>`
    <tr>
      <td style="font-weight:600;color:var(--text)">${label}</td>
      <td><input type="number" min="0" max="20" value="${r[dow].c}" style="${iStyle()}"
        onchange="updatePlanRule(${dow},'c',+this.value)"></td>
      <td><input type="number" min="0" max="20" value="${r[dow].n}" style="${iStyle()}"
        onchange="updatePlanRule(${dow},'n',+this.value)"></td>
      <td><input type="number" min="0" max="20" value="${r[dow].p}" style="${iStyle()}"
        onchange="updatePlanRule(${dow},'p',+this.value)"></td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--teal)">
        ${r[dow].p} partido + ${Math.max(0,r[dow].c-r[dow].p)} comida + ${Math.max(0,r[dow].n-r[dow].p)} cena
        = <strong>${Math.max(0,r[dow].c-r[dow].p)+Math.max(0,r[dow].n-r[dow].p)+r[dow].p}</strong> personas
      </td>
    </tr>`).join('');

  function iStyle(){return 'width:60px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-family:var(--mono);font-size:13px;text-align:center';}
  function tInput(val,key1,key2){return `<input type="time" value="${val}" style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-family:var(--mono);font-size:13px" onchange="updatePlanShift('${key1}','${key2}',this.value)">`;}

  // No coincide pares
  const noPairs=cfg.noCoincide.map((pair,i)=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-size:12px" onchange="updateNoPair(${i},0,+this.value)">
        ${DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}"${e.id===pair[0]?' selected':''}>${e.name}</option>`).join('')}
      </select>
      <span style="color:var(--text3)">≠</span>
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:5px 8px;border-radius:6px;font-size:12px" onchange="updateNoPair(${i},1,+this.value)">
        ${DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}"${e.id===pair[1]?' selected':''}>${e.name}</option>`).join('')}
      </select>
      <button class="btn btn-danger btn-sm btn-icon" onclick="removeNoPair(${i})"><i class="fa fa-trash"></i></button>
    </div>`).join('');

  return`<div class="page-header">
    <div><h2><i class="fa fa-sliders"></i> Configuración de turnos</h2>
    <p>Reglas para la planificación automática del cuadrante</p></div>
    <div class="page-actions">
      <button class="btn btn-primary btn-sm" onclick="savePlanConfig()"><i class="fa fa-floppy-disk"></i> Guardar cambios</button>
    </div>
  </div>
  <div class="page-body" style="display:flex;flex-direction:column;gap:16px">

    <!-- Horas de turno -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-clock"></i> Horarios de turno</span></div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px">
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">🍽 Turno comida (continuo)</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${tInput(sh.comida.start,'comida','start')}
            <span style="color:var(--text3)">→</span>
            ${tInput(sh.comida.end,'comida','end')}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">🌙 Turno cena (continuo)</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${tInput(sh.cena.start,'cena','start')}
            <span style="color:var(--text3)">→</span>
            ${tInput(sh.cena.end,'cena','end')}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">🔀 Turno partido — 1ª parte</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${tInput(sh.partido1.start,'partido1','start')}
            <span style="color:var(--text3)">→</span>
            ${tInput(sh.partido1.end,'partido1','end')}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:6px">🔀 Turno partido — 2ª parte</div>
          <div style="display:flex;gap:8px;align-items:center">
            ${tInput(sh.partido2.start,'partido2','start')}
            <span style="color:var(--text3)">→</span>
            ${tInput(sh.partido2.end,'partido2','end')}
          </div>
        </div>
      </div>
    </div>

    <!-- Personas por día -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-users"></i> Personal necesario por día</span>
        <span style="font-size:11px;color:var(--text3)">El partido cuenta para comida y cena → minimiza total</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Día</th>
          <th style="text-align:center">Comida (total)</th>
          <th style="text-align:center">Cena (total)</th>
          <th style="text-align:center">Partidos</th>
          <th>Resultado</th>
        </tr></thead>
        <tbody>${rulesRows}</tbody>
      </table></div>
    </div>

    <!-- Encargados y restricciones -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-user-tie"></i> Encargados</span></div>
      <div style="padding:16px">
        <p style="font-size:12px;color:var(--text3);margin-bottom:10px">Los encargados nunca se asignan al mismo turno. Selecciona quiénes son:</p>
        <select multiple style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:8px;border-radius:6px;font-size:13px;min-width:250px;height:120px" id="encSel" onchange="updateEncargados()">
          ${DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}"${cfg.encargados.includes(e.id)?' selected':''}>${e.name}</option>`).join('')}
        </select>
        <p style="font-size:11px;color:var(--text3);margin-top:6px">Mantén Cmd/Ctrl para seleccionar varios</p>
      </div>
    </div>

    <!-- Pares que no pueden coincidir -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-ban"></i> Empleados que no pueden coincidir en el mismo turno</span>
        <button class="btn btn-secondary btn-sm" onclick="addNoPair()"><i class="fa fa-plus"></i> Añadir regla</button>
      </div>
      <div style="padding:16px" id="noPairsContainer">
        ${cfg.noCoincide.length ? noPairs : '<p style="font-size:13px;color:var(--text3)">Sin restricciones configuradas.</p>'}
      </div>
    </div>

  </div>`;
}

function pgAssignRules(){
  const cfg=getPlanConfig();
  const rules=cfg.assignRules||[];
  const now=new Date();
  const selM=_store.getItem('needs_m')||(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));
  const analysis=analyzeStaffingNeeds(selM);

  // Month selector options
  const monthOpts=[];
  for(let i=-1;i<=6;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    const v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    monthOpts.push(`<option value="${v}"${v===selM?' selected':''}>${d.toLocaleString('es-ES',{month:'long',year:'numeric'})}</option>`);
  }

  const ruleCards=rules.length?rules.map((r,i)=>{
    const type=RULE_TYPES.find(t=>t.id===r.type)||RULE_TYPES[0];
    const empNames=(r.employees||[]).map(id=>{const e=DB.employees.find(x=>x.id===id);return e?e.name.split(' ')[0]:'?';}).join(', ');
    return`<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border:1px solid var(--border2);border-radius:8px;background:var(--bg3);margin-bottom:8px">
      <i class="fa ${type.icon}" style="color:${type.color};font-size:18px;margin-top:2px"></i>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${r.label||type.label}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${type.desc}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:4px">
          ${empNames?`<span style="background:var(--bg2);padding:2px 8px;border-radius:4px;margin-right:4px">👥 ${empNames}</span>`:''}
          ${r.type==='rest_min'?`<span style="background:var(--bg2);padding:2px 8px;border-radius:4px">⏱ ${r.hours||10}h mínimo</span>`:''}
          ${r.type==='strong_day'?`<span style="background:var(--bg2);padding:2px 8px;border-radius:4px">📅 ${r.dows?['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].filter((_,i)=>r.dows.includes(i)).join(', '):'Todos'}</span>`:''}
          <span class="badge badge-${r.active!==false?'green':'gray'}" style="margin-left:4px">${r.active!==false?'Activa':'Pausada'}</span>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="toggleAssignRule(${i})" title="${r.active!==false?'Pausar':'Activar'}">
          <i class="fa fa-${r.active!==false?'pause':'play'}"></i>
        </button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteAssignRule(${i})"><i class="fa fa-trash"></i></button>
      </div>
    </div>`;
  }).join(''):`<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">Sin reglas configuradas.</div>`;

  return`<div class="page-header">
    <div><h2><i class="fa fa-shield-halved"></i> Reglas de asignación</h2>
    <p>Condiciones para el autoplanificador · Análisis de plantilla</p></div>
    <div class="page-actions">
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px"
        onchange="_store.setItem('needs_m',this.value);go('assignRules')">${monthOpts.join('')}</select>
      <button class="btn btn-primary btn-sm" onclick="newAssignRuleMdl()"><i class="fa fa-plus"></i> Nueva regla</button>
    </div>
  </div>
  <div class="page-body" style="display:flex;flex-direction:column;gap:16px">

    <!-- Análisis de plantilla vs necesidades -->
    ${analysis ? renderStaffingAnalysis(analysis) : ''}

    <!-- Temporadas de necesidades de personal -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-calendar-days"></i> Necesidades de personal por temporada</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm" onclick="newSeasonMdl()"><i class="fa fa-plus"></i> Nueva temporada</button>
        </div>
      </div>
      ${renderSeasonsTable()}
    </div>

    <!-- Reglas activas -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-list-check"></i> Reglas configuradas</span>
        <span style="font-size:11px;color:var(--text3)">${rules.filter(r=>r.active!==false).length} activas</span>
      </div>
      <div style="padding:12px 16px">${ruleCards}</div>
    </div>

    <!-- Tipos disponibles -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-circle-info"></i> Tipos de regla disponibles</span></div>
      <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        ${RULE_TYPES.map(t=>`<div style="padding:10px 12px;background:var(--bg3);border-radius:8px;border-left:3px solid ${t.color}">
          <div style="font-weight:500;font-size:12px;margin-bottom:3px"><i class="fa ${t.icon}" style="color:${t.color}"></i> ${t.label}</div>
          <div style="font-size:11px;color:var(--text3)">${t.desc}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function pgOptimalStaff(){
  const now=new Date();
  const selY=parseInt(_store.getItem('opt_y')||now.getFullYear());
  const selM=parseInt(_store.getItem('opt_m')||now.getMonth()+2); // siguiente mes por defecto
  const months=[];
  for(let m=1;m<=12;m++) months.push({m,label:new Date(selY,m-1,1).toLocaleString('es-ES',{month:'long'})});

  const res=calcOptimalStaff(selY,selM);

  const opRows=res.opciones.map((op,i)=>{
    const pct=res.ventasEstimadas>0?Math.round(op.coste/res.ventasEstimadas*100):0;
    const ok=op.coste<=res.budgetLaboral;
    return`<tr style="${i===0?'background:var(--bg3)':''}">
      <td style="font-weight:${i===0?'600':'400'}">${op.label} ${i===0?'<span class="badge badge-green">Recomendado</span>':''}</td>
      <td style="text-align:center"><span style="background:var(--accent);color:#fff;padding:2px 10px;border-radius:12px;font-weight:600">${op.nJC}</span> × 40h</td>
      <td style="text-align:center"><span style="background:var(--teal);color:#fff;padding:2px 10px;border-radius:12px;font-weight:600">${op.nJP}</span> × 20h</td>
      <td style="text-align:center;font-weight:600">${op.personas} personas</td>
      <td class="td-mono" style="color:${ok?'var(--green)':'var(--red)'}">${eur(op.coste)}</td>
      <td class="td-mono" style="color:${ok?'var(--green)':'var(--red)'}">${pct}%</td>
      <td><span class="badge badge-${ok?'green':'red'}">${ok?'✓ En presupuesto':'⚠ Supera'}${!ok?` +${eur(op.coste-res.budgetLaboral)}`:''}</span></td>
    </tr>`;
  }).join('');

  // Resumen por semana de necesidades
  const weekSummary=[1,2,3,4,5,6,0].map(dow=>{
    const rule=getPlanConfig().rules[dow];
    const dow_label=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][dow];
    const total=(rule.c-rule.p)+rule.p+(rule.n-rule.p);
    return`<tr>
      <td style="font-weight:500">${dow_label}</td>
      <td style="text-align:center">${rule.p}</td>
      <td style="text-align:center">${rule.c-rule.p}</td>
      <td style="text-align:center">${rule.n-rule.p}</td>
      <td style="text-align:center;font-weight:600;color:var(--accent)">${total}</td>
    </tr>`;
  }).join('');

  return`<div class="page-header">
    <div><h2><i class="fa fa-calculator"></i> Plantilla óptima</h2>
    <p>Calcula la estructura de personal ideal según ventas y presupuesto laboral</p></div>
    <div class="page-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px"
        onchange="_store.setItem('opt_m',this.value);go('optimalStaff')">
        ${months.map(m=>`<option value="${m.m}"${m.m===selM?' selected':''}>${m.label}</option>`).join('')}
      </select>
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:6px 10px;border-radius:6px;font-size:13px"
        onchange="_store.setItem('opt_y',this.value);go('optimalStaff')">
        ${[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(y=>`<option value="${y}"${y===selY?' selected':''}>${y}</option>`).join('')}
      </select>
      <button class="btn btn-accent btn-sm" onclick="genScheduleFromOptimal(${selY},${selM})">
        <i class="fa fa-wand-magic-sparkles"></i> Generar cuadrante
      </button>
    </div>
  </div>
  <div class="page-body" style="display:flex;flex-direction:column;gap:16px">

    <!-- KPIs -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-label">Ventas estimadas</div>
        <div class="kpi-val">${eur(res.ventasEstimadas)}</div>
        <div class="kpi-sub" style="color:var(--text3)">Fuente: ${res.fuente}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Budget laboral (${Math.round((DB.obj&&DB.obj.laborPct)||30)}%)</div>
        <div class="kpi-val">${eur(res.budgetLaboral)}</div>
        <div class="kpi-sub">Máximo recomendado</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Horas necesarias</div>
        <div class="kpi-val">${res.hrsTotales}h</div>
        <div class="kpi-sub">${res.hrsComida}h comida · ${res.hrsCena}h cena · ${res.hrsPartido}h partido</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Vacaciones en el mes</div>
        <div class="kpi-val">${res.vacInMes}</div>
        <div class="kpi-sub">Periodos activos</div>
      </div>
    </div>

    <!-- Opciones de plantilla -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-users"></i> Opciones de plantilla</span>
        <span style="font-size:11px;color:var(--text3)">Coste hora estimado: ~12€/h (bruto + SS)</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Opción</th><th style="text-align:center">Jornada completa</th><th style="text-align:center">Media jornada</th><th style="text-align:center">Total</th><th>Coste mensual</th><th>% ventas</th><th>Estado</th></tr></thead>
        <tbody>${opRows}</tbody>
      </table></div>
    </div>

    <!-- Distribución semanal -->
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="fa fa-calendar-week"></i> Necesidades por día de semana</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Día</th><th style="text-align:center">Turno partido</th><th style="text-align:center">Solo comida</th><th style="text-align:center">Solo cena</th><th style="text-align:center">Total personas/día</th></tr></thead>
        <tbody>${weekSummary}</tbody>
      </table></div>
    </div>

    <!-- Cómo se generará el cuadrante -->
    <div class="card" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title"><i class="fa fa-circle-info"></i> Cómo se genera el cuadrante</span></div>
      <div style="padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:12px;color:var(--text2)">
        <div><div style="font-weight:600;color:var(--text);margin-bottom:4px">👥 Plantilla actual</div>
          ${DB.employees.filter(e=>e.active&&!e.sick).map(e=>`<div style="padding:2px 0">${e.name} · ${e.wh}h${e.type==='part'&&e.fs&&e.fs.length?` · días fijos`:''}</div>`).join('')}
        </div>
        <div><div style="font-weight:600;color:var(--text);margin-bottom:4px">📋 Reglas activas</div>
          <div>5 días/semana máx. (convenio)</div>
          <div>Vacaciones: ${DB.vacations.filter(v=>v.status!=='rejected'&&(v.start.slice(0,7)===selY+'-'+String(selM).padStart(2,'0')||v.end.slice(0,7)===selY+'-'+String(selM).padStart(2,'0'))).length} periodos aprobados</div>
          ${(getPlanConfig().assignRules||[]).filter(r=>r.active!==false).map(r=>`<div>${r.label||r.type}</div>`).join('')}
        </div>
        <div><div style="font-weight:600;color:var(--text);margin-bottom:4px">⚙️ Config. turnos</div>
          <div>Comida: ${getPlanConfig().shifts.comida.start}–${getPlanConfig().shifts.comida.end}</div>
          <div>Cena: ${getPlanConfig().shifts.cena.start}–${getPlanConfig().shifts.cena.end}</div>
          <div>Partido: ${getPlanConfig().shifts.partido1.start}–${getPlanConfig().shifts.partido1.end} y ${getPlanConfig().shifts.partido2.start}–${getPlanConfig().shifts.partido2.end}</div>
        </div>
      </div>
    </div>

    ${res.fuente!=='real'?`<div class="alert-item warning" style="margin:0"><i class="fa fa-triangle-exclamation alert-icon"></i><div><div class="alert-msg">No hay ventas reales para ${new Date(selY,selM-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'})}.</div><div class="alert-meta">Importa el Export-13 de ese mes o ajusta las ventas previstas en Objetivos para mejorar el cálculo.</div></div></div>`:''}

  </div>`;
}

function newAssignRuleMdl(){
  const empOpts=DB.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  const typeOpts=RULE_TYPES.map(t=>`<option value="${t.id}">${t.label}</option>`).join('');
  const dowOpts=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d,i)=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer"><input type="checkbox" value="${i}" class="dow-check" checked style="accent-color:var(--accent)"> ${d}</label>`).join('');
  modal(`<div class="modal" style="max-width:460px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-shield-halved"></i> Nueva regla de asignación</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
      <div>
        <label style="font-size:12px;color:var(--text3)">Nombre de la regla (opcional)</label>
        <input type="text" id="rLabel" placeholder="Ej: Encargados separados" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;color:var(--text3)">Tipo de regla</label>
        <select id="rType" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px" onchange="toggleRuleFields(this.value)">
          ${typeOpts}
        </select>
      </div>
      <div id="rEmpSection">
        <label style="font-size:12px;color:var(--text3)">Empleados afectados <span style="color:var(--text2)">(Cmd/Ctrl para varios)</span></label>
        <select multiple id="rEmps" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;height:110px">
          ${empOpts}
        </select>
      </div>
      <div id="rHoursSection" style="display:none">
        <label style="font-size:12px;color:var(--text3)">Horas mínimas de descanso entre turnos</label>
        <input type="number" id="rHours" value="10" min="8" max="24" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
      </div>
      <div id="rDowSection" style="display:none">
        <label style="font-size:12px;color:var(--text3)">Días de la semana donde aplica</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">${dowOpts}</div>
      </div>
      <div style="background:var(--bg3);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text3)" id="rDesc">Selecciona un tipo para ver la descripción.</div>
    </div>
    <div class="modal-footer" style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveAssignRule()"><i class="fa fa-check"></i> Guardar regla</button>
    </div>
  </div>`);
  toggleRuleFields('coverage');
}

function saveAssignRule(){
  const type=document.getElementById('rType').value;
  const label=document.getElementById('rLabel').value.trim();
  const empsSel=document.getElementById('rEmps');
  const employees=[...empsSel.selectedOptions].map(o=>parseInt(o.value));
  const hours=parseInt(document.getElementById('rHours')?.value||10);
  const dowChecks=document.querySelectorAll('.dow-check:checked');
  const dows=[...dowChecks].map(c=>parseInt(c.value));

  if((type==='coverage'||type==='separate'||type==='prefer_sep')&&employees.length<2){
    alert('Selecciona al menos 2 empleados para esta regla');return;
  }
  if(type==='strong_day'&&employees.length<1){
    alert('Selecciona al menos 1 empleado');return;
  }

  const rule={type,label,employees,active:true};
  if(type==='rest_min') rule.hours=hours;
  if(type==='strong_day') rule.dows=dows;

  getPlanConfig().assignRules.push(rule);
  save();
  audit('assign_rule',`Regla añadida: ${label||type} (${type})`);
  flash('✓ Regla guardada');
  closeModal();
  go('assignRules');
}

function toggleAssignRule(i){
  const rules=getPlanConfig().assignRules;
  if(!rules[i])return;
  rules[i].active=rules[i].active===false?true:false;
  save();
  go('assignRules');
}

function deleteAssignRule(i){
  const rules=getPlanConfig().assignRules;
  if(!confirm(`¿Eliminar esta regla?`))return;
  rules.splice(i,1);
  save();
  audit('assign_rule',`Regla eliminada (índice ${i})`);
  go('assignRules');
}

function renderSeasonsTable(){
  if(!DB.staffSeasons) DB.staffSeasons=[];
  const t=today();
  const seasons=DB.staffSeasons.slice().sort((a,b)=>a.from.localeCompare(b.from));

  // Incluir siempre la temporada base del seed
  const hasSeed = typeof STAFF_NEEDS_SEED !== 'undefined';
  const seedActive = !seasons.some(s=>s.from<=t&&s.to>=t);

  if(!seasons.length && !hasSeed) return `<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">
    <i class="fa fa-calendar-plus" style="font-size:24px;display:block;margin-bottom:8px;color:var(--accent)"></i>
    Sin temporadas configuradas. Crea una para empezar.
  </div>`;

  const rows = seasons.map(s=>{
    const isActive = s.from<=t && s.to>=t;
    return`<tr style="${isActive?'background:rgba(79,124,255,.06)':''}">
      <td style="font-weight:${isActive?'700':'400'}">${s.name} ${isActive?'<span class="badge badge-green">Activa</span>':''}</td>
      <td style="font-family:var(--mono);font-size:12px">${s.from}</td>
      <td style="font-family:var(--mono);font-size:12px">${s.to}</td>
      <td style="font-size:12px;color:var(--text3)">${Object.keys(s.needs||{}).length} franjas horarias</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="viewSeasonMdl(${s.id})"><i class="fa fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm" onclick="editSeasonMdl(${s.id})"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteSeason(${s.id})"><i class="fa fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');

  const seedRow = hasSeed ? `<tr style="${seedActive?'background:rgba(79,124,255,.06)':'opacity:.6'}">
    <td style="font-weight:${seedActive?'700':'400'}">Base (Restalia) ${seedActive?'<span class="badge badge-green">Activa</span>':'<span class="badge badge-gray">Fallback</span>'}</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--text3)">siempre</td>
    <td style="font-family:var(--mono);font-size:12px;color:var(--text3)">siempre</td>
    <td style="font-size:12px;color:var(--text3)">${Object.keys(STAFF_NEEDS_SEED).length} franjas · desde Excel</td>
    <td></td>
  </tr>` : '';

  return`<div>
    <div style="padding:8px 16px 0;font-size:12px;color:var(--text2)">
      <i class="fa fa-circle-info" style="color:var(--accent)"></i>
      El autoplanificador usa la temporada vigente en la fecha del cuadrante. Si no hay ninguna activa, usa la base.
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Temporada</th><th>Desde</th><th>Hasta</th><th>Datos</th><th>Acciones</th></tr></thead>
      <tbody>${rows}${seedRow}</tbody>
    </table></div>
  </div>`;
}

function newSeasonMdl(prefillNeeds){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth()+1;
  const from=`${y}-${String(m).padStart(2,'0')}-01`;
  const to=`${y}-${String(m).padStart(2,'0')}-${new Date(y,m,0).getDate()}`;
  modal(`<div class="modal" style="max-width:420px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-calendar-plus"></i> Nueva temporada de personal</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div>
        <label style="font-size:12px;color:var(--text3)">Nombre</label>
        <input type="text" id="snName" placeholder="Ej: Temporada alta verano, Navidad, Base..." value="${prefillNeeds?'Temporada ':''}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
      </div>
      <div style="display:flex;gap:10px">
        <div style="flex:1"><label style="font-size:12px;color:var(--text3)">Desde</label>
          <input type="date" id="snFrom" value="${from}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
        <div style="flex:1"><label style="font-size:12px;color:var(--text3)">Hasta</label>
          <input type="date" id="snTo" value="${to}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      </div>
      <div>
        <label style="font-size:12px;color:var(--text3)">Tabla de necesidades (Excel .xlsx)</label>
        <label style="display:flex;align-items:center;gap:8px;margin-top:6px;padding:10px;background:var(--bg3);border:1px dashed var(--border2);border-radius:6px;cursor:pointer">
          <i class="fa fa-file-excel" style="color:var(--green)"></i>
          <span style="font-size:13px;color:var(--text2)" id="snFileName">Seleccionar archivo…</span>
          <input type="file" id="snFile" accept=".xlsx,.xls" style="display:none" onchange="document.getElementById('snFileName').textContent=this.files[0]?.name||'Seleccionar archivo…'">
        </label>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Mismo formato que el Excel de Restalia: filas=horas, columnas=días</div>
      </div>
      ${prefillNeeds?`<div style="background:rgba(79,124,255,.08);border:1px solid rgba(79,124,255,.2);border-radius:6px;padding:8px;font-size:12px;color:var(--text2)">
        <i class="fa fa-circle-info" style="color:var(--accent)"></i> Si no subes Excel, se usarán los datos actuales del seed base.
      </div>`:''}
    </div>
    <div class="modal-footer" style="justify-content:flex-end;display:flex;gap:8px">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveSeason()"><i class="fa fa-check"></i> Guardar temporada</button>
    </div>
  </div>`);
}

function saveSeason(){
  const name=document.getElementById('snName').value.trim();
  const from=document.getElementById('snFrom').value;
  const to=document.getElementById('snTo').value;
  const file=document.getElementById('snFile').files[0];
  if(!name||!from||!to){alert('Rellena nombre y fechas');return;}
  if(from>to){alert('La fecha de inicio debe ser anterior al final');return;}

  function doSave(needs){
    if(!DB.staffSeasons) DB.staffSeasons=[];
    const season={id:Date.now(), name, from, to, needs:needs||{}};
    DB.staffSeasons.push(season);
    DB.staffSeasons.sort((a,b)=>a.from.localeCompare(b.from));
    save();
    audit('staff_season',`Temporada creada: ${name} (${from}→${to})`);
    flash(`✓ Temporada "${name}" guardada`);
    closeModal();
    go('assignRules');
  }

  if(file){
    const r=new FileReader();
    r.onload=e=>{
      try{
        const wb=XLSX.read(e.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        const needs=parseStaffNeedsFromRows(rows);
        if(!needs){alert('No se pudo leer el archivo. Verifica el formato.');return;}
        doSave(needs);
      }catch(err){alert('Error: '+err.message);}
    };
    r.readAsArrayBuffer(file);
  } else {
    // Sin archivo: usar seed base como punto de partida
    doSave(typeof STAFF_NEEDS_SEED!=='undefined'?{...STAFF_NEEDS_SEED}:{});
  }
}

function deleteSeason(id){
  if(!confirm('¿Eliminar esta temporada?'))return;
  DB.staffSeasons=DB.staffSeasons.filter(s=>s.id!==id);
  save(); flash('✓ Temporada eliminada'); go('assignRules');
}

function viewSeasonMdl(id){
  const s=DB.staffSeasons.find(x=>x.id===id); if(!s)return;
  // Temporarily override getStaffNeeds to show this season's table
  const old=DB.staffSeasons;
  DB.staffNeeds=s.needs; // use legacy field for renderStaffNeedsTable
  modal(`<div class="modal" style="max-width:650px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-table"></i> ${s.name}</h3>
    <span style="font-size:12px;color:var(--text3)">${s.from} → ${s.to}</span></div>
    <div class="modal-body" style="padding:0">${renderStaffNeedsTable()}</div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  </div>`);
  DB.staffNeeds={}; // restore
}

function editSeasonMdl(id){
  const s=DB.staffSeasons.find(x=>x.id===id); if(!s)return;
  modal(`<div class="modal" style="max-width:420px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-pencil"></i> Editar temporada</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
      <div><label style="font-size:12px;color:var(--text3)">Nombre</label>
        <input type="text" id="snName" value="${s.name}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      <div style="display:flex;gap:10px">
        <div style="flex:1"><label style="font-size:12px;color:var(--text3)">Desde</label>
          <input type="date" id="snFrom" value="${s.from}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
        <div style="flex:1"><label style="font-size:12px;color:var(--text3)">Hasta</label>
          <input type="date" id="snTo" value="${s.to}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      </div>
      <div><label style="font-size:12px;color:var(--text3)">Actualizar tabla (opcional)</label>
        <label style="display:flex;align-items:center;gap:8px;margin-top:6px;padding:10px;background:var(--bg3);border:1px dashed var(--border2);border-radius:6px;cursor:pointer">
          <i class="fa fa-file-excel" style="color:var(--green)"></i>
          <span style="font-size:13px;color:var(--text2)" id="snFileName">Seleccionar nuevo Excel…</span>
          <input type="file" id="snFile" accept=".xlsx,.xls" style="display:none" onchange="document.getElementById('snFileName').textContent=this.files[0]?.name||'Seleccionar…'">
        </label></div>
    </div>
    <div class="modal-footer" style="justify-content:flex-end;display:flex;gap:8px">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="updateSeason(${id})"><i class="fa fa-check"></i> Guardar</button>
    </div>
  </div>`);
}

function updateSeason(id){
  const s=DB.staffSeasons.find(x=>x.id===id); if(!s)return;
  s.name=document.getElementById('snName').value.trim()||s.name;
  s.from=document.getElementById('snFrom').value||s.from;
  s.to=document.getElementById('snTo').value||s.to;
  const file=document.getElementById('snFile').files[0];
  function doUpdate(needs){
    if(needs) s.needs=needs;
    DB.staffSeasons.sort((a,b)=>a.from.localeCompare(b.from));
    save(); flash('✓ Temporada actualizada'); closeModal(); go('assignRules');
  }
  if(file){
    const r=new FileReader(); r.onload=e=>{
      try{const wb=XLSX.read(e.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        doUpdate(parseStaffNeedsFromRows(rows));
      }catch(err){alert('Error: '+err.message);}
    }; r.readAsArrayBuffer(file);
  } else doUpdate(null);
}

function renderStaffNeedsTable(){
  const needs=DB.staffNeeds&&Object.keys(DB.staffNeeds).length?DB.staffNeeds:getStaffNeeds(today());
  if(!Object.keys(needs).length) return '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px"><i class="fa fa-file-excel" style="font-size:24px;margin-bottom:8px;display:block;color:var(--teal)"></i>Sube el Excel de necesidades (formato: filas=horas, columnas=días de semana)</div>';
  const dows=[{d:1,l:'Lun'},{d:2,l:'Mar'},{d:3,l:'Mié'},{d:4,l:'Jue'},{d:5,l:'Vie'},{d:6,l:'Sáb'},{d:0,l:'Dom'}];
  const hours=Object.keys(needs).map(Number).sort((a,b)=>a-b);
  const maxVal=Math.max(...hours.flatMap(h=>dows.map(d=>needs[String(h)][String(d.d)]||0)));
  function heatColor(v){
    if(v===0)return 'var(--bg3)';
    const p=v/maxVal;
    if(p<0.3)return 'rgba(79,124,255,0.2)';
    if(p<0.6)return 'rgba(79,124,255,0.45)';
    if(p<0.8)return 'rgba(245,158,11,0.5)';
    return 'rgba(239,68,68,0.5)';
  }
  const rows=hours.map(h=>{
    const cells=dows.map(d=>{
      const v=needs[String(h)]&&needs[String(h)][String(d.d)]!=null?needs[String(h)][String(d.d)]:0;
      return '<td style="text-align:center;padding:5px;background:'+heatColor(v)+';font-family:var(--mono);font-size:12px;font-weight:'+(v>0?'600':'400')+';color:'+(v>0?'var(--text)':'var(--text3)')+'">'+( v||'—')+'</td>';
    }).join('');
    const nextH=(h+1)%24;
    return '<tr><td style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:5px 8px;white-space:nowrap">'+String(h).padStart(2,'0')+':00–'+String(nextH).padStart(2,'0')+':00</td>'+cells+'</tr>';
  }).join('');
  const totals=dows.map(d=>{
    const t=hours.reduce((a,h)=>a+(needs[String(h)]&&needs[String(h)][String(d.d)]?needs[String(h)][String(d.d)]:0),0);
    return '<td style="text-align:center;font-weight:700;font-family:var(--mono);font-size:12px;padding:5px;background:var(--bg3)">'+t+'</td>';
  }).join('');
  return '<div class="table-wrap"><table><thead><tr><th style="padding:5px 8px">Franja</th>'+dows.map(d=>'<th style="text-align:center;padding:5px">'+d.l+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td style="padding:5px 8px;font-weight:700;font-size:11px">Total p/hora</td>'+totals+'</tr></tfoot></table></div>';
}
