// ─── NAVEGACIÓN Y CONTROL DE ACCESO ────────────────────────
// Depende de: state.js (DB), config.js (PAGES, ROLES), utils/

function canAccess(page){
  if(!DB.currentUser) return page==='dashboard';
  const role=DB.currentUser.role;
  const allowed=DB.rolePerms[role];
  if(!allowed) return false;
  return allowed.includes(page);
}

function updateBadge(){const b=$('alertBadge');if(b)b.textContent=DB.alerts.filter(a=>!a.done).length;}

function setupNav(){
  const role=DB.currentUser?DB.currentUser.role:'reader';
  // Mostrar/ocultar items del nav según permisos
  document.querySelectorAll('.nav-item[data-page]').forEach(a=>{
    const page=a.dataset.page;
    if(canAccess(page)){
      a.style.display='';
    } else {
      a.style.display='none';
    }
  });
  // Ocultar secciones vacías del nav
  document.querySelectorAll('.nav-section').forEach(sec=>{
    const visible=[...sec.querySelectorAll('.nav-item[data-page]')].some(a=>a.style.display!=='none');
    sec.style.display=visible?'':'none';
  });

  document.querySelectorAll('.nav-item[data-page]').forEach(a=>{
    a.addEventListener('click',function(e){
      e.preventDefault();
      const page=this.dataset.page;
      if(!canAccess(page)){flash('⚠ Sin permisos para acceder a esta sección');return;}
      document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
      go(page);
      closeSidebar();
    });
  });
}

function go(page){
  if(DB.currentUser && !canAccess(page) && page!=='dashboard'){
    const pc=$('pageContent');
    if(pc) pc.innerHTML=`<div class="page-body"><div class="alert-item warning" style="margin:16px"><i class="fa fa-lock alert-icon"></i><div class="alert-msg">Sin permisos para acceder a esta sección.</div></div></div>`;
    return;
  }
  const pc=$('pageContent');
  if(!PAGES[page]){console.warn('Unknown page:',page);return;}
  const [fn,af]=PAGES[page];
  try { pc.innerHTML=fn(); }
  catch(err){
    pc.innerHTML=`<div class="page-body"><div class="alert-item warning" style="margin:16px"><i class="fa fa-triangle-exclamation alert-icon"></i><div class="alert-msg">Error en página: ${err.message}</div></div></div>`;
    console.error('['+page+']',err); return;
  }
  if(af) setTimeout(af,80);
}

function audit(action, detail){
  if(!DB.auditLog) DB.auditLog=[];
  const who=DB.currentUser?DB.currentUser.name:'Sistema';
  const ts=new Date().toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  DB.auditLog.unshift({ts, who, action, detail});
  if(DB.auditLog.length>500) DB.auditLog=DB.auditLog.slice(0,500); // máx 500 entradas
}