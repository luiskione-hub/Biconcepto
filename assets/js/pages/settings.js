// ─── CONFIGURACIÓN ──────────────────────────────────────────

function pgUsers(){
  if(!DB.currentUser||DB.currentUser.role!=='admin') return `<div class="page-body"><div class="alert-item warning" style="margin:16px"><i class="fa fa-lock alert-icon"></i><div class="alert-msg">Solo el administrador puede gestionar usuarios y permisos.</div></div></div>`;
  if(!DB.rolePerms) DB.rolePerms={gerente:[],encargado:[],reader:[]};

  // Tabla de usuarios
  const userRows=DB.users.map(u=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px">${u.avatar}</div>
        <span style="font-weight:500">${u.name}</span>
      </div></td>
      <td><code style="background:var(--bg3);padding:2px 8px;border-radius:4px;font-size:12px">${u.user}</code></td>
      <td>
        <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:4px 8px;border-radius:6px;font-size:12px"
          onchange="changeUserRole(${u.id},this.value)" ${u.role==='admin'?'disabled':''}>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          <option value="gerente" ${u.role==='gerente'?'selected':''}>Gerente</option>
          <option value="encargado" ${u.role==='encargado'?'selected':''}>Encargado</option>
          <option value="reader" ${u.role==='reader'?'selected':''}>Solo lectura</option>
        </select>
      </td>
      <td>
        ${u.mustChange
          ?'<span style="font-size:11px;color:var(--amber);background:rgba(245,158,11,.1);padding:2px 8px;border-radius:10px"><i class="fa fa-triangle-exclamation"></i> Debe cambiar contraseña</span>'
          :'<span style="font-size:11px;color:var(--teal)"><i class="fa fa-circle-check"></i> Activo</span>'
        }
      </td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="changePassMdl(${u.id})"><i class="fa fa-key"></i> Contraseña</button>
        <button class="btn btn-secondary btn-sm" onclick="forceResetPass(${u.id})" title="Forzar cambio en próximo acceso"><i class="fa fa-rotate"></i> Forzar reset</button>
        ${u.role!=='admin'?`<button class="btn btn-danger btn-sm btn-icon" onclick="deleteUser(${u.id})" title="Eliminar usuario"><i class="fa fa-trash"></i></button>`:''}
      </td>
    </tr>`).join('');

  // Matriz de permisos por rol
  const permMatrix=ROLES.map(role=>{
    const perms=DB.rolePerms[role]||[];
    const cols=ALL_PAGES.map(p=>`
      <td style="text-align:center;padding:6px 4px">
        <input type="checkbox" ${p.id==='dashboard'?'checked disabled':perms.includes(p.id)?'checked':''}
          style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent)"
          onchange="togglePerm('${role}','${p.id}',this.checked)">
      </td>`).join('');
    return`<tr>
      <td style="font-weight:600;padding:8px 12px;white-space:nowrap;color:var(--text)">${ROLE_LABELS[role]}</td>
      ${cols}
    </tr>`;
  }).join('');

  const pageHeaders=ALL_PAGES.map(p=>`
    <th style="padding:6px 4px;text-align:center;font-size:10px;color:var(--text3);white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg);height:80px;vertical-align:bottom">
      <i class="fa ${p.icon}" style="font-size:9px"></i> ${p.label}
    </th>`).join('');

  return`<div class="page-header">
    <div><h2><i class="fa fa-user-shield"></i> Usuarios y permisos</h2>
    <p>Solo el administrador puede modificar estos ajustes</p></div>
  </div>
  <div class="page-body" style="display:flex;flex-direction:column;gap:16px">

    <!-- Usuarios -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-users"></i> Cuentas de acceso</span>
        <button class="btn btn-primary btn-sm" onclick="newUserMdl()"><i class="fa fa-plus"></i> Nuevo usuario</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${userRows}</tbody>
      </table></div>
    </div>

    <!-- Matriz de permisos -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-table"></i> Permisos por rol</span>
        <span style="font-size:11px;color:var(--text3)">Dashboard siempre visible. Admin tiene acceso total.</span>
      </div>
      <div class="table-wrap" style="overflow-x:auto">
        <table style="min-width:800px">
          <thead><tr>
            <th style="padding:8px 12px;text-align:left;min-width:110px">Rol</th>
            ${pageHeaders}
          </tr></thead>
          <tbody>${permMatrix}</tbody>
        </table>
      </div>
    </div>

    <!-- Log de auditoría -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa fa-clock-rotate-left"></i> Auditoría de cambios</span>
        <span style="font-size:11px;color:var(--text3)">${(DB.auditLog||[]).length} registros</span>
      </div>
      ${!(DB.auditLog||[]).length
        ?'<div style="padding:16px;color:var(--text3);font-size:13px">Sin registros todavía.</div>'
        :`<div class="table-wrap"><table>
          <thead><tr><th style="white-space:nowrap">Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>${(DB.auditLog||[]).slice(0,200).map(e=>{
            const icons={login:'fa-right-to-bracket',turno_añadido:'fa-calendar-plus',turno_eliminado:'fa-calendar-xmark',turno_modificado:'fa-calendar-pen',autoplan:'fa-wand-magic-sparkles',stock_añadido:'fa-box',stock_modificado:'fa-box-open',pass_change:'fa-key',pass_reset:'fa-rotate',usuario_creado:'fa-user-plus',usuario_eliminado:'fa-user-minus',rol_cambiado:'fa-user-gear'};
            const colors={turno_eliminado:'var(--red)',turno_añadido:'var(--teal)',autoplan:'var(--accent)',stock_añadido:'var(--teal)',stock_modificado:'var(--amber)',usuario_eliminado:'var(--red)',usuario_creado:'var(--teal)'};
            return'<tr>'
              +'<td class="td-mono" style="font-size:11px;color:var(--text3);white-space:nowrap">'+e.ts+'</td>'
              +'<td style="font-weight:500;font-size:12px">'+e.who+'</td>'
              +'<td><span style="font-size:11px;color:'+(colors[e.action]||'var(--text3)')+'"><i class="fa '+(icons[e.action]||'fa-circle')+'"></i> '+e.action.replace(/_/g,' ')+'</span></td>'
              +'<td style="font-size:12px;color:var(--text2)">'+(e.detail||'')+'</td>'
              +'</tr>';
          }).join('')}
          </tbody></table></div>`
      }
    </div>

  </div>`;
}

function pgLegal(){
  const c=DB.conv,r=DB.legal;
  const mes=Math.round((c.sal+c.plus)*(1+c.ss/100));
  const hora=hrate();
  return`<div class="page-header"><div><h2>Convenio laboral</h2><p>Hostelería Ceuta</p></div><div class="page-actions"><button class="btn btn-primary" onclick="saveLegal()"><i class="fa fa-check"></i> Guardar y recalcular</button></div></div>
  <div class="page-body">
    <div class="card"><div class="card-header"><span class="card-title">Tabla salarial</span></div>
      <div class="legal-grid">
        ${[['Salario base mensual','cv_sal',c.sal,'€/mes'],['Plus convenio Ceuta','cv_plus',c.plus,'€/mes'],['SS empresa %','cv_ss',c.ss,'%']].map(([l,id,v,u])=>`<div class="legal-item"><label>${l}</label><div class="legal-val"><input type="number" id="${id}" value="${v}" step="0.01"><span class="legal-unit">${u}</span></div></div>`).join('')}
        <div class="legal-item" style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15)"><label style="color:var(--green)">Resultado</label><div style="font-family:var(--mono);font-size:14px;color:var(--green)">${mes}€/mes · ${hora}€/h</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-header"><span class="card-title">Jornada y descansos</span></div>
      <div class="legal-grid">
        ${[['Horas máx. semanales','lr_mw',r.maxW,'h'],['Horas máx. diarias','lr_md',r.maxD,'h'],['Descanso entre jornadas','lr_mr',r.minR,'h'],['Descanso semanal','lr_mwr',r.minWR,'h'],['Días consecutivos máx.','lr_mc',r.maxC,'días'],['Vacaciones anuales','lr_vac',r.vac,'días']].map(([l,id,v,u])=>`<div class="legal-item"><label>${l}</label><div class="legal-val"><input type="number" id="${id}" value="${v}"><span class="legal-unit">${u}</span></div></div>`).join('')}
      </div>
    </div>
  </div>`;
}

function saveLegal(){
  DB.conv.sal  = parseFloat($('cv_sal').value)||DB.conv.sal;
  DB.conv.plus = parseFloat($('cv_plus').value)||DB.conv.plus;
  DB.conv.ss   = parseFloat($('cv_ss').value)||DB.conv.ss;
  DB.legal.maxW = parseInt($('lr_mw').value)||40;
  DB.legal.maxD = parseInt($('lr_md').value)||9;
  DB.legal.minR = parseInt($('lr_mr').value)||12;
  DB.legal.minWR= parseInt($('lr_mwr').value)||36;
  DB.legal.maxC = parseInt($('lr_mc').value)||6;
  DB.legal.vac  = parseInt($('lr_vac').value)||30;
  const hr=hrate();
  DB.employees.forEach(e=>{e.hc=hr;e.mc=e.type==='full'?Math.round(hr*40*52/12):Math.round(hr*20*52/12);});
  save();flash('Guardado y empleados actualizados');
  go('legal');
}

function pgCosts(){
  const active=DB.fixedCosts.filter(c=>c.active);
  const total=active.reduce((a,c)=>a+c.amount,0);
  const totalAll=DB.fixedCosts.reduce((a,c)=>a+c.amount,0);
  const fd=Math.round(total/26);
  return`<div class="page-header"><div><h2>Costes fijos</h2><p>Total activos: ${eur(Math.round(total))}/mes · ${eur(fd)}/día (÷26 días) · ${DB.fixedCosts.length} conceptos</p></div><div class="page-actions"><button class="btn btn-primary" onclick="costMdl()"><i class="fa fa-plus"></i> Añadir</button></div></div>
  <div class="page-body">
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="kpi-card green"><div class="kpi-label">Total mensual activos</div><div class="kpi-value" style="font-size:20px;color:var(--green)">${eur(Math.round(total))}</div></div>
      <div class="kpi-card"><div class="kpi-label">Total anual</div><div class="kpi-value" style="font-size:20px">${eur(Math.round(total*12))}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Coste diario (÷26)</div><div class="kpi-value" style="font-size:20px;color:var(--amber)">${eur(fd)}</div><div class="kpi-sub">Impacto en beneficio diario</div></div>
    </div>
    <div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Concepto</th><th style="text-align:right">€/mes</th><th style="text-align:right">€/año</th><th style="text-align:right">% total</th><th>Activo</th><th></th></tr></thead>
    <tbody>${DB.fixedCosts.map(c=>`<tr style="${!c.active?'opacity:.5':''}"><td class="td-bold">${c.name}</td><td class="td-mono" style="text-align:right">${eur(c.amount)}</td><td class="td-mono" style="text-align:right;color:var(--text3)">${eur(c.amount*12)}</td><td style="text-align:right"><span class="badge badge-gray">${totalAll>0?((c.amount/totalAll)*100).toFixed(1):0}%</span></td><td><input type="checkbox" ${c.active?'checked':''} onchange="DB.fixedCosts.find(x=>x.id===${c.id}).active=this.checked;save();go('costs')"></td><td style="display:flex;gap:4px"><button class="btn btn-secondary btn-sm btn-icon" onclick="costEditMdl(${c.id})"><i class="fa fa-pencil"></i></button><button class="btn btn-danger btn-sm btn-icon" onclick="if(confirm('¿Eliminar ${c.name}?')){DB.fixedCosts=DB.fixedCosts.filter(x=>x.id!==${c.id});save();go('costs')}"><i class="fa fa-trash"></i></button></td></tr>`).join('')}
    <tr style="font-weight:700;background:var(--bg3)"><td>TOTAL ACTIVOS</td><td class="td-mono" style="text-align:right;color:var(--green)">${eur(Math.round(total))}</td><td class="td-mono" style="text-align:right;color:var(--teal)">${eur(Math.round(total*12))}</td><td></td><td></td><td></td></tr>
    </tbody>
  </table></div></div></div>`;
}

function saveCostEdit(id){
  const c=DB.fixedCosts.find(x=>x.id===id);if(!c)return;
  c.name=$('cEN').value.trim()||c.name;
  c.amount=parseFloat($('cEA').value)||c.amount;
  save();flash();closeModal();go('costs');
}

function saveCost(){
  const n=$('cN').value.trim(),a=parseFloat($('cA').value)||0; if(!n)return;
  DB.fixedCosts.push({id:maxId(DB.fixedCosts),name:n,amount:a,active:true});
  save();flash();closeModal();go('costs');
}

function pgObjectives(){
  const o=DB.obj;
  return`<div class="page-header"><div><h2>Objetivos de negocio</h2></div><div class="page-actions"><button class="btn btn-primary" onclick="saveObj()"><i class="fa fa-check"></i> Guardar</button></div></div>
  <div class="page-body"><div class="card">
    ${[['Coste personal objetivo % ventas','obj_lp',o.laborPct,'%'],['Ventas mínimas diarias','obj_ms',o.minSales,'€'],['Ventas objetivo por empleado/hora','obj_sph',o.sph,'€']].map(([l,id,v,u])=>`<div class="obj-row"><div class="obj-label">${l}</div><input type="number" class="obj-input" id="${id}" value="${v}"><div class="obj-unit">${u}</div></div>`).join('')}
  </div></div>`;
}

function saveObj(){
  DB.obj.laborPct=$('obj_lp').value?parseFloat($('obj_lp').value):30;
  DB.obj.minSales=$('obj_ms').value?parseFloat($('obj_ms').value):1200;
  DB.obj.sph=$('obj_sph').value?parseFloat($('obj_sph').value):45;
  save();flash();
}

function pgStocks(){
  checkStockAlarm();
  const items=DB.stockItems;
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const curMonth=`stock_real_${y}_${String(m).padStart(2,'0')}`;
  const hasSnap=DB.stockSnapshots.some(s=>s.month===curMonth);
  // Resumen de alertas de stock
  const critical=items.filter(it=>it.minStock>0&&it.currentStock<it.minStock);
  const low=items.filter(it=>it.minStock>0&&it.currentStock>=it.minStock&&it.currentStock<it.targetStock*0.5);
  if(!items.length)return`<div class="page-header"><div><h2>Stocks</h2></div><div class="page-actions"><button class="btn btn-primary" onclick="go('importer')"><i class="fa fa-file-import"></i> Importar Logirest</button></div></div>
  <div class="page-body"><div class="card"><div class="empty-state"><i class="fa fa-boxes-stacking"></i><p>Sin datos de stock. Importa el histórico de pedidos de Logirest.</p>
    <div style="margin-top:16px"><label class="drop-zone" for="fLg" style="display:inline-block;cursor:pointer;padding:20px 40px"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span> PDFs Logirest</p></label><input type="file" id="fLg" accept=".pdf,.PDF" multiple style="display:none" onchange="impLogirest(this)"></div>
    <div id="rLogirest" style="margin-top:8px"></div>
  </div></div></div>`;

  return`<div class="page-header"><div><h2>Stocks</h2><p>${items.length} artículos · ${critical.length} críticos · ${low.length} bajos</p></div>
    <div class="page-actions">
      <button class="btn btn-secondary btn-sm" onclick="stockSnapshotMdl()"><i class="fa fa-camera"></i> Inventario real</button>
      <button class="btn btn-primary btn-sm" onclick="go('stockOrder')"><i class="fa fa-cart-plus"></i> Ver pedido sugerido</button>
      <button class="btn btn-secondary btn-sm" onclick="stockItemMdl()"><i class="fa fa-plus"></i> Artículo</button>
    </div>
  </div>
  <div class="page-body">
    ${!hasSnap?`<div class="alert-item warning" style="margin-bottom:16px"><i class="fa fa-triangle-exclamation alert-icon"></i><div style="flex:1"><div class="alert-msg">⚠️ Aún no has registrado el stock real de ${now.toLocaleString('es-ES',{month:'long',year:'numeric'})}</div><div class="alert-meta">Es importante actualizar el inventario mensualmente para que las sugerencias de pedido sean precisas.</div></div><button class="btn btn-primary btn-sm" onclick="stockSnapshotMdl()">Registrar ahora</button></div>`:''}
    ${critical.length?`<div class="alert-item error" style="margin-bottom:16px"><i class="fa fa-triangle-exclamation alert-icon"></i><div><div class="alert-msg">${critical.length} artículo${critical.length>1?'s':''} por debajo del stock mínimo</div><div class="alert-meta">${critical.map(i=>i.name).join(', ')}</div></div></div>`:''}
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-label">Artículos</div><div class="kpi-value" style="font-size:20px">${items.length}</div></div>
      <div class="kpi-card red"><div class="kpi-label">Stock crítico</div><div class="kpi-value" style="font-size:20px;color:var(--red)">${critical.length}</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Stock bajo</div><div class="kpi-value" style="font-size:20px;color:var(--amber)">${low.length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Último inventario</div><div class="kpi-value" style="font-size:14px">${DB.stockSnapshots.length?DB.stockSnapshots[DB.stockSnapshots.length-1].date:'—'}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Importar histórico Logirest</span></div>
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <label class="drop-zone" for="fLg2" style="display:inline-block;cursor:pointer;padding:16px 24px;flex:1;min-width:200px"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span> PDFs Logirest</p></label>
        <input type="file" id="fLg2" accept=".pdf,.PDF" multiple style="display:none" onchange="impLogirest(this)">
        <div id="rLogirest" style="flex:1"></div>
      </div>
    </div>
    <div class="card"><div class="card-header"><span class="card-title">Artículos</span><input type="text" class="form-control" id="stockSearch" placeholder="Buscar…" style="width:200px;padding:5px 10px" oninput="filterStockTable(this.value)"></div>
      <div class="table-wrap"><table id="stockTable"><thead><tr><th>Artículo</th><th>Ref.</th><th style="text-align:right">Stock actual</th><th style="text-align:right">Mínimo</th><th style="text-align:right">Objetivo</th><th style="text-align:right">Consumo/sem.</th><th style="text-align:right">Último pedido</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(it=>{
        const lastOrder=it.orders.length?it.orders.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
        const status=it.minStock>0&&it.currentStock<it.minStock?'red':it.minStock>0&&it.currentStock<it.targetStock*0.5?'amber':'green';
        const statusL=status==='red'?'Crítico':status==='amber'?'Bajo':'OK';
        return`<tr><td class="td-bold">${it.name}</td><td style="font-size:11px;color:var(--text3)">${it.ref||'—'}</td><td class="td-mono" style="text-align:right;color:var(--${status})">${it.currentStock} ${it.unit}</td><td class="td-mono" style="text-align:right">${it.minStock||'—'}</td><td class="td-mono" style="text-align:right">${it.targetStock||'—'}</td><td class="td-mono" style="text-align:right;color:var(--text2)">${it.avgConsumption||'—'}</td><td style="font-size:11px;color:var(--text3)">${lastOrder?lastOrder.date+' ('+lastOrder.qty+' '+it.unit+')':'—'}</td><td><span class="badge badge-${status}">${statusL}</span></td><td><button class="btn btn-secondary btn-sm btn-icon" onclick="stockItemMdl(${it.id})"><i class="fa fa-pencil"></i></button></td></tr>`;
      }).join('')}</tbody>
      </table></div>
    </div>
  </div>`;
}

function pgStockOrder(){
  const items=DB.stockItems;
  if(!items.length)return`<div class="page-header"><div><h2>Pedido sugerido</h2></div></div><div class="page-body"><div class="empty-state"><i class="fa fa-cart-plus"></i><p>Sin artículos. <a href="#" onclick="go('stocks')" style="color:var(--accent)">Importa primero el histórico de Logirest.</a></p></div></div>`;

  // Calcular sugerencia de pedido
  const suggestions=items.map(it=>{
    const recentOrders=it.orders.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
    const avgQty=recentOrders.length?recentOrders.reduce((a,o)=>a+o.qty,0)/recentOrders.length:0;
    const avgPrice=recentOrders.length?recentOrders.reduce((a,o)=>a+o.price,0)/recentOrders.length:0;
    const weeklyConsumption=it.avgConsumption||avgQty/2;
    const weeksStock=it.targetStock>0&&weeklyConsumption>0?it.currentStock/weeklyConsumption:99;
    // Sugerir si stock < objetivo o si han pasado >2 semanas sin pedir
    const lastOrder=recentOrders[0];
    const daysSinceOrder=lastOrder?Math.round((new Date()-new Date(lastOrder.date))/86400000):999;
    const needOrder=it.currentStock<it.targetStock||daysSinceOrder>14;
    const suggestedQty=needOrder?Math.max(0,Math.round((it.targetStock-it.currentStock+weeklyConsumption*2)*10)/10):0;
    return{...it,avgQty,avgPrice,weeklyConsumption,weeksStock:Math.round(weeksStock*10)/10,daysSinceOrder,needOrder,suggestedQty,estimatedCost:Math.round(suggestedQty*avgPrice*100)/100};
  }).filter(it=>it.orders.length>0);

  const toOrder=suggestions.filter(s=>s.needOrder&&s.suggestedQty>0);
  const totalCost=toOrder.reduce((a,s)=>a+s.estimatedCost,0);

  return`<div class="page-header"><div><h2>Pedido sugerido</h2><p>Basado en histórico de compras y stock actual · ${toOrder.length} artículos · ${eur(Math.round(totalCost))} estimado</p></div>
    <div class="page-actions">
      <button class="btn btn-secondary btn-sm" onclick="go('stocks')"><i class="fa fa-arrow-left"></i> Volver</button>
      <button class="btn btn-primary btn-sm" onclick="exportStockOrder()"><i class="fa fa-download"></i> Exportar lista</button>
    </div>
  </div>
  <div class="page-body">
    ${toOrder.length?`<div class="alert-item info" style="margin-bottom:16px;padding:10px 14px"><i class="fa fa-circle-info alert-icon"></i><div style="font-size:12px"><b>Cómo se calcula:</b> Se sugiere pedir cuando el stock actual es menor que el objetivo o han pasado más de 14 días desde el último pedido. La cantidad sugerida cubre (objetivo - actual + 2 semanas de consumo).</div></div>`:''}
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="kpi-card red"><div class="kpi-label">A pedir</div><div class="kpi-value" style="font-size:20px;color:var(--red)">${toOrder.length} artículos</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Coste estimado</div><div class="kpi-value" style="font-size:20px;color:var(--amber)">${eur(Math.round(totalCost))}</div></div>
      <div class="kpi-card"><div class="kpi-label">Artículos OK</div><div class="kpi-value" style="font-size:20px;color:var(--green)">${suggestions.length-toOrder.length}</div></div>
    </div>
    ${toOrder.length?`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title" style="color:var(--red)">Artículos a pedir</span></div>
      <div class="table-wrap"><table><thead><tr><th>Artículo</th><th style="text-align:right">Stock actual</th><th style="text-align:right">Objetivo</th><th style="text-align:right">Consumo/sem</th><th style="text-align:right">Semanas stock</th><th style="text-align:right">Cantidad sugerida</th><th style="text-align:right">Precio medio</th><th style="text-align:right">Coste estimado</th></tr></thead>
      <tbody>${toOrder.map(s=>`<tr><td class="td-bold">${s.name}</td><td class="td-mono" style="text-align:right;color:var(--red)">${s.currentStock} ${s.unit}</td><td class="td-mono" style="text-align:right">${s.targetStock||'—'}</td><td class="td-mono" style="text-align:right;color:var(--text2)">${s.weeklyConsumption}</td><td class="td-mono" style="text-align:right"><span class="badge badge-${s.weeksStock<1?'red':s.weeksStock<2?'amber':'gray'}">${s.weeksStock}sem</span></td><td class="td-mono" style="text-align:right;font-weight:600;color:var(--accent)">${s.suggestedQty} ${s.unit}</td><td class="td-mono" style="text-align:right;color:var(--text3)">${s.avgPrice>0?eur(s.avgPrice):'—'}</td><td class="td-mono" style="text-align:right;color:var(--amber)">${s.estimatedCost>0?eur(s.estimatedCost):'—'}</td></tr>`).join('')}
      <tr style="font-weight:700;background:var(--bg3)"><td colspan="7" style="text-align:right">Total estimado</td><td class="td-mono" style="text-align:right;color:var(--amber)">${eur(Math.round(totalCost))}</td></tr>
      </tbody></table>
    </div></div>`:'<div class="alert-item info" style="margin-bottom:16px"><i class="fa fa-circle-check alert-icon" style="color:var(--green)"></i><div class="alert-msg">¡Todo el stock está en niveles correctos!</div></div>'}
    ${suggestions.filter(s=>!s.needOrder||s.suggestedQty===0).length?`<div class="card"><div class="card-header"><span class="card-title" style="color:var(--green)">Artículos con stock OK</span></div>
      <div class="table-wrap"><table><thead><tr><th>Artículo</th><th style="text-align:right">Stock actual</th><th style="text-align:right">Objetivo</th><th style="text-align:right">Semanas stock</th><th>Último pedido</th></tr></thead>
      <tbody>${suggestions.filter(s=>!s.needOrder||s.suggestedQty===0).map(s=>{const lo=s.orders.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];return`<tr><td class="td-bold">${s.name}</td><td class="td-mono" style="text-align:right;color:var(--green)">${s.currentStock} ${s.unit}</td><td class="td-mono" style="text-align:right">${s.targetStock||'—'}</td><td class="td-mono" style="text-align:right"><span class="badge badge-green">${s.weeksStock}sem</span></td><td style="font-size:11px;color:var(--text3)">${lo?lo.date:'—'}</td></tr>`;}).join('')}
      </tbody></table>
    </div></div>`:''}
  </div>`;
}

function saveStockItem(id){
  const n=document.getElementById('siN').value.trim();if(!n){alert('Introduce nombre');return;}
  const data={name:n,ref:document.getElementById('siR').value.trim(),unit:document.getElementById('siU').value||'ud',currentStock:parseFloat(document.getElementById('siCS').value)||0,minStock:parseFloat(document.getElementById('siMS').value)||0,targetStock:parseFloat(document.getElementById('siTS').value)||0};
  if(id&&id!==null){
    const it=DB.stockItems.find(x=>x.id===id);
    if(it){Object.assign(it,data);audit('stock_modificado',`${n}`);}
  } else {
    data.id=maxId(DB.stockItems);data.orders=[];data.avgConsumption=0;data._cat='general';
    DB.stockItems.push(data);
    audit('stock_añadido',`${n}`);
  }
  save();flash();closeModal();go('stocks');
}

// MISSING: deleteStockItem

function saveStockSnapshot(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1;
  const key=`stock_real_${y}_${String(m).padStart(2,'0')}`;
  const entries={};
  document.querySelectorAll('.snap-input').forEach(inp=>{
    const id=parseInt(inp.dataset.id),val=parseFloat(inp.value)||0;
    entries[id]=val;
    const it=DB.stockItems.find(x=>x.id===id);
    if(it)it.currentStock=val;
  });
  DB.stockSnapshots.push({month:key,date:today(),entries});
  audit('stock_inventario',`Inventario real guardado — ${Object.keys(entries).length} artículos`);
  // Resolver alarma mensual
  DB.alerts.forEach(a=>{if(a._sk===key)a.done=true;});
  save();flash('Inventario guardado');updateBadge();closeModal();go('stocks');
}

// MISSING: saveStockOrder

// MISSING: receiveStockOrder

// MISSING: deleteStockOrder