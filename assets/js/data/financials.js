// ─── DATOS FINANCIEROS HISTÓRICOS ───────────────────────────
// FULL_PL, FIXED_COSTS, HOURLY, WEEKLY_LABOR, RATIO_MMPP

// ============================================================
// GESTIÓN BICONCEPTO — TGB · 100 Montaditos · Ceuta
// ARQUITECTURA: Un solo <script>. Sin parches. Sin duplicados.
// Para añadir una página: (1) escribir pgXxx() + afXxx()
//                          (2) añadir entrada en PAGES
// Para actualizar datos: editar FULL_PL, FIXED_COSTS, WEEKLY_LABOR
// ============================================================

// ═══════════════════════════════════════════════════════════
// 1. CONSTANTES — NUNCA se sobreescriben en runtime
// ═══════════════════════════════════════════════════════════

const RATIO_MMPP = 0.3805; // Coste materias primas / ventas (BBVA ene-abr 2026)

const FIXED_COSTS = {
  'Alquiler (Casa Ros)':             3736.48,
  'Electricidad (Alumbrado Ceuta)':  1083.50,
  'Gas (GASIB)':                     1458.20,
  'Agua (Aguas Oravi)':                34.20,
  'Teléfono (Telefónica)':             34.50,
  'Limpieza (Limpiezas Ceuta SL)':    154.89,
  'Gestoría (Symbol)':                701.07,
  'Mantenimiento (media)':            396.74,
  'Comisiones bancarias (BBVA)':       77.13,
};
const FIXED_MONTHLY = Object.values(FIXED_COSTS).reduce((a,b)=>a+b,0);
const FIXED_DAY     = Math.round(FIXED_MONTHLY / 26); // 295 €/día

const WEEKLY_LABOR = {
  '2026-05-18':{hrs:50.0,cost:462.13},'2026-05-19':{hrs:41.2,cost:381.47},
  '2026-05-20':{hrs:67.7,cost:625.86},'2026-05-21':{hrs:65.6,cost:606.43},
  '2026-05-22':{hrs:69.1,cost:639.54},'2026-05-23':{hrs:94.1,cost:870.33},
  '2026-05-24':{hrs:84.0,cost:777.18},
};

const FULL_PL = {
  1:{name:'Enero',   tpv:39407.96,ef:20500,del:6479.46,oi:2270,   ali:-22791.07,beb:-1642.45, nom:-19696.34,olab:-2418.27,ss:-5481.85, alq:-3736.48,luz:-1033.51,gas:-1493,   tel:-30.48,agu:-65.96, imp:-8170.50, ase:-720.72,mnt:-734.98,lim:-150.52,mkt:-79.50, ban:-75.93,oex:-58.92},
  2:{name:'Febrero', tpv:36488.07,ef:12535,del:6246.60,oi:0,      ali:-24102.92,beb:-2814.38, nom:-894.16,  olab:0,       ss:-5401.12, alq:-3736.48,luz:-1136.58,gas:-1208.80,tel:-41.64,agu:-32.44, imp:-1050.62, ase:-741.55,mnt:-181.27,lim:-154.89,mkt:0,       ban:-77.59,oex:-220},
  3:{name:'Marzo',   tpv:51218.22,ef:24735,del:2380.19,oi:0,      ali:-19657.11,beb:-1335.17, nom:-18535.55,olab:0,       ss:-5965.81, alq:-3736.48,luz:-1037.03,gas:-1213.60,tel:-26.23,agu:-7.30,  imp:0,         ase:-685.91,mnt:-180.60,lim:-154.89,mkt:-250,    ban:-78.27,oex:0},
  4:{name:'Abril',   tpv:50444.27,ef:20100,del:4071.13,oi:19.80,  ali:-31566.24,beb:-1445.31, nom:-20288.09,olab:0,       ss:-5145.53, alq:-3736.48,luz:-1128.25,gas:-1918.40,tel:-41.82,agu:-32.44, imp:-11071.73, ase:-658.09,mnt:-489.89,lim:-154.89,mkt:-12.90, ban:-77.72,oex:-334.16},
};

const HOURLY = {
  10:{L:0,  M:0,  X:0,  J:25, V:0,  S:0,  D:0  },
  11:{L:10, M:11, X:6,  J:6,  V:8,  S:7,  D:6  },
  12:{L:43, M:44, X:51, J:54, V:50, S:74, D:72  },
  13:{L:148,M:133,X:215,J:175,V:224,S:281,D:307 },
  14:{L:264,M:218,X:371,J:350,V:412,S:474,D:477 },
  15:{L:146,M:143,X:227,J:188,V:240,S:258,D:261 },
  16:{L:80, M:74, X:106,J:93, V:109,S:168,D:110 },
  17:{L:51, M:53, X:70, J:64, V:73, S:104,D:81  },
  18:{L:69, M:62, X:92, J:92, V:87, S:115,D:73  },
  19:{L:138,M:134,X:189,J:164,V:177,S:166,D:141 },
  20:{L:295,M:270,X:408,J:372,V:405,S:339,D:326 },
  21:{L:393,M:333,X:545,J:548,V:632,S:610,D:471 },
  22:{L:241,M:218,X:354,J:353,V:493,S:536,D:316 },
  23:{L:64, M:71, X:111,J:86, V:195,S:233,D:81  },
};
