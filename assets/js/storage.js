// ─── ALMACENAMIENTO LOCAL Y SINCRONIZACIÓN ──────────────────
// Depende de: state.js (DB), config.js, supabaseService.js

const _store = {
  getItem(k){ try{ return localStorage.getItem(k); }catch(e){ return _memStore[k]||null; } },
  setItem(k,v){ try{ localStorage.setItem(k,v); }catch(e){ _memStore[k]=v; } },
  removeItem(k){ try{ localStorage.removeItem(k); }catch(e){ delete _memStore[k]; } }
};

const _KEYS = ['employees','shifts','vacations','alerts','bankMovements','fixedCosts',
               'obj','legal','conv','jibbleData','_log','salesHistory',
               'stockItems','stockOrders','stockSnapshots','planConfig','rolePerms',
               'auditLog','staffNeeds','staffSeasons'];

function _applyData(p){
  _KEYS.forEach(k=>{ if(p[k]!==undefined) DB[k]=p[k]; });
  if(p._seedVersion) DB._seedVersion=p._seedVersion;
  if(p._t) DB._t=p._t;
  // Actualizar salesHistory con seed corregido
  if(typeof SALES_HISTORY_SEED!=='undefined' && SALES_HISTORY_SEED.length>0){
    const seedVersion='v5';
    if(DB._seedVersion!==seedVersion){
      const byDate={};
      DB.salesHistory.forEach(s=>{ byDate[s.date]=s; });
      SALES_HISTORY_SEED.forEach(s=>{
        if(byDate[s.date]){
          if(byDate[s.date]._src==='hist'||!byDate[s.date]._src){
            byDate[s.date].amount=s.amount; byDate[s.date]._src='hist';
          }
        } else { DB.salesHistory.push({...s,id:DB.salesHistory.length+1}); }
      });
      DB.salesHistory.sort((a,b)=>a.date.localeCompare(b.date));
      DB._seedVersion=seedVersion;
    }
  }
}

function save() {
  try {
    const p = {};
    ['employees','shifts','vacations','alerts','bankMovements','fixedCosts',
     'obj','legal','conv','jibbleData','_log','salesHistory',
     'stockItems','stockOrders','stockSnapshots','planConfig','rolePerms','auditLog','staffNeeds','staffSeasons'].forEach(k=>{p[k]=DB[k];});
    p._t = new Date().toISOString();
    p._seedVersion = DB._seedVersion;
    // 1. Guardar local siempre (funciona offline)
    _store.setItem('biconcepto_v3', JSON.stringify(p));
    // 2. Sincronizar con Supabase en segundo plano
    updateSyncIndicator('syncing');
    supabaseSave(p).then(ok=>{
      updateSyncIndicator(ok?'synced':'error');
    });
  } catch(e) {}
}

// ─── Carga inicial: localStorage → Supabase ─────────────────
(function(){
  // 1. Cargar localStorage inmediatamente (sin espera, funciona offline)
  try{
    const raw=_store.getItem('biconcepto_v3');
    if(raw){ _applyData(JSON.parse(raw)); updateSyncIndicator('local'); }
  }catch(e){}

  // Garantizar que siempre hay usuarios con contraseñas funcionales
  // Esto evita quedar bloqueado si Supabase sobreescribió las contraseñas
  const _defaults=[
    {id:1,name:'Administrador',role:'admin',    user:'admin',    pass:'1234',avatar:'A',mustChange:false},
    {id:2,name:'Gerente',      role:'gerente',  user:'gerente',  pass:'1234',avatar:'G',mustChange:true},
    {id:3,name:'Encargado',    role:'encargado',user:'encargado',pass:'1234',avatar:'E',mustChange:true},
    {id:4,name:'Solo Lectura', role:'reader',   user:'reader',   pass:'1234',avatar:'R',mustChange:true},
  ];
  if(!DB.users||DB.users.length===0){
    DB.users=_defaults;
  } else {
    // Asegurar que los usuarios por defecto existen con contraseña funcional
    _defaults.forEach(def=>{
      const existing=DB.users.find(u=>u.user===def.user);
      if(!existing){ DB.users.push(def); }
      else if(!existing.pass){ existing.pass=def.pass; }
    });
  }

  // 2. Intentar Supabase en segundo plano
  // Si tiene datos más recientes, aplicarlos EXCEPTO los usuarios
  // (para evitar quedar bloqueado por contraseñas antiguas en Supabase)
  supabaseLoad().then(row=>{
    if(!row){ updateSyncIndicator(DB._t?'error':'local'); return; }
    const supaT=new Date(row.updated_at||0).getTime();
    const localT=new Date(DB._t||0).getTime();
    if(supaT>localT+5000){
      const usersBackup=DB.users; // guardar usuarios actuales (con contraseñas válidas)
      _applyData(row.data);
      DB.users=usersBackup; // restaurar usuarios — las contraseñas vienen del código
      try{ _store.setItem('biconcepto_v3',JSON.stringify(row.data)); }catch(e){}
      if(DB.currentUser){
        const cur=document.querySelector('.nav-item.active');
        if(cur) go(cur.dataset.page||'dashboard');
        updateBadge();
      }
    }
    updateSyncIndicator('synced');
  }).catch(()=>updateSyncIndicator(DB._t?'error':'local'));
})();