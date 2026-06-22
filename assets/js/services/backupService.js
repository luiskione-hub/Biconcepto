// ─── BACKUP Y RESTAURACIÓN ──────────────────────────────────
// Depende de: DB (state), save() (storage)

function importBackup(){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{const r=new FileReader();r.onload=ev=>{try{const p=JSON.parse(ev.target.result);if(!p._v){alert('Archivo no válido');return;}['employees','shifts','vacations','alerts','bankMovements','fixedCosts','obj','legal','conv','jibbleData','_log','salesHistory','stockItems','stockOrders','stockSnapshots','planConfig','rolePerms','auditLog','staffNeeds','staffSeasons'].forEach(k=>{if(p[k]!==undefined)DB[k]=p[k];});save();location.reload();}catch(err){alert('Error: '+err.message);}};r.readAsText(e.target.files[0]);};inp.click();
}

function exportBackup(){
  try{
    const p={};['employees','shifts','vacations','alerts','bankMovements','fixedCosts','obj','legal','conv','jibbleData','_log','salesHistory','stockItems','stockOrders','stockSnapshots','planConfig','rolePerms','auditLog','staffNeeds','staffSeasons'].forEach(k=>{p[k]=DB[k];});
    p._v='biconcepto_v3';p._t=new Date().toISOString();
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));a.download='backup_biconcepto_'+today()+'.json';a.click();
  }catch(e){alert('Error: '+e.message);}
}