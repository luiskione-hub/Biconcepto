// ─── CUENTA DE RESULTADOS ───────────────────────────────────

function pgProfit(){
  const t=today();
  const days=[];
  for(let i=29;i>=0;i--){
    const d=new Date(t);d.setDate(d.getDate()-i);
    const ds=d.toISOString().split('T')[0];
    const ventas=salesOn(ds)||estSales(ds);
    const personal=laborOn(ds);
    const mmpp=ventas*(DB.obj&&DB.obj.mmppPct?DB.obj.mmppPct/100:RATIO_MMPP);
    const margen=ventas-personal-mmpp;
    days.push({ds,ventas,personal,mmpp,margen,real:salesOn(ds)>0});
  }
  const rows=days.slice().reverse().map(d=>`<tr>
    <td class="td-mono">${d.ds}</td><td>${dayN(d.ds).slice(0,3)}</td>
    <td class="td-mono" style="color:${d.real?'var(--green)':'var(--teal)'}">${eur(Math.round(d.ventas))}</td>
    <td class="td-mono" style="color:var(--amber)">${eur(Math.round(d.personal))}</td>
    <td class="td-mono" style="color:var(--text3)">${eur(Math.round(d.mmpp))}</td>
    <td class="td-mono" style="color:${d.margen>=0?'var(--green)':'var(--red)'}"><strong>${eur(Math.round(d.margen))}</strong></td>
  </tr>`).join('');
  return`<div class="page-header"><div><h2>Beneficio diario</h2><p>Últimos 30 días · Ventas − Personal − Materias primas</p></div></div>
  <div class="page-body"><div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Día</th><th>Ventas</th><th>Personal</th><th>MMPP</th><th>Margen</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="font-weight:700;background:var(--bg3)">
      <td colspan="2">TOTAL 30d</td>
      <td class="td-mono">${eur(Math.round(days.reduce((a,d)=>a+d.ventas,0)))}</td>
      <td class="td-mono">${eur(Math.round(days.reduce((a,d)=>a+d.personal,0)))}</td>
      <td class="td-mono">${eur(Math.round(days.reduce((a,d)=>a+d.mmpp,0)))}</td>
      <td class="td-mono" style="color:var(--green)"><strong>${eur(Math.round(days.reduce((a,d)=>a+d.margen,0)))}</strong></td>
    </tr></tfoot>
  </table></div></div></div>`;
}

function afProfit(){ /* charts rendered inline */ }

function pgResults(){
  const now=new Date(), curY=now.getFullYear();

  // Mapeo de categorías bancarias → partidas de gastos P&G
  // IMPORTANTE: los ingresos en P&G vienen de salesHistory (ventas reales),
  // NO del banco (que refleja cobros de TPV con retraso de días)
  const GASTO_MAP = {
    'nominas':      {label:'Nóminas',           grupo:'personal'},
    'seg_social':   {label:'Seguridad Social',   grupo:'personal'},
    'proveedores':  {label:'Materias primas',    grupo:'explotacion'},
    'alquiler':     {label:'Alquiler',           grupo:'explotacion'},
    'suministros':  {label:'Suministros',        grupo:'explotacion'},
    'impuestos':    {label:'Impuestos/AEAT',     grupo:'explotacion'},
    'asesoria':     {label:'Asesoría',           grupo:'explotacion'},
    'mantenimiento':{label:'Mantenimiento',      grupo:'explotacion'},
    'limpieza':     {label:'Limpieza',           grupo:'explotacion'},
    'banco':        {label:'Com. banco',         grupo:'explotacion'},
    'otros_gastos': {label:'Otros gastos',       grupo:'explotacion'},
  };
  const INGRESO_CATS = ['ventas_tpv','ventas_efectivo','delivery','otros_ingresos'];

  // Construir P&G mes a mes
  function buildPL(year){
    const pl = {};
    for(let m=1;m<=12;m++){
      pl[m] = {
        name: new Date(year,m-1,1).toLocaleString('es-ES',{month:'long'}),
        // Ingresos (de salesHistory Export-13)
        ventas: 0,
        // Gastos por categoría (del banco, sólo negativos)
        personal: 0, explotacion: 0,
        detalle: {}, // {categoria: importe}
        hasSales: false, hasBank: false
      };
    }

    // 1. Ventas reales desde salesHistory (Export-13 o histórico)
    const salesByMonth = {};
    DB.salesHistory.forEach(s=>{
      if(!s.date||s.date.length<10) return;
      const y=parseInt(s.date.slice(0,4));
      if(y!==year) return;
      const m=parseInt(s.date.slice(5,7));
      if(!salesByMonth[m]) salesByMonth[m]=0;
      salesByMonth[m]+=(s.amount||0);
    });
    Object.entries(salesByMonth).forEach(([m,v])=>{
      pl[parseInt(m)].ventas=v;
      pl[parseInt(m)].hasSales=true;
    });

    // 2. Gastos desde banco (sólo movimientos negativos categorizados como gasto)
    DB.bankMovements.forEach(mov=>{
      if(!mov.date||mov.date.length<7) return;
      const y=parseInt(mov.date.slice(0,4));
      if(y!==year) return;
      const m=parseInt(mov.date.slice(5,7));
      if(m<1||m>12) return;
      const cat=mov.category||'otros_gastos';
      const amt=mov.amount||0;

      // Ignorar ingresos bancarios (TPV, etc.) — ya usamos salesHistory para ventas
      if(INGRESO_CATS.includes(cat)) return;
      // Ignorar movimientos positivos que no son gastos
      if(amt>0&&cat==='otros_ingresos') return;

      const map=GASTO_MAP[cat];
      if(!map) return;

      // Los gastos en banco son negativos — los acumulamos como negativos
      if(!pl[m].detalle[cat]) pl[m].detalle[cat]=0;
      pl[m].detalle[cat]+=amt; // mantener signo original (negativo)
      if(map.grupo==='personal') pl[m].personal+=amt;
      else pl[m].explotacion+=amt;
      pl[m].hasBank=true;
    });

    // 3. Meses sin datos reales → usar FULL_PL histórico
    Object.entries(FULL_PL).forEach(([mStr,fpl])=>{
      const m=parseInt(mStr);
      if(!pl[m].hasSales&&!pl[m].hasBank&&fpl){
        pl[m].ventas=fpl.tpv||0;
        pl[m].personal=(fpl.nom||0)+(fpl.ss||0); // ya son negativos en FULL_PL
        pl[m].explotacion=(fpl.ali||0)+(fpl.alq||0)+(fpl.luz||0)+(fpl.imp||0)+(fpl.ase||0)+(fpl.mnt||0)+(fpl.lim||0)+(fpl.ban||0)+(fpl.oex||0);
        pl[m].hasSales=true; pl[m].hasBank=true; pl[m]._src='historical';
      }
    });

    return pl;
  }

  const pl=buildPL(curY);
  const mesesConDatos=Object.entries(pl)
    .filter(([,d])=>d.hasSales||d.hasBank)
    .sort((a,b)=>parseInt(a[0])-parseInt(b[0]));

  function resultado(d){ return d.ventas+d.personal+d.explotacion; }
  function pctLab(d){ return d.ventas>0?Math.round(Math.abs(d.personal)/d.ventas*100):0; }
  function pctGas(d){ return d.ventas>0?Math.round(Math.abs(d.explotacion)/d.ventas*100):0; }

  const rows=mesesConDatos.map(([mStr,d])=>{
    const m=parseInt(mStr);
    const res=resultado(d);
    const src=d._src==='historical'
      ?'<span class="badge badge-gray" style="font-size:9px" title="Datos históricos">hist</span>'
      :d.hasSales&&d.hasBank?'<span class="badge badge-green" style="font-size:9px">✓ real</span>'
      :d.hasSales?'<span class="badge badge-amber" style="font-size:9px">solo ventas</span>'
      :'<span class="badge badge-amber" style="font-size:9px">solo banco</span>';
    return`<tr>
      <td style="font-weight:600">${d.name} ${src}</td>
      <td class="td-mono" style="color:var(--green)">${eur(Math.round(d.ventas))}</td>
      <td class="td-mono" style="color:var(--amber)">${eur(Math.round(Math.abs(d.personal)))}<span style="font-size:10px;color:var(--text3)"> ${pctLab(d)}%</span></td>
      <td class="td-mono" style="color:var(--text2)">${eur(Math.round(Math.abs(d.explotacion)))}<span style="font-size:10px;color:var(--text3)"> ${pctGas(d)}%</span></td>
      <td class="td-mono" style="color:${res>=0?'var(--green)':'var(--red)'}"><strong>${eur(Math.round(res))}</strong></td>
      <td><button class="btn btn-secondary btn-sm btn-icon" onclick="showPLDetail(${m},${curY})" title="Ver detalle"><i class="fa fa-magnifying-glass"></i></button></td>
    </tr>`;
  }).join('');

  const totV=mesesConDatos.reduce((a,[,d])=>a+d.ventas,0);
  const totP=mesesConDatos.reduce((a,[,d])=>a+d.personal,0);
  const totG=mesesConDatos.reduce((a,[,d])=>a+d.explotacion,0);
  const totR=totV+totP+totG;
  const nReal=mesesConDatos.filter(([,d])=>d.hasSales&&d.hasBank&&!d._src).length;

  return`<div class="page-header">
    <div><h2>Cuenta de resultados ${curY}</h2>
    <p>${nReal} mes${nReal!==1?'es':''} con datos reales · Ventas de Export-13 · Gastos del banco</p></div>
    <div class="page-actions">
      <button class="btn btn-secondary btn-sm" onclick="go('importer')"><i class="fa fa-file-import"></i> Importar</button>
    </div>
  </div>
  <div class="page-body">
    ${nReal===0?`<div class="alert-item warning" style="margin-bottom:12px"><i class="fa fa-triangle-exclamation alert-icon"></i>
      <div><div class="alert-msg">Sin datos reales — mostrando histórico</div>
      <div class="alert-meta">Importa el Export-13 (ventas) y el extracto BBVA (gastos) para ver la P&G real actualizada.</div></div>
    </div>`:''}

    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="kpi-card"><div class="kpi-label">Ventas</div><div class="kpi-val" style="color:var(--green)">${eur(Math.round(totV))}</div></div>
      <div class="kpi-card"><div class="kpi-label">Personal</div><div class="kpi-val" style="color:var(--amber)">${eur(Math.round(Math.abs(totP)))}</div><div class="kpi-sub">${totV>0?Math.round(Math.abs(totP)/totV*100)+'%':''}</div></div>
      <div class="kpi-card"><div class="kpi-label">Otros gastos</div><div class="kpi-val">${eur(Math.round(Math.abs(totG)))}</div><div class="kpi-sub">${totV>0?Math.round(Math.abs(totG)/totV*100)+'%':''}</div></div>
      <div class="kpi-card"><div class="kpi-label">Resultado neto</div><div class="kpi-val" style="color:${totR>=0?'var(--green)':'var(--red)'}">${eur(Math.round(totR))}</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">P&G mensual</span>
        <div style="display:flex;gap:10px;font-size:11px;color:var(--text3)">
          <span style="color:var(--green)">● Ventas = Export-13</span>
          <span style="color:var(--amber)">● Gastos = banco BBVA</span>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Mes</th><th>Ventas</th><th>Personal</th><th>Otros gastos</th><th>Resultado</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="font-weight:700;background:var(--bg3)">
          <td>TOTAL</td>
          <td class="td-mono" style="color:var(--green)">${eur(Math.round(totV))}</td>
          <td class="td-mono" style="color:var(--amber)">${eur(Math.round(Math.abs(totP)))}</td>
          <td class="td-mono">${eur(Math.round(Math.abs(totG)))}</td>
          <td class="td-mono" style="color:${totR>=0?'var(--green)':'var(--red)'}"><strong>${eur(Math.round(totR))}</strong></td>
          <td></td>
        </tr></tfoot>
      </table></div>
    </div>
    <div id="plDetail" style="margin-top:16px"></div>
  </div>`;

function showPLDetail(m, year){
  const CAT_LABELS = {
    'nominas':'Nóminas','seg_social':'Seguridad Social','proveedores':'Materias primas',
    'alquiler':'Alquiler','suministros':'Suministros','impuestos':'Impuestos/AEAT',
    'asesoria':'Asesoría','mantenimiento':'Mantenimiento','limpieza':'Limpieza',
    'banco':'Com. banco','otros_gastos':'Otros gastos',
  };
  const INGRESO_CATS=['ventas_tpv','ventas_efectivo','delivery','otros_ingresos'];
  const mStr=year+'-'+String(m).padStart(2,'0');
  const mLabel=new Date(year,m-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'});

  // Ventas del mes (desde salesHistory)
  const ventasMes=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(mStr)).reduce((a,s)=>a+(s.amount||0),0);
  const nDiasVentas=DB.salesHistory.filter(s=>s.date&&s.date.startsWith(mStr)).length;

  // Gastos del banco (agrupados por categoría)
  const gastosMes=DB.bankMovements.filter(mv=>mv.date&&mv.date.startsWith(mStr)&&!INGRESO_CATS.includes(mv.category||''));
  const byCat={};
  gastosMes.forEach(mv=>{
    const cat=mv.category||'otros_gastos';
    if(!byCat[cat]) byCat[cat]={label:CAT_LABELS[cat]||cat,total:0,count:0,items:[]};
    byCat[cat].total+=mv.amount||0;
    byCat[cat].count++;
    byCat[cat].items.push(mv);
  });

  const totalGastos=gastosMes.reduce((a,mv)=>a+(mv.amount||0),0);
  const resultado=ventasMes+totalGastos;

  const catRows=Object.entries(byCat).sort((a,b)=>a[1].total-b[1].total).map(([cat,d])=>`
    <tr>
      <td style="font-size:12px;padding-left:24px">
        <details style="cursor:pointer">
          <summary style="list-style:none">${d.label} <span style="font-size:10px;color:var(--text3)">${d.count} mov.</span></summary>
          ${d.items.slice(0,5).map(mv=>`<div style="font-size:11px;color:var(--text3);padding:2px 0">${mv.date} · ${mv.description||''} · ${eur(mv.amount)}</div>`).join('')}
          ${d.items.length>5?`<div style="font-size:10px;color:var(--text3)">+${d.items.length-5} más...</div>`:''}
        </details>
      </td>
      <td class="td-mono" style="color:${d.total>=0?'var(--green)':'var(--red)'}">${eur(d.total)}</td>
      <td class="td-mono" style="font-size:10px;color:var(--text3)">${ventasMes>0?Math.round(Math.abs(d.total)/ventasMes*100)+'%':''}</td>
    </tr>`).join('');

  const el=document.getElementById('plDetail');
  if(!el) return;
  el.innerHTML=`<div class="card">
    <div class="card-header">
      <span class="card-title">Detalle P&G — ${mLabel}</span>
      <button class="btn btn-secondary btn-sm btn-icon" onclick="document.getElementById('plDetail').innerHTML=''"><i class="fa fa-xmark"></i></button>
    </div>
    <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;border-bottom:1px solid var(--border)">
      <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Ventas (Export-13)</div>
        <div style="font-size:18px;font-weight:700;color:var(--green)">${eur(Math.round(ventasMes))}</div>
        <div style="font-size:10px;color:var(--text3)">${nDiasVentas} días · ${nDiasVentas>0?eur(Math.round(ventasMes/nDiasVentas)):'-'}/día</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Total gastos (banco)</div>
        <div style="font-size:18px;font-weight:700;color:var(--red)">${eur(Math.round(totalGastos))}</div>
        <div style="font-size:10px;color:var(--text3)">${gastosMes.length} movimientos</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;border-left:3px solid ${resultado>=0?'var(--green)':'var(--red)'}">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Resultado</div>
        <div style="font-size:18px;font-weight:700;color:${resultado>=0?'var(--green)':'var(--red)'}">${eur(Math.round(resultado))}</div>
        <div style="font-size:10px;color:var(--text3)">${ventasMes>0?Math.round(resultado/ventasMes*100)+'% margen':''}</div>
      </div>
    </div>
    ${gastosMes.length?`<div class="table-wrap"><table>
      <thead><tr><th>Categoría de gasto</th><th>Importe</th><th>% ventas</th></tr></thead>
      <tbody>${catRows}</tbody>
      <tfoot><tr style="font-weight:700;background:var(--bg3)">
        <td>TOTAL GASTOS</td>
        <td class="td-mono" style="color:var(--red)">${eur(Math.round(totalGastos))}</td>
        <td class="td-mono">${ventasMes>0?Math.round(Math.abs(totalGastos)/ventasMes*100)+'%':'—'}</td>
      </tr></tfoot>
    </table></div>
    <div style="padding:8px 16px;font-size:11px;color:var(--text3);border-top:1px solid var(--border)">
      <i class="fa fa-circle-info"></i> Corrige las categorías en <a href="#" onclick="go('bank')" style="color:var(--accent)">Extracto bancario</a> para mejorar la precisión.
      ${nDiasVentas===0?'<span style="color:var(--amber)"> · Sin ventas importadas para este mes. Importa el Export-13.</span>':''}
    </div>`
    :`<div style="padding:20px;text-align:center;color:var(--text3)">Sin movimientos bancarios para ${mLabel}. <a href="#" onclick="go('importer')" style="color:var(--accent)">Importar extracto BBVA</a></div>`}
  </div>`;
  el.scrollIntoView({behavior:'smooth'});
}
  const CAT_MAP_INV = {
    'ventas_tpv':'Ventas TPV','ventas_efectivo':'Efectivo','delivery':'Delivery',
    'otros_ingresos':'Otros ingresos','nominas':'Nóminas','seg_social':'SS empresa',
    'proveedores':'Materias primas','alquiler':'Alquiler','suministros':'Suministros',
    'impuestos':'Impuestos','asesoria':'Asesoría','mantenimiento':'Mantenimiento',
    'limpieza':'Limpieza','banco':'Banco','otros_gastos':'Otros gastos',
  };
  const mStr = year+'-'+String(m).padStart(2,'0');
  const movs = DB.bankMovements.filter(v=>v.date&&v.date.startsWith(mStr)).sort((a,b)=>b.date.localeCompare(a.date));
  const mLabel = new Date(year,m-1,1).toLocaleString('es-ES',{month:'long',year:'numeric'});

  // Agrupar por categoría
  const byCat = {};
  movs.forEach(mv=>{
    const cat=mv.category||'otros_gastos';
    if(!byCat[cat]) byCat[cat]={label:CAT_MAP_INV[cat]||cat, total:0, count:0};
    byCat[cat].total+=mv.amount||0;
    byCat[cat].count++;
  });

  const catRows = Object.entries(byCat).sort((a,b)=>Math.abs(b[1].total)-Math.abs(a[1].total)).map(([cat,d])=>`
    <tr>
      <td style="font-size:12px">${d.label}</td>
      <td class="td-mono" style="color:${d.total>=0?'var(--green)':'var(--red)'}">${eur(d.total)}</td>
      <td style="font-size:11px;color:var(--text3)">${d.count} mov.</td>
    </tr>`).join('');

  const el=document.getElementById('plDetail');
  if(el) el.innerHTML=`<div class="card">
    <div class="card-header">
      <span class="card-title">Detalle ${mLabel}</span>
      <span style="font-size:12px;color:var(--text3)">${movs.length} movimientos bancarios</span>
    </div>
    ${movs.length?`<div class="table-wrap"><table>
      <thead><tr><th>Categoría</th><th>Total</th><th>Movimientos</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table></div>
    <div style="padding:8px 16px;font-size:11px;color:var(--text3);border-top:1px solid var(--border)">
      <i class="fa fa-circle-info"></i> Para corregir categorías ve a <a href="#" onclick="go('bank')" style="color:var(--accent)">Extracto bancario</a>
    </div>`
    :`<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">Sin movimientos bancarios para ${mLabel}. <a href="#" onclick="go('importer')" style="color:var(--accent)">Importar extracto</a></div>`}
  </div>`;
  el.scrollIntoView({behavior:'smooth'});
}

function showCatBreakdown(year){
  const CAT_GROUPS = {
    ingresos:['ventas_tpv','ventas_efectivo','delivery','otros_ingresos'],
    personal:['nominas','seg_social'],
    explotacion:['proveedores','alquiler','suministros','impuestos','asesoria','mantenimiento','limpieza','banco','otros_gastos'],
  };
  const CAT_LABELS = {
    'ventas_tpv':'Ventas TPV','ventas_efectivo':'Efectivo','delivery':'Delivery',
    'otros_ingresos':'Otros ingresos','nominas':'Nóminas','seg_social':'SS empresa',
    'proveedores':'Mat. primas','alquiler':'Alquiler','suministros':'Suministros',
    'impuestos':'Impuestos','asesoria':'Asesoría','mantenimiento':'Mantenimiento',
    'limpieza':'Limpieza','banco':'Banco','otros_gastos':'Otros gastos',
  };
  const totals = {};
  DB.bankMovements.filter(mv=>mv.date&&mv.date.startsWith(String(year))).forEach(mv=>{
    const cat=mv.category||'otros_gastos';
    totals[cat]=(totals[cat]||0)+(mv.amount||0);
  });
  const rows = Object.entries(totals).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(([cat,total])=>`
    <tr><td style="font-size:12px">${CAT_LABELS[cat]||cat}</td>
    <td class="td-mono" style="color:${total>=0?'var(--green)':'var(--red)'}">${eur(total)}</td></tr>`).join('');
  modal(`<div class="modal" style="max-width:380px">
    <div class="modal-header"><h3 class="modal-title">Gastos por categoría ${year}</h3></div>
    <div class="modal-body" style="padding:0"><div class="table-wrap"><table>
      <thead><tr><th>Categoría</th><th>Total</th></tr></thead>
      <tbody>${rows||'<tr><td colspan="2" style="text-align:center;color:var(--text3)">Sin datos bancarios</td></tr>'}</tbody>
    </table></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cerrar</button></div>
  </div>`);
}

function afResults(){ /* charts rendered inline */ }