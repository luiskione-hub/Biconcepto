// ─── IMPORTADOR DE DATOS ────────────────────────────────────

function pgImporter(){
  const log=(DB._log||[]).slice().reverse().slice(0,10);
  return`<div class="page-header"><div><h2>Importar datos</h2></div></div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <i class="fa fa-cash-register" style="font-size:20px;color:var(--green)"></i>
          <div><div style="font-weight:500">Ventas Export-13 (Codisys)</div>
          <div style="font-size:11px;color:var(--text3)">Tickets detallados con fecha, hora e importe — <strong>formato recomendado</strong></div></div>
        </div>
        <label class="drop-zone" for="fS13" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label>
        <input type="file" id="fS13" accept=".xlsx,.xls" style="display:none" onchange="impSales13(this)">
        <div id="rS13" style="margin-top:8px"></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <i class="fa fa-cash-register" style="font-size:20px;color:var(--text3)"></i>
          <div><div style="font-weight:500">Facturación Export-8 (legacy)</div>
          <div style="font-size:11px;color:var(--text3)">NMes · NDia Semana · Total</div></div>
        </div>
        <label class="drop-zone" for="fS" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label>
        <input type="file" id="fS" accept=".xlsx,.xls" style="display:none" onchange="impSales(this)">
        <div id="rS" style="margin-top:8px"></div>
      </div>
      <div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><i class="fa fa-chart-bar" style="font-size:20px;color:var(--purple)"></i><div><div style="font-weight:500">Ventas por hora Export-10</div><div style="font-size:11px;color:var(--text3)">NUM Dia Semana · Tramo Hora · Total</div></div></div><label class="drop-zone" for="fH" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label><input type="file" id="fH" accept=".xlsx,.xls" style="display:none" onchange="impHourly(this)"><div id="rH" style="margin-top:8px"></div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><i class="fa fa-building-columns" style="font-size:20px;color:var(--accent)"></i><div><div style="font-weight:500">Extracto BBVA</div><div style="font-size:11px;color:var(--text3)">Histórico movimientos BBVA</div></div></div><label class="drop-zone" for="fB" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label><input type="file" id="fB" accept=".xlsx,.xls" style="display:none" onchange="impBank(this)"><div id="rB" style="margin-top:8px"></div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><i class="fa fa-boxes-stacking" style="font-size:20px;color:var(--amber)"></i><div><div style="font-weight:500">Histórico Logirest (Stocks)</div><div style="font-size:11px;color:var(--text3)">Albaranes PDF valorados de Logirest (varios a la vez)</div></div></div><label class="drop-zone" for="fLg3" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label><input type="file" id="fLg3" accept=".pdf,.PDF" multiple style="display:none" onchange="impLogirest(this)"><div id="rLogirest" style="margin-top:8px"></div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><i class="fa fa-user-clock" style="font-size:20px;color:var(--teal)"></i><div><div style="font-weight:500">Fichadas Jibble</div><div style="font-size:11px;color:var(--text3)">Informes → Tiempo registrado → Exportar XLS</div></div></div><label class="drop-zone" for="fJ" style="display:block;cursor:pointer"><i class="fa fa-cloud-arrow-up"></i><p>Arrastra o <span>selecciona</span></p></label><input type="file" id="fJ" accept=".xlsx,.xls" style="display:none" onchange="impJibble(this)"><div id="rJ" style="margin-top:8px"></div></div>
    </div>
    ${log.length?`<div class="card" style="margin-top:16px"><div class="card-header"><span class="card-title">Historial</span></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Registros</th><th></th></tr></thead><tbody>${log.map(l=>`<tr><td style="font-size:12px;color:var(--text3)">${l.ts}</td><td>${l.type}</td><td class="td-mono">${l.records}</td><td><span class="badge badge-${l.ok?'green':'red'}">${l.ok?'OK':'Error'}</span></td></tr>`).join('')}</tbody></table></div></div>`:''}
  </div>`;
}