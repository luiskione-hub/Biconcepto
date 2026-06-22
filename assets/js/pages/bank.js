// ─── EXTRACTO BANCARIO ──────────────────────────────────────

function pgBank(){
  const movs=DB.bankMovements.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const rows=movs.length?movs.slice(0,100).map(m=>`<tr>
    <td class="td-mono">${m.date}</td>
    <td>${sanitize(m.desc||'—')}</td>
    <td class="td-mono" style="color:${m.amount>=0?'var(--green)':'var(--red)'}">${eur(m.amount)}</td>
    <td>
      <select style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);padding:3px 6px;border-radius:4px;font-size:11px" onchange="updCat(${m.id},this.value)">
        ${['Ventas TPV','Nóminas','Alquiler','Suministros','Materias primas','Impuestos','Otros'].map(c=>`<option${m.category===c?' selected':''}>${c}</option>`).join('')}
      </select>
    </td>
  </tr>`).join(''):`<tr><td colspan="4" style="text-align:center;color:var(--text3)">Sin movimientos. Importa el extracto BBVA.</td></tr>`;
  const total=movs.reduce((a,m)=>a+(m.amount||0),0);
  return`<div class="page-header"><div><h2>Extracto bancario</h2><p>${movs.length} movimientos</p></div>
    <div class="page-actions"><button class="btn btn-secondary btn-sm" onclick="go('importer')"><i class="fa fa-file-import"></i> Importar BBVA</button></div>
  </div>
  <div class="page-body">
    <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr)">
      <div class="kpi-card"><div class="kpi-label">Saldo total</div><div class="kpi-val" style="color:${total>=0?'var(--green)':'var(--red)'}">${eur(total)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Movimientos</div><div class="kpi-val">${movs.length}</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="table-wrap"><table>
      <thead><tr><th>Fecha</th><th>Descripción</th><th>Importe</th><th>Categoría</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>
  </div>`;
}

function updCat(id,cat){const m=DB.bankMovements.find(x=>x.id===id);if(m){m.category=cat;save();}}