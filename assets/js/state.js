// ─── ESTADO GLOBAL DE LA APLICACIÓN ─────────────────────────
// DB es el único objeto mutable de la app.
// Todos los módulos lo leen/escriben directamente.

const DB = {
  currentUser: null,
  users:[
    {id:1,name:'Administrador',role:'admin',    user:'admin',    pass:'1234',avatar:'A',mustChange:false},
    {id:2,name:'Gerente',      role:'gerente',  user:'gerente',  pass:'1234',avatar:'G',mustChange:true},
    {id:3,name:'Encargado',    role:'encargado',user:'encargado',pass:'1234',avatar:'E',mustChange:true},
    {id:4,name:'Solo Lectura', role:'reader',   user:'reader',   pass:'1234',avatar:'R',mustChange:true},
  ],
  employees:[
    {id:1, name:'Fátima Embark',          type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:2, name:'Muhad Hasan Mojtar',     type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:3, name:'Ismael Almenta',         type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:4, name:'Aya El Kabaj',           type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:5, name:'Dafne De La Pena',       type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:6, name:'Iman Ahmed',             type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:7, name:'Linda Katerine Martínez',type:'full',wh:40,hc:9.25,mc:1603,sick:3,active:true,notes:'Baja médica',fs:[]},
    {id:8, name:'María Jesús Narvaez',    type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:9, name:'Mohamed Ahmed',          type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:10,name:'Natividad Encomienda',   type:'full',wh:40,hc:9.25,mc:1603,sick:3,active:true,notes:'Baja médica',fs:[]},
    {id:11,name:'Vindna Nanikram',        type:'full',wh:40,hc:9.25,mc:1603,sick:0,active:true,notes:'',fs:[]},
    {id:12,name:'Brahim Motjar',          type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Mié-Jue 19-01',fs:[{d:3,s:'19:00',e:'01:00'},{d:4,s:'19:00',e:'01:00'}]},
    {id:13,name:'Yabir Azzan',            type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Mié-Jue 19-01/Vie 17:30',fs:[{d:3,s:'19:00',e:'01:00'},{d:4,s:'19:00',e:'01:00'},{d:5,s:'17:30',e:'01:30'}]},
    {id:14,name:'Lucia Mercedes Pari Paz',type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Vie-Sáb 19:30/Dom partido',fs:[{d:5,s:'19:30',e:'01:30'},{d:6,s:'19:30',e:'01:30'},{d:0,s:'13:00',e:'16:00'},{d:0,s:'20:00',e:'01:00'}]},
    {id:15,name:'Dikra Abdelnevi',        type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Vie-Sáb 19:30/Dom partido',fs:[{d:5,s:'19:30',e:'01:30'},{d:6,s:'19:30',e:'01:30'},{d:0,s:'13:30',e:'16:30'},{d:0,s:'20:00',e:'01:00'}]},
    {id:16,name:'Rubén León Encomienda',  type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Días pendientes asignar',fs:[]},
    {id:17,name:'Ramia Mohamed',          type:'part',wh:20,hc:9.25,mc:802, sick:0,active:true,notes:'Vie-Sáb 18-01:30/Dom 20-01',fs:[{d:5,s:'18:00',e:'01:30'},{d:6,s:'18:00',e:'01:30'},{d:0,s:'20:00',e:'01:00'}]},
    {id:18,name:'Hanan Abdelnevi',        type:'part',wh:20,hc:9.25,mc:802, sick:3,active:true,notes:'Baja médica',fs:[]},
  ],
  conv:{sal:1134.38,plus:93.82,ss:30.55},
  legal:{maxW:40,maxD:9,minR:12,minWR:36,maxC:6,vac:30},
  fixedCosts:Object.entries(FIXED_COSTS).map((e,i)=>({id:i+1,name:e[0],amount:e[1],active:true})),
  obj:{laborPct:30,minSales:1200,sph:45},
  shifts:[],vacations:[],salesHistory:[],bankMovements:[],jibbleData:[],_log:[],auditLog:[],stockItems:[],stockOrders:[],stockSnapshots:[],
  staffNeeds:{}, // legacy — ahora se usa staffSeasons
  staffSeasons:[], // [{id, name, from, to, needs:{hora:{dow:n}}}]
  planConfig:{
    rules:{1:{c:4,n:4,p:2},2:{c:4,n:4,p:2},3:{c:5,n:8,p:5},4:{c:5,n:8,p:5},5:{c:4,n:6,p:4},6:{c:5,n:9,p:5},0:{c:6,n:7,p:6}},
    shifts:{comida:{start:'10:00',end:'18:30'},cena:{start:'19:00',end:'01:30'},partido1:{start:'12:00',end:'16:00'},partido2:{start:'20:00',end:'00:30'}},
    noCoincide:[[1,2]],
    encargados:[1,2],
    assignRules:[]
  },
  rolePerms:{
    admin:    ['dashboard','alerts','employees','shifts','schedule','scheduleConfig','vacations','sales','bank','profit','results','legal','costs','objectives','importer','forecast','jibble','reports','stocks','stockOrder','users'],
    gerente:  ['dashboard','alerts','employees','shifts','schedule','scheduleConfig','vacations','sales','bank','profit','results','legal','costs','objectives','importer','forecast','jibble','reports','stocks','stockOrder'],
    encargado:['dashboard','alerts','employees','shifts','schedule','vacations','stocks','stockOrder','jibble'],
    reader:   ['dashboard','sales','results','jibble']
  },
  alerts:[
    {id:1,sev:'error',msg:'Linda Katerine Martínez — baja médica activa.',done:false},
    {id:2,sev:'error',msg:'Natividad Encomienda — baja médica activa.',done:false},
    {id:3,sev:'error',msg:'Hanan Abdelnevi — baja médica activa.',done:false},
    {id:4,sev:'info', msg:'Rubén León: días pendientes de asignar.',done:false},
  ],
};


// Usuarios por defecto (contraseñas deben cambiarse en primer acceso)
  const _defaults=[
    {id:1,name:'Administrador',role:'admin',    user:'admin',    pass:'1234',avatar:'A',mustChange:false},
    {id:2,name:'Gerente',      role:'gerente',  user:'gerente',  pass:'1234',avatar:'G',mustChange:true},
    {id:3,name:'Encargado',    role:'encargado',user:'encargado',pass:'1234',avatar:'E',mustChange:true},
    {id:4,name:'Solo Lectura', role:'reader',   user:'reader',   pass:'1234',avatar:'R',mustChange:true},
  ];