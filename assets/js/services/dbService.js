// ─── SINCRONIZACIÓN CON TABLAS SUPABASE (empleados, vacaciones) ─
// Depende de: config.js (SUPA_URL, SUPA_HDR, LOCATION_ID)

// Headers con token de sesión actual (necesario por RLS)
function dbHeaders(){
  const token = sessionStorage.getItem('sb_access_token');
  return {
    'Content-Type': 'application/json',
    'apikey': SUPA_KEY,
    'Authorization': 'Bearer ' + (token || SUPA_KEY)
  };
}

// ── EMPLEADOS ────────────────────────────────────────────────
async function dbLoadEmployees(){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/employees?location_id=eq.${LOCATION_ID}&select=*,employee_fixed_schedules(*)`, {
      headers: dbHeaders()
    });
    if(!res.ok) return null;
    const rows = await res.json();
    // Mapear de columnas Supabase a formato DB.employees actual
    return rows.map(r => ({
      id: r.id, // uuid real de Supabase
      name: r.name,
      type: r.contract_type,
      wh: parseFloat(r.weekly_hours),
      hc: parseFloat(r.hourly_cost),
      mc: r.monthly_cost ? parseFloat(r.monthly_cost) : null,
      active: r.active,
      notes: r.notes || '',
      sick: 0, // se calcula aparte desde sick_leaves
      fs: (r.employee_fixed_schedules||[]).map(f => ({
        d: f.day_of_week, s: f.start_time.slice(0,5), e: f.end_time.slice(0,5)
      })),
      vacDias: 30 // TODO: mover a tabla propia si se necesita por empleado
    }));
  }catch(e){
    console.warn('dbLoadEmployees error:', e.message);
    return null;
  }
}

async function dbSaveEmployee(emp){
  const isNew = !emp.id || typeof emp.id === 'number'; // ids viejos numéricos = no migrado aún
  const payload = {
    location_id: LOCATION_ID,
    name: emp.name,
    contract_type: emp.type === 'full' ? 'full' : 'part',
    weekly_hours: emp.wh,
    hourly_cost: emp.hc,
    monthly_cost: emp.mc,
    active: emp.active,
    notes: emp.notes || null
  };

  try{
    let employeeId = emp.id;
    if(isNew){
      const res = await fetch(`${SUPA_URL}/rest/v1/employees`, {
        method: 'POST',
        headers: {...dbHeaders(), 'Prefer':'return=representation'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Error al crear empleado');
      const [created] = await res.json();
      employeeId = created.id;
    } else {
      const res = await fetch(`${SUPA_URL}/rest/v1/employees?id=eq.${employeeId}`, {
        method: 'PATCH',
        headers: {...dbHeaders(), 'Prefer':'return=minimal'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Error al actualizar empleado');
    }

    // Sincronizar horarios fijos: borrar todos y reinsertar (más simple que diff)
    await fetch(`${SUPA_URL}/rest/v1/employee_fixed_schedules?employee_id=eq.${employeeId}`, {
      method: 'DELETE', headers: dbHeaders()
    });
    if(emp.fs && emp.fs.length){
      const schedules = emp.fs.map(f => ({
        employee_id: employeeId, day_of_week: f.d, start_time: f.s, end_time: f.e
      }));
      await fetch(`${SUPA_URL}/rest/v1/employee_fixed_schedules`, {
        method: 'POST', headers: dbHeaders(), body: JSON.stringify(schedules)
      });
    }

    return { ok: true, id: employeeId };
  }catch(e){
    console.error('dbSaveEmployee error:', e.message);
    return { ok: false, error: e.message };
  }
}

async function dbDeleteEmployee(employeeId){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/employees?id=eq.${employeeId}`, {
      method: 'DELETE', headers: dbHeaders()
    });
    return res.ok;
  }catch(e){
    console.error('dbDeleteEmployee error:', e.message);
    return false;
  }
}

// ── VACACIONES ───────────────────────────────────────────────
async function dbLoadVacations(){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/vacations?select=*`, { headers: dbHeaders() });
    if(!res.ok) return null;
    const rows = await res.json();
    return rows.map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      start: r.start_date,
      end: r.end_date,
      days: r.days,
      status: r.status,
      notes: r.notes || ''
    }));
  }catch(e){
    console.warn('dbLoadVacations error:', e.message);
    return null;
  }
}

async function dbSaveVacation(vac){
  const isNew = !vac.id || typeof vac.id === 'number';
  const payload = {
    employee_id: vac.employee_id,
    start_date: vac.start,
    end_date: vac.end,
    status: vac.status || 'pending',
    notes: vac.notes || null
  };

  try{
    if(isNew){
      const res = await fetch(`${SUPA_URL}/rest/v1/vacations`, {
        method: 'POST',
        headers: {...dbHeaders(), 'Prefer':'return=representation'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Error al crear vacaciones');
      const [created] = await res.json();
      return { ok: true, id: created.id };
    } else {
      const res = await fetch(`${SUPA_URL}/rest/v1/vacations?id=eq.${vac.id}`, {
        method: 'PATCH',
        headers: {...dbHeaders(), 'Prefer':'return=minimal'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Error al actualizar vacaciones');
      return { ok: true, id: vac.id };
    }
  }catch(e){
    console.error('dbSaveVacation error:', e.message);
    return { ok: false, error: e.message };
  }
}

async function dbDeleteVacation(vacId){
  try{
    const res = await fetch(`${SUPA_URL}/rest/v1/vacations?id=eq.${vacId}`, {
      method: 'DELETE', headers: dbHeaders()
    });
    return res.ok;
  }catch(e){
    console.error('dbDeleteVacation error:', e.message);
    return false;
  }
}

// ── CARGA INICIAL: sustituir DB.employees/DB.vacations al iniciar sesión ─
async function dbSyncOnLogin(){
  const emps = await dbLoadEmployees();
  // Solo sustituir si Supabase devuelve TODOS los empleados ya migrados
  // (evita perder empleados locales durante la migración manual)
  if(emps && emps.length >= DB.employees.filter(e=>e.active).length){
    DB.employees = emps;
  }
  const vacs = await dbLoadVacations();
  if(vacs){
    DB.vacations = vacs;
  }
}
