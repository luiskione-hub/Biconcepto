// ─── AUTENTICACIÓN CON SUPABASE AUTH ────────────────────────
// Depende de: config.js (SUPA_URL, SUPA_KEY)

const AUTH_URL = `${SUPA_URL}/auth/v1`;

async function authSignIn(email, password) {
  try {
    const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error_description || data.msg || 'Credenciales incorrectas' };

    sessionStorage.setItem('sb_access_token', data.access_token);
    sessionStorage.setItem('sb_refresh_token', data.refresh_token);
    sessionStorage.setItem('sb_user_id', data.user.id);

    return { user: data.user, session: data };
  } catch (e) {
    return { error: 'Error de conexión: ' + e.message };
  }
}

async function authSignOut() {
  const token = sessionStorage.getItem('sb_access_token');
  if (token) {
    try {
      await fetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
      });
    } catch (e) {}
  }
  sessionStorage.removeItem('sb_access_token');
  sessionStorage.removeItem('sb_refresh_token');
  sessionStorage.removeItem('sb_user_id');
}

async function authGetSession() {
  const token = sessionStorage.getItem('sb_access_token');
  if (!token) return null;
  try {
    const res = await fetch(`${AUTH_URL}/user`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return await authRefreshSession();
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function authRefreshSession() {
  const refreshToken = sessionStorage.getItem('sb_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await res.json();
    if (!res.ok) { await authSignOut(); return null; }
    sessionStorage.setItem('sb_access_token', data.access_token);
    sessionStorage.setItem('sb_refresh_token', data.refresh_token);
    return data.user;
  } catch (e) {
    return null;
  }
}

async function authGetProfile(userId) {
  const token = sessionStorage.getItem('sb_access_token');
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows.length ? rows[0] : null;
  } catch (e) {
    return null;
  }
}

async function authChangePassword(newPassword) {
  const token = sessionStorage.getItem('sb_access_token');
  try {
    const res = await fetch(`${AUTH_URL}/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ password: newPassword })
    });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.msg || 'Error al cambiar contraseña' };
    }
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

async function authMarkPasswordChanged(userId) {
  const token = sessionStorage.getItem('sb_access_token');
  try {
    await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + token,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ must_change_password: false })
    });
  } catch (e) {}
}
