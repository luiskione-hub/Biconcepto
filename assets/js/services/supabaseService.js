// ─── SINCRONIZACIÓN CON SUPABASE ────────────────────────────
// Depende de: config.js (SUPA_URL, SUPA_KEY, SUPA_HDR)

async function supabaseSave(payload){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/app_state`, {
      method:'POST',
      headers:{...SUPA_HDR,'Prefer':'resolution=merge-duplicates'},
      body: JSON.stringify({id:'main', data: payload, updated_at: new Date().toISOString()})
    });
    return res.ok;
  }catch(e){ return false; }
}

async function supabaseLoad(){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/app_state?id=eq.main&select=data,updated_at`,{
      headers: SUPA_HDR
    });
    if(!res.ok){
      console.warn('Supabase load error:', res.status, res.statusText);
      return null;
    }
    const rows = await res.json();
    return rows&&rows.length ? rows[0] : null;
  }catch(e){
    console.warn('Supabase connection error:', e.message);
    return null;
  }
}

async function supabaseWakeup(){
  try{
    await fetch(`${SUPA_URL}/rest/v1/`, { headers: SUPA_HDR });
  }catch(e){}
}

function updateSyncIndicator(status){
  _syncStatus = status;
  const el = document.getElementById('_syncBadge');
  if(!el) return;
  const cfg = {
    local:   {icon:'fa-circle-dot',   color:'var(--text3)',  title:'Solo local'},
    syncing: {icon:'fa-rotate',       color:'var(--amber)',  title:'Sincronizando…'},
    synced:  {icon:'fa-cloud-check',  color:'var(--green)',  title:'Sincronizado con Supabase'},
    error:   {icon:'fa-cloud-slash',  color:'var(--red)',    title:'Error de sincronización (guardado local)'},
  };
  const c = cfg[status]||cfg.local;
  el.innerHTML = `<i class="fa ${c.icon}" style="color:${c.color}" title="${c.title}"></i>`;
}