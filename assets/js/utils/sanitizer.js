// ─── SANITIZACIÓN Y LOGGING ─────────────────────────────────

function sanitize(str){
  if(str===null||str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function showR(id,ok,msg,detail){
  const el=$(id);if(!el)return;
  el.innerHTML=`<div class="alert-item ${ok?'info':'warning'}" style="padding:8px 12px;margin-top:6px"><i class="fa fa-${ok?'circle-check':'triangle-exclamation'} alert-icon"></i><div><div class="alert-msg">${msg}</div>${detail?`<div class="alert-meta">${detail}</div>`:''}</div></div>`;
}

function logImp(type,n,ok){DB._log.push({ts:new Date().toLocaleString('es-ES'),type,records:n,ok});save();}