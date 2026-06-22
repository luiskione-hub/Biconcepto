// ─── IMPORTACIÓN/EXPORTACIÓN DE DATOS ──────────────────────
// Depende de: XLSX (CDN), DB (state), utils/

function impSales13(inp){
  const file=inp.files[0]; if(!file)return;
  showR('rS13',true,'Leyendo archivo…');
  const r=new FileReader();
  r.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      if(!rows.length)throw new Error('Archivo vacío');

      const keys=Object.keys(rows[0]);
      const fk=(...n)=>keys.find(k=>n.some(x=>k.toLowerCase().includes(x.toLowerCase())));

      // Detectar columnas clave
      const kFecha=fk('fecha');
      const kHora=fk('hora');
      const kImporte=fk('importe');
      const kTicket=fk('ejenum','num','ticket');

      if(!kFecha||!kImporte) throw new Error(`Columnas no encontradas. Encontradas: ${keys.slice(0,8).join(', ')}`);

      // Agrupar por fecha real
      const byDate={};
      const byDateHour={};

      rows.forEach(row=>{
        const rawFecha=row[kFecha];
        const rawImporte=parseFloat(String(row[kImporte]).replace(',','.'))||0;
        if(!rawFecha||!rawImporte)return;

        // Parsear fecha
        let fechaStr;
        if(rawFecha instanceof Date){
          fechaStr=rawFecha.toISOString().slice(0,10);
        } else {
          const d=new Date(rawFecha);
          if(isNaN(d.getTime())){
            // Intentar parseo manual DD/MM/YYYY
            const parts=String(rawFecha).split(/[\/\-\.]/);
            if(parts.length===3){
              const [a,b,c]=parts;
              fechaStr=c.length===4?`${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`:
                                    `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
            }
          } else {
            fechaStr=d.toISOString().slice(0,10);
          }
        }
        if(!fechaStr)return;

        // Acumular importe diario
        if(!byDate[fechaStr]) byDate[fechaStr]={total:0,tickets:new Set()};
        byDate[fechaStr].total+=rawImporte;
        if(kTicket&&row[kTicket]) byDate[fechaStr].tickets.add(String(row[kTicket]));

        // Acumular por hora
        if(kHora){
          const hora=parseInt(String(row[kHora]).slice(0,2))||0;
          const hk=`${fechaStr}_${hora}`;
          if(!byDateHour[hk]) byDateHour[hk]={fecha:fechaStr,hora,total:0};
          byDateHour[hk].total+=rawImporte;
        }
      });

      // Guardar en salesHistory con fecha real
      let added=0, updated=0;
      Object.entries(byDate).forEach(([fecha,{total,tickets}])=>{
        const existing=DB.salesHistory.find(s=>s.date===fecha&&s._src==='exp13');
        if(existing){
          existing.amount=Math.round(total*100)/100;
          existing.tickets=tickets.size;
          updated++;
        } else {
          DB.salesHistory.push({
            id:maxId(DB.salesHistory),
            date:fecha,
            amount:Math.round(total*100)/100,
            tickets:tickets.size,
            _src:'exp13',
            _key:fecha
          });
          added++;
        }
      });

      // Actualizar HOURLY con datos reales por día de semana
      const hourlyAgg={};
      Object.values(byDateHour).forEach(({fecha,hora,total})=>{
        const dow=['D','L','M','X','J','V','S'][new Date(fecha).getDay()];
        const k=`${hora}_${dow}`;
        if(!hourlyAgg[k]) hourlyAgg[k]={hora,dow,vals:[]};
        hourlyAgg[k].vals.push(total);
      });
      Object.values(hourlyAgg).forEach(({hora,dow,vals})=>{
        const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
        if(!HOURLY[hora]) HOURLY[hora]={};
        HOURLY[hora][dow]=Math.round(avg);
      });

      save();
      logImp('Export-13',added+updated,true);
      audit('import_ventas',`Export-13: ${added} días nuevos, ${updated} actualizados`);
      recalcTrendFactors(); // recalcular factores con los nuevos datos
      showR('rS13',true,
        `✓ ${added} días importados${updated?`, ${updated} actualizados`:''}`,
        `<a href="#" onclick="go('sales')" style="color:var(--accent)">Ver ventas →</a>`
      );
      go('importer');
    }catch(err){
      logImp('Export-13',0,false);
      showR('rS13',false,'Error: '+err.message);
      console.error(err);
    }
  };
  r.readAsArrayBuffer(file);
}

function impSales(inp){
  const file=inp.files[0];if(!file)return;showR('rS',true,'Leyendo…');
  const r=new FileReader();r.onload=e=>{try{
    const wb=XLSX.read(e.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    if(!rows.length)throw new Error('Archivo vacío');
    const keys=Object.keys(rows[0]);const fk=(...n)=>keys.find(k=>n.some(x=>k.toLowerCase().includes(x.toLowerCase())));
    const kM=fk('nmes','mes'),kD=fk('ndia','dia semana'),kT=fk('total');
    if(!kM||!kD||!kT)throw new Error('Columnas no encontradas: '+keys.join(', '));
    const dM={1:'L',2:'M',3:'X',4:'J',5:'V',6:'S',7:'D'};
    const cy=new Date().getFullYear();let n=0;
    rows.forEach(row=>{
      const mes=parseInt(row[kM]),dia=parseInt(row[kD]),total=parseFloat(String(row[kT]).replace(',','.'))||0;
      if(!mes||!dia||!total)return;
      const key=`${cy}-${String(mes).padStart(2,'0')}-W${dia}`;
      if(DB.salesHistory.find(s=>s._key===key))return;
      DB.salesHistory.push({id:maxId(DB.salesHistory),date:key,weekday:dM[dia]||'L',amount:Math.round(total*100)/100,_key:key,_src:'exp8'});n++;
    });
    save();logImp('Export-8',n,true);
    showR('rS',true,`✓ ${n} registros importados`,'<a href="#" onclick="go(\'sales\')" style="color:var(--accent)">Ver ventas</a>');
    go('importer');
  }catch(err){logImp('Export-8',0,false);showR('rS',false,'Error: '+err.message);}};r.readAsArrayBuffer(file);
}

function impHourly(inp){
  const file=inp.files[0];if(!file)return;showR('rH',true,'Leyendo…');
  const r=new FileReader();r.onload=e=>{try{
    const wb=XLSX.read(e.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    const keys=Object.keys(rows[0]||{});const fk=(...n)=>keys.find(k=>n.some(x=>k.toLowerCase().includes(x.toLowerCase())));
    const kD=fk('num dia','ndia'),kS=fk('tramo','hora'),kT=fk('total');
    if(!kD||!kS||!kT)throw new Error('Columnas no encontradas: '+keys.join(', '));
    const dM={1:'L',2:'M',3:'X',4:'J',5:'V',6:'S',7:'D'};const agg={};
    rows.forEach(row=>{
      const dia=parseInt(row[kD]),slot=String(row[kS]).replace(/[><]/g,'').trim(),hour=parseInt(slot.split(':')[0]),total=parseFloat(String(row[kT]).replace(',','.'))||0;
      if(!dia||isNaN(hour)||!total)return;
      const key=dia+'_'+hour;if(!agg[key])agg[key]={dia,hour,total:0};agg[key].total+=total;
    });
    Object.values(agg).forEach(({dia,hour,total})=>{const d=dM[dia]||'L';if(!HOURLY[hour])HOURLY[hour]={};HOURLY[hour][d]=Math.round(total/34);});
    const n=Object.keys(agg).length;save();logImp('Export-10',n,true);
    showR('rH',true,`✓ Patrón horario actualizado (${n} franjas)`,'<a href="#" onclick="go(\'forecast\')" style="color:var(--accent)">Ver previsión</a>');
    go('importer');
  }catch(err){logImp('Export-10',0,false);showR('rH',false,'Error: '+err.message);}};r.readAsArrayBuffer(file);
}

function impBank(inp){
  const file=inp.files[0];if(!file)return;showR('rB',true,'Leyendo…');
  const r=new FileReader();r.onload=e=>{try{
    const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const all=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    let hi=-1;for(let i=0;i<all.length;i++){if(all[i].some(v=>String(v).toUpperCase().includes('CONTABLE'))){hi=i;break;}}
    if(hi<0)throw new Error('Cabecera BBVA no encontrada');
    const hdrs=all[hi].map(v=>String(v).trim().toUpperCase());
    const fc=(...n)=>hdrs.findIndex(h=>n.some(x=>h.includes(x)));
    const iD=fc('CONTABLE'),iC=fc('CONCEPTO'),iB=fc('BENEFICIARIO'),iO=fc('OBSERVACIONES'),iI=fc('IMPORTE');
    function pDate(v){if(v instanceof Date)return v.toISOString().split('T')[0];const s=String(v).trim();const m=s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:s.slice(0,10);}
    function pAmt(v){if(typeof v==='number')return v;try{return parseFloat(String(v).replace(' ','').replace('.','').replace(',','.'))}catch(e){return null;}}
    function autoCat(txt,amt){
      if(amt>0){if(/REMESA|TPV|COMERCIOS|BIZUM/.test(txt))return'ventas_tpv';if(/EFECTIVO/.test(txt))return'ventas_efectivo';if(/GLOVO|JUSTEAT|UBER/.test(txt))return'delivery';return'otros_ingresos';}
      if(/NOMINA|NÓMINA|PAGO DE NOMINAS/.test(txt))return'nominas';if(/TGSS|SEGURIDAD SOCIAL/.test(txt))return'seg_social';if(/CASA ROS|ALQUILER/.test(txt))return'alquiler';if(/IBERDROLA|ALUMBRADO|GASIB|TELEFONICA/.test(txt))return'suministros';if(/LOGIREST|SANTAELLA|CONTRERAS|JMAVI|COCA.COLA|HEINEKEN/.test(txt))return'proveedores';if(/TRIBUTOS|IMPUESTO|SERVICIOS TRIBUTARIOS/.test(txt))return'impuestos';if(/SYMBOL/.test(txt))return'asesoria';if(/OTIS|ELECTRONIC VALERO/.test(txt))return'mantenimiento';if(/LIMPIEZAS/.test(txt))return'limpieza';if(/COMISION|ADEUDO MENSUAL/.test(txt))return'banco';return'otros_gastos';
    }
    const SOCIOS=['UNPU GROUP','LUIS MAYORDOMO','REBECA CHACON','REBECA CHACÓN'];
    let n=0,dupes=0;
    all.slice(hi+1).forEach(row=>{
      const fecha=pDate(row[iD]),amt=pAmt(row[iI]);
      if(!fecha||amt===null||isNaN(amt))return;
      const conc=String(row[iC]||''),benef=String(row[iB]||'');
      const txt=(conc+' '+benef+' '+String(row[iO]||'')).toUpperCase();
      if(SOCIOS.some(s=>txt.includes(s)))return;
      const dk=`${fecha}_${amt}_${conc.slice(0,12)}`;
      if(DB.bankMovements.some(m=>m._k===dk)){dupes++;return;}
      DB.bankMovements.push({id:maxId(DB.bankMovements),date:fecha,description:(conc+' '+benef).trim().slice(0,80),amount:amt,type:amt>=0?'income':'expense',category:autoCat(txt,amt),_k:dk});n++;
    });
    DB.bankMovements.sort((a,b)=>b.date.localeCompare(a.date));
    save();logImp('BBVA',n,true);
    showR('rB',true,`✓ ${n} movimientos · ${dupes} duplicados omitidos`,'<a href="#" onclick="go(\'bank\')" style="color:var(--accent)">Ver movimientos</a>');
    go('importer');
  }catch(err){logImp('BBVA',0,false);showR('rB',false,'Error: '+err.message);}};r.readAsArrayBuffer(file);
}

function impJibble(inp){
  const file=inp.files[0];if(!file)return;showR('rJ',true,'Leyendo…');
  const r=new FileReader();r.onload=e=>{try{
    const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];const all=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    let hi=-1;for(let i=0;i<all.length;i++){const row=all[i].map(v=>String(v).toUpperCase());if(row.some(v=>v.includes('FECHA'))&&row.some(v=>v.includes('NOMBRE'))){hi=i;break;}}
    if(hi<0)throw new Error('Cabecera Jibble no encontrada');
    const hdrs=all[hi].map(v=>String(v).trim().toUpperCase());
    const fc=(...n)=>hdrs.findIndex(h=>n.some(x=>h.includes(x)));
    const iF=fc('FECHA'),iN=fc('NOMBRE'),iH=fc('HRS','REGISTRADAS'),iS=fc('EMPEZAR','START'),iE=fc('TERMINAR','END');
    function parseHM(s){if(!s)return 0;s=String(s);const m=s.match(/(\d+)h\s*(\d*)m?/);if(m)return Math.round((parseInt(m[1])||0+(parseInt(m[2])||0)/60)*100)/100;return 0;}
    function toHM(s){const m=String(s).match(/(\d{2}):(\d{2})/);return m?m[1]+':'+m[2]:'';}
    function toDate(s){const iso=String(s).match(/(\d{4}-\d{2}-\d{2})/);if(iso)return iso[1];const dmy=String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return dmy?`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`:''}
    const byED={};
    all.slice(hi+1).forEach(row=>{
      const emp=String(row[iN]||'').trim(),fecha=toDate(row[iF]);
      if(!emp||!fecha)return;
      const key=emp+'||'+fecha;if(!byED[key])byED[key]={emp,date:fecha,hrs:0,starts:[],ends:[]};
      byED[key].hrs+=parseHM(iH>=0?row[iH]:'');
      const st=toHM(iS>=0?row[iS]:''),en=toHM(iE>=0?row[iE]:'');
      if(st)byED[key].starts.push(st);if(en)byED[key].ends.push(en);
    });
    const records=Object.values(byED).map(d=>({emp:d.emp,date:d.date,total_hrs:Math.round(d.hrs*100)/100,first_in:d.starts.sort()[0]||'',last_out:d.ends.sort().reverse()[0]||'',_src:'jibble'}));
    const existing=DB.jibbleData.filter(x=>!records.some(r=>r.emp===x.emp&&r.date===x.date));
    DB.jibbleData=[...existing,...records].sort((a,b)=>a.date.localeCompare(b.date));
    save();logImp('Jibble',records.length,true);
    showR('rJ',true,`✓ ${records.length} fichadas importadas`,'<a href="#" onclick="go(\'jibble\')" style="color:var(--accent)">Ver comparativa</a>');
    go('importer');
  }catch(err){logImp('Jibble',0,false);showR('rJ',false,'Error: '+err.message);}};r.readAsArrayBuffer(file);
}

function impStaffNeeds(inp){
  const file=inp.files[0]; if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      let headerRow=-1, dowCols={};
      const dowNames={'lunes':1,'martes':2,'miércoles':3,'miercoles':3,'jueves':4,'viernes':5,'sábado':6,'sabado':6,'domingo':0};
      for(let i=0;i<Math.min(5,rows.length);i++){
        const found=rows[i].filter(c=>dowNames[String(c).toLowerCase().trim()]);
        if(found.length>=5){headerRow=i;break;}
      }
      if(headerRow<0){alert('No se encontraron los días de la semana');return;}
      rows[headerRow].forEach((c,i)=>{
        const k=dowNames[String(c).toLowerCase().trim()];
        if(k!==undefined) dowCols[i]=k;
      });
      const needs={};
      for(let i=headerRow+1;i<rows.length;i++){
        const row=rows[i];
        const horaStr=String(row[0]||'').trim();
        if(!horaStr||horaStr.toLowerCase().includes('total'))continue;
        const hMatch=horaStr.match(/^(\d{1,2})/);
        if(!hMatch)continue;
        let h=parseInt(hMatch[1]);
        if(h===24)h=0;
        needs[String(h)]={};
        Object.entries(dowCols).forEach(([col,dow])=>{
          needs[String(h)][String(dow)]=parseInt(row[col])||0;
        });
      }
      if(Object.keys(needs).length<5){alert('No se pudieron leer suficientes filas');return;}
      DB.staffNeeds=needs;
      save();
      audit('staff_needs',`Necesidades personal importadas: ${Object.keys(needs).length} franjas horarias`);
      checkStaffingAlarm();
      flash('✓ Necesidades importadas: '+Object.keys(needs).length+' franjas');
      go('assignRules');
    }catch(err){
      console.error(err);
      alert('Error al leer el archivo: '+err.message);
    }
  };
  r.readAsArrayBuffer(file);
}

async function impLogirest(inp){
  const files=Array.from(inp.files);
  if(!files.length)return;
  // Find all result elements with id rLogirest
  const rEls=document.querySelectorAll('[id^="rLogirest"]');
  const setStatus=(html)=>rEls.forEach(el=>el.innerHTML=html);
  setStatus(`<span style="color:var(--text2)"><i class="fa fa-spinner fa-spin"></i> Procesando ${files.length} PDF${files.length>1?'s':''}…</span>`);

  let totalNew=0, totalLines=0, totalAlbaranes=0, errors=[];

  for(const file of files){
    try{
      const text = await extractPDFText(file);
      const parsed = parseLogirestText(text, file.name);
      if(parsed.error){ errors.push(`${file.name}: ${parsed.error}`); continue; }
      // Check duplicate albarán
      if(parsed.albaran && DB.stockOrders.some(o=>o.albaran===parsed.albaran)){
        errors.push(`${file.name}: Albarán ${parsed.albaran} ya importado (omitido)`);
        continue;
      }
      // Register albarán
      DB.stockOrders.push({
        id:maxId(DB.stockOrders), albaran:parsed.albaran,
        fecha:parsed.fecha, entrega:parsed.entrega,
        pedido:parsed.pedido, total:parsed.total,
        filename:file.name, _imported:today()
      });
      // Import line items
      let newItems=0;
      parsed.lines.forEach(line=>{
        let item=DB.stockItems.find(x=>
          (line.ref&&x.ref===line.ref)||
          (x.name.toUpperCase()===line.desc.toUpperCase())
        );
        if(!item){
          item={id:maxId(DB.stockItems),ref:line.ref,name:line.desc,
                unit:line.unit||'COL',minStock:0,targetStock:0,
                currentStock:0,avgConsumption:0,orders:[],_cat:'general'};
          DB.stockItems.push(item);
          newItems++;
        }
        // Avoid duplicate order lines
        const dateKey=parsed.fecha||today();
        const alreadyHas=item.orders.some(o=>o._albaran===parsed.albaran);
        if(!alreadyHas){
          item.orders.push({date:dateKey,qty:line.qty,price:line.pu,
                            valor:line.valor,unit:line.unit,
                            _albaran:parsed.albaran,_src:'logirest_pdf'});
        }
      });
      // Recalculate avg consumption
      recalcStockConsumption();
      totalNew+=newItems;
      totalLines+=parsed.lines.length;
      totalAlbaranes++;
    }catch(err){
      errors.push(`${file.name}: ${err.message}`);
    }
  }

  save();
  logImp('Logirest PDF', totalLines, errors.length===0);
  let html=`<div class="alert-item ${errors.length&&!totalAlbaranes?'warning':'info'}" style="padding:8px 12px">
    <i class="fa fa-${errors.length&&!totalAlbaranes?'triangle-exclamation':'circle-check'} alert-icon"></i>
    <div>
      <div style="font-weight:500">${totalAlbaranes} albarán${totalAlbaranes!==1?'es':''} importado${totalAlbaranes!==1?'s':''} · ${totalLines} líneas · ${totalNew} artículos nuevos</div>
      ${errors.length?`<div style="font-size:11px;color:var(--amber);margin-top:4px">${errors.join('<br>')}</div>`:''}
    </div>
  </div>`;
  setStatus(html);
  if(totalAlbaranes>0) setTimeout(()=>go('stocks'),800);
}

function parseLogirestText(text, filename){
  const result={albaran:null,fecha:null,entrega:null,pedido:null,total:0,lines:[],error:null};

  // Header
  let m=text.match(/Albar[aá]n de entrega valorado\s*:\s*(\d+)\s+del\s+(\d{2}\.\d{2}\.\d{4})/);
  if(m){
    result.albaran=m[1];
    const [d,mo,y]=m[2].split('.');
    result.fecha=`${y}-${mo}-${d}`;
  }else{
    // Try alternative format
    m=text.match(/(\d{10})\s+del\s+(\d{2}\.\d{2}\.\d{4})/);
    if(m){result.albaran=m[1];const[d,mo,y]=m[2].split('.');result.fecha=`${y}-${mo}-${d}`;}
  }

  m=text.match(/Entregado el\s*:\s*(\d{2}\.\d{2}\.\d{4})/);
  if(m){const[d,mo,y]=m[1].split('.');result.entrega=`${y}-${mo}-${d}`;}

  m=text.match(/Pedido\s*:\s*(\d+)/);
  if(m) result.pedido=m[1];

  // Total (last occurrence)
  const totals=[...text.matchAll(/^TOTAL\s+([\d\.]+,\d{2})\s+[\d,\.]+\s+([\d\.]+,\d{2})/gm)];
  if(totals.length){
    const last=totals[totals.length-1];
    result.total=parseFloat(last[2].replace(/\./g,'').replace(',','.'));
  }

  if(!result.albaran&&!result.fecha){
    result.error='No se pudo identificar el albarán. ¿Es un PDF de Logirest?';
    return result;
  }

  // Parse line items
  const lines=text.split('\n');
  const REF=/^(ERE\d{9,12})/;
  // Full match: REF DESC qty UNIT qty2 qty3_or_decimal UNIT PU VALOR digits
  const FULL=/(ERE\d+)\s+(.+?)\s+(\d+)\s+(COL|KG|UD|BOT|CJ|BL)\s+\d+\s+([\d,\.]+)\s+(COL|KG|UD|BOT|CJ|BL)\s+([\d,\.]+)\s+([\d,\.]+)\s+\d+\s*$/;
  const NUMS=/(.+?)?\s+(\d+)\s+(COL|KG|UD|BOT|CJ|BL)\s+\d+\s+([\d,\.]+)\s+(COL|KG|UD|BOT|CJ|BL)\s+([\d,\.]+)\s+([\d,\.]+)\s+\d+\s*$/;

  const pNum=s=>parseFloat(s.replace(/\./g,'').replace(',','.'));
  const cleanDesc=s=>s.replace(/\s+\d+\s*$/,'').trim();

  let pendingRef=null, pendingDesc=null;

  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line) continue;

    // Full single-line match
    const f=line.match(FULL);
    if(f){
      result.lines.push({ref:f[1],desc:cleanDesc(f[2]),qty:pNum(f[5]),unit:f[6],pu:pNum(f[7]),valor:pNum(f[8])});
      pendingRef=pendingDesc=null;
      continue;
    }

    // Start of item (ERExxx + partial desc)
    if(REF.test(line)){
      pendingRef=line.match(REF)[1];
      pendingDesc=line.slice(pendingRef.length).trim();
      continue;
    }

    // Continuation
    if(pendingRef){
      const n=line.match(NUMS);
      if(n){
        const extra=(n[1]||'').trim();
        let desc=(pendingDesc+(extra?' '+extra:'')).trim();
        desc=cleanDesc(desc);
        result.lines.push({ref:pendingRef,desc,qty:pNum(n[4]),unit:n[5],pu:pNum(n[6]),valor:pNum(n[7])});
        pendingRef=pendingDesc=null;
        continue;
      }
      // Pure text continuation (not a numbers line, not a stop word)
      if(!/^(Subtotal|TOTAL|GtL|LOGIREST|C\.I\.F|COD IBAN|Página|Servicio|Sábados|Teléfono|Mail|Facturar|Pedido sol|HAMBURGUESAS|CAMOENS|España|P\.I\.|Getafe|ESPAÑA)/.test(line)){
        pendingDesc=(pendingDesc+' '+line).trim();
      } else {
        pendingRef=pendingDesc=null;
      }
    }
  }

  return result;
}

function exportScheduleXLSX(){
  const {from,to}=getExportRange();
  const days=getScheduleData(from,to);

  // Hoja 1: turnos por día
  const rows1=[['Fecha','Día semana','Empleado','Entrada','Salida','Horas','Coste (€)','Tipo']];
  days.forEach(({ds,dow,shifts})=>{
    if(!shifts.length){rows1.push([ds,dow,'—','—','—',0,0,'']);return;}
    shifts.forEach(s=>rows1.push([ds,dow,s.empName,s.start,s.end,parseFloat(hrsOf(s.start,s.end).toFixed(2)),parseFloat((s.cost||0).toFixed(2)),s.tipo||'']));
  });

  // Hoja 2: resumen por empleado
  const empTotals={};
  days.forEach(({shifts})=>shifts.forEach(s=>{
    if(!empTotals[s.empName]) empTotals[s.empName]={hrs:0,cost:0,dias:new Set()};
    empTotals[s.empName].hrs+=hrsOf(s.start,s.end);
    empTotals[s.empName].cost+=s.cost||0;
    empTotals[s.empName].dias.add(s.date);
  }));
  const rows2=[['Empleado','Días trabajados','Horas totales','Coste total (€)']];
  Object.entries(empTotals).sort((a,b)=>b[1].hrs-a[1].hrs).forEach(([name,{hrs,cost,dias}])=>{
    rows2.push([name,dias.size,parseFloat(hrs.toFixed(2)),parseFloat(cost.toFixed(2))]);
  });
  const totalHrs=Object.values(empTotals).reduce((a,v)=>a+v.hrs,0);
  const totalCost=Object.values(empTotals).reduce((a,v)=>a+v.cost,0);
  rows2.push(['TOTAL','',parseFloat(totalHrs.toFixed(2)),parseFloat(totalCost.toFixed(2))]);

  // Crear workbook
  const wb=XLSX.utils.book_new();
  const ws1=XLSX.utils.aoa_to_sheet(rows1);
  const ws2=XLSX.utils.aoa_to_sheet(rows2);

  // Anchos de columna
  ws1['!cols']=[{wch:12},{wch:8},{wch:22},{wch:8},{wch:8},{wch:7},{wch:10},{wch:10}];
  ws2['!cols']=[{wch:22},{wch:14},{wch:14},{wch:14}];

  XLSX.utils.book_append_sheet(wb,ws1,'Turnos');
  XLSX.utils.book_append_sheet(wb,ws2,'Resumen');
  XLSX.writeFile(wb,`Cuadrante_${from}_${to}.xlsx`);
  audit('export_cuadrante',`Excel cuadrante ${from} → ${to}`);
}

function exportSchedulePDF(){
  const {from,to}=getExportRange();
  const days=getScheduleData(from,to);
  const DOW_COLOR={'Lun':'#4f7cff','Mar':'#4f7cff','Mié':'#9b59b6','Jue':'#9b59b6','Vie':'#27ae60','Sáb':'#e67e22','Dom':'#e74c3c'};

  // Construir HTML optimizado para impresión
  const rows=days.map(({ds,dow,shifts})=>{
    if(!shifts.length) return `<tr><td style="color:#999;padding:4px 8px">${dow} ${ds}</td><td colspan="4" style="color:#bbb;font-size:11px;padding:4px 8px">Sin turnos</td></tr>`;
    return shifts.map((s,i)=>`<tr style="border-bottom:1px solid #eee">
      ${i===0?`<td rowspan="${shifts.length}" style="font-weight:600;padding:6px 8px;border-right:3px solid ${DOW_COLOR[dow]||'#4f7cff'};white-space:nowrap;vertical-align:top;font-size:12px">
        <div style="color:${DOW_COLOR[dow]||'#4f7cff'}">${dow}</div>
        <div style="font-size:10px;color:#666">${ds}</div>
      </td>`:''}
      <td style="padding:4px 8px;font-size:12px">${s.empName}</td>
      <td style="padding:4px 8px;font-family:monospace;font-size:12px">${s.start} – ${s.end}</td>
      <td style="padding:4px 8px;font-size:11px;color:#666">${hrsOf(s.start,s.end).toFixed(1)}h</td>
      <td style="padding:4px 8px;font-size:11px;color:#666">${eur(s.cost||0)}</td>
    </tr>`).join('');
  }).join('');

  // Resumen por empleado
  const empTotals={};
  days.forEach(({shifts})=>shifts.forEach(s=>{
    if(!empTotals[s.empName]) empTotals[s.empName]={hrs:0,cost:0};
    empTotals[s.empName].hrs+=hrsOf(s.start,s.end);
    empTotals[s.empName].cost+=s.cost||0;
  }));
  const summaryRows=Object.entries(empTotals).sort((a,b)=>b[1].hrs-a[1].hrs).map(([name,{hrs,cost}])=>
    `<tr><td style="padding:4px 8px;font-size:12px">${name}</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${hrs.toFixed(1)}h</td><td style="padding:4px 8px;font-family:monospace;font-size:12px">${eur(cost)}</td></tr>`
  ).join('');

  const totalHrs=Object.values(empTotals).reduce((a,v)=>a+v.hrs,0);
  const totalCost=Object.values(empTotals).reduce((a,v)=>a+v.cost,0);

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Cuadrante ${from} – ${to}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#333;margin:20px}
    h1{font-size:16px;margin-bottom:4px}
    h2{font-size:13px;margin:16px 0 6px;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#f5f5f5;padding:5px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #ddd}
    tr:hover{background:#fafafa}
    .total-row{background:#f9f9f9;font-weight:600}
    @media print{body{margin:10px} .no-print{display:none}}
  </style></head><body>
  <h1>Cuadrante de turnos — Biconcepto TGB · 100 Montaditos</h1>
  <p style="color:#666;font-size:11px;margin-bottom:16px">Período: ${from} → ${to} · Generado: ${new Date().toLocaleDateString('es-ES')}</p>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;background:#4f7cff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px">🖨 Imprimir</button>
  <h2>Turnos por día</h2>
  <table><thead><tr><th>Día</th><th>Empleado</th><th>Horario</th><th>Horas</th><th>Coste</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Resumen por empleado</h2>
  <table><thead><tr><th>Empleado</th><th>Horas totales</th><th>Coste total</th></tr></thead>
  <tbody>${summaryRows}
  <tr class="total-row"><td>TOTAL</td><td style="font-family:monospace">${totalHrs.toFixed(1)}h</td><td style="font-family:monospace">${eur(totalCost)}</td></tr>
  </tbody></table>
  </body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
  audit('export_cuadrante',`PDF cuadrante ${from} → ${to}`);
}

function exportScheduleMdl(){
  const now=new Date();
  const y=parseInt(_store.getItem('cal_y')||now.getFullYear());
  const m=parseInt(_store.getItem('cal_m')||now.getMonth()+1);
  const firstDay=`${y}-${String(m).padStart(2,'0')}-01`;
  const lastDay=`${y}-${String(m).padStart(2,'0')}-${new Date(y,m,0).getDate()}`;
  modal(`<div class="modal" style="max-width:400px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-file-export"></i> Exportar cuadrante</h3></div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:10px">
        <div style="flex:1">
          <label style="font-size:12px;color:var(--text3)">Desde</label>
          <input type="date" id="expFrom" value="${firstDay}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;color:var(--text3)">Hasta</label>
          <input type="date" id="expTo" value="${lastDay}" style="width:100%;margin-top:4px;padding:8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <label style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:12px;cursor:pointer;text-align:center" onclick="closeModal();exportSchedulePDF()">
          <i class="fa fa-file-pdf" style="font-size:24px;color:#e74c3c;display:block;margin-bottom:6px"></i>
          <div style="font-weight:500;font-size:13px">PDF</div>
          <div style="font-size:11px;color:var(--text3)">Para imprimir</div>
        </label>
        <label style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:12px;cursor:pointer;text-align:center" onclick="closeModal();exportScheduleXLSX()">
          <i class="fa fa-file-excel" style="font-size:24px;color:#27ae60;display:block;margin-bottom:6px"></i>
          <div style="font-weight:500;font-size:13px">Excel</div>
          <div style="font-size:11px;color:var(--text3)">Para editar</div>
        </label>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    </div>
  </div>`);
}

function parseStaffNeedsFromRows(rows){
  let headerRow=-1; const dowNames={'lunes':1,'martes':2,'miércoles':3,'miercoles':3,'jueves':4,'viernes':5,'sábado':6,'sabado':6,'domingo':0};
  for(let i=0;i<Math.min(5,rows.length);i++){
    if(rows[i].filter(c=>dowNames[String(c).toLowerCase().trim()]).length>=5){headerRow=i;break;}
  }
  if(headerRow<0) return null;
  const dowCols={};
  rows[headerRow].forEach((c,i)=>{const k=dowNames[String(c).toLowerCase().trim()];if(k!==undefined)dowCols[i]=k;});
  const needs={};
  for(let i=headerRow+1;i<rows.length;i++){
    const row=rows[i], horaStr=String(row[0]||'').trim();
    if(!horaStr||horaStr.toLowerCase().includes('total'))continue;
    const hMatch=horaStr.match(/^(\d{1,2})/); if(!hMatch)continue;
    let h=parseInt(hMatch[1]); if(h===24)h=0;
    needs[String(h)]={};
    Object.entries(dowCols).forEach(([col,dow])=>{needs[String(h)][String(dow)]=parseInt(row[col])||0;});
  }
  return Object.keys(needs).length>=5?needs:null;
}