// ─── UTILIDADES DE FECHA Y TIEMPO ───────────────────────────

const today = () => new Date().toISOString().split('T')[0];

function isoWeekMonday(ds){
  const d=new Date(ds);
  const day=d.getDay()||7;
  const mon=new Date(d); mon.setDate(d.getDate()-day+1);
  return mon.toISOString().slice(0,10);
}

const hrsOf   = (s,e) => { const sm=parseInt(s)*60+(parseInt(s.split(':')[1])||0), em=parseInt(e)*60+(parseInt(e.split(':')[1])||0); let h=(em-sm)/60; if(h<=0)h+=24; return h; };

function hrsInMonth(empId,mStr){
  return DB.shifts.filter(s=>s.date.startsWith(mStr)&&s.employee_id===empId)
    .reduce((a,s)=>a+hrsOf(s.start,s.end),0);
}