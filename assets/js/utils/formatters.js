// ─── FORMATEADORES Y HELPERS DE UI ─────────────────────────

const $     = id => document.getElementById(id);
const jName   = n => JMAP[n.trim()]||n.trim();

const eur   = n  => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:0}).format(n||0);

const dk    = ds => ['D','L','M','X','J','V','S'][new Date(ds).getDay()];

const dayN  = ds => ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date(ds).getDay()];

const sDay  = ds => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(ds).getDay()];

function flash(msg) {
  let el=$('_fl');
  if(!el){el=document.createElement('div');el.id='_fl';el.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9999;background:#22c55e;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-family:"DM Sans",sans-serif;opacity:0;transition:opacity .3s;pointer-events:none';document.body.appendChild(el);}
  el.innerHTML='<i class="fa fa-check"></i> '+(msg||'Guardado');
  el.style.opacity='1'; clearTimeout(el._t); el._t=setTimeout(()=>{el.style.opacity='0';},1800);
}

function modal(html) {
  const d=document.createElement('div');
  d.innerHTML=`<div class="modal-overlay" onclick="if(event.target===this)this.remove()">${html}</div>`;
  document.body.appendChild(d);
}

function closeModal(){const m=document.querySelector('.modal-overlay');if(m)m.remove();}

const maxId   = arr => arr.reduce((m,x)=>Math.max(m,x.id),0)+1;
