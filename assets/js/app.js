// ─── ENTRY POINT ────────────────────────────────────────────
// Inicialización, login y arranque de la app.
// Este archivo debe cargarse ÚLTIMO en index.html.

async function doLogin(){
  try {
    const u=$('loginUser').value.trim(), p=$('loginPass').value.trim();
    const errEl=$('loginError');
    if(errEl) errEl.textContent='';
    if(!u||!p){
      if(errEl) errEl.textContent='Introduce usuario y contraseña';
      return;
    }

    // Bloqueo tras 5 intentos fallidos (5 min)
    const _fails=JSON.parse(sessionStorage.getItem('_lf')||'{"n":0,"t":0}');
    if(_fails.n>=5&&Date.now()-_fails.t<300000){
      const left=Math.ceil((300000-(Date.now()-_fails.t))/60000);
      if(errEl) errEl.textContent='Demasiados intentos. Espera '+left+' min.';
      return;
    }

    const btn=$('btnLogin');
    if(btn){btn.disabled=true;btn.textContent='Entrando...';}

    const result=await authSignIn(u,p);

    if(btn){btn.disabled=false;btn.textContent='Entrar';}

    if(result.error){
      sessionStorage.setItem('_lf',JSON.stringify({n:_fails.n+1,t:Date.now()}));
      if(errEl) errEl.textContent='Usuario o contraseña incorrectos (intento '+(_fails.n+1)+'/5)';
      return;
    }

    sessionStorage.removeItem('_lf');

    const profile=await authGetProfile(result.user.id);
    if(!profile){
      if(errEl) errEl.textContent='No se encontró perfil de usuario. Contacta al administrador.';
      await authSignOut();
      return;
    }

    DB.currentUser={
      id: profile.id,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar,
      email: u
    };

    if(profile.must_change_password){
      $('loginScreen').classList.add('hidden');
      $('app').classList.remove('hidden');
      forceChangePassMdl(DB.currentUser);
      return;
    }

    audit('login','Inicio de sesión: '+profile.name);
    await dbSyncOnLogin();
    launchApp();
  } catch(e) {
    const errEl=$('loginError');
    if(errEl) errEl.textContent='Error: '+e.message;
    console.error('doLogin error:', e);
  }
}

async function doLogout(){
  await authSignOut();
  DB.currentUser=null;
  $('app').classList.add('hidden');
  $('loginScreen').classList.remove('hidden');
}

function launchApp(){
  const user=DB.currentUser;
  $('loginScreen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('userName').textContent=user.name;
  $('userRole').textContent=user.role[0].toUpperCase()+user.role.slice(1);
  $('userAvatar').textContent=user.avatar;
  updateBadge();
  setupNav();
  checkStockAlarm();
  checkStaffingAlarm();
  checkForecastAlarm();
  go('dashboard');
}

function forceChangePassMdl(user){
  modal(`<div class="modal" style="max-width:380px">
    <div class="modal-header"><h3 class="modal-title"><i class="fa fa-key"></i> Cambia tu contraseña</h3></div>
    <div class="modal-body">
      <div style="background:rgba(79,124,255,.1);border:1px solid rgba(79,124,255,.3);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--accent);margin-bottom:14px">
        <i class="fa fa-circle-info"></i> Por seguridad debes establecer una contraseña personal antes de continuar.
      </div>
      <label style="font-size:12px;color:var(--text3)">Nueva contraseña (mín. 6 caracteres)</label>
      <input type="password" id="fcPass1" placeholder="Nueva contraseña" style="width:100%;margin:6px 0 10px;padding:9px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
      <label style="font-size:12px;color:var(--text3)">Confirmar contraseña</label>
      <input type="password" id="fcPass2" placeholder="Repite la contraseña" style="width:100%;margin:6px 0 0;padding:9px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);border-radius:6px;font-size:13px;box-sizing:border-box">
      <div id="fcPassErr" style="color:var(--red);font-size:12px;margin-top:6px;display:none"></div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:flex-end">
      <button class="btn btn-primary" onclick="confirmForcePass()"><i class="fa fa-check"></i> Establecer contraseña</button>
    </div>
  </div>`);
}

// ─── Inicialización DOM ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  try {
    // Pre-cargar Jibble si no hay datos guardados
    if (!DB.jibbleData || DB.jibbleData.length === 0) {
      DB.jibbleData = JIBBLE_HISTORY;
    }

    // Enlazar botones de login de forma segura (funciona en Safari)
    var btnLogin = document.getElementById('btnLogin');
    if (btnLogin) btnLogin.addEventListener('click', doLogin);

    var loginPass = document.getElementById('loginPass');
    if (loginPass) loginPass.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

    var loginUser = document.getElementById('loginUser');
    if (loginUser) loginUser.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

    // Asegurar estado inicial correcto
    var ls = document.getElementById('loginScreen');
    var app = document.getElementById('app');
    if (ls) ls.classList.remove('hidden');
    if (app) app.classList.add('hidden');

    setInterval(function(){ if(DB.currentUser) save(); }, 3000);
    console.log('✓ Biconcepto listo —', today());
  } catch(e) {
    console.error('❌ Error de arranque:', e);
    alert('Error al iniciar: ' + e.message);
  }
});