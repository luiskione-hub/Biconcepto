
// ─── MAPA DE PÁGINAS ──────────────────────────────────────────
const PAGES = {
  dashboard:      [pgDashboard,       afDashboard],
  alerts:         [pgAlerts,          null],
  employees:      [pgEmployees,       null],
  shifts:         [pgShifts,          null],
  schedule:       [pgSchedule,        null],
  scheduleConfig: [pgScheduleConfig,  null],
  vacations:      [pgVacations,       null],
  sales:          [pgSales,           afSales],
  bank:           [pgBank,            null],
  profit:         [pgProfit,          afProfit],
  results:        [pgResults,         afResults],
  legal:          [pgLegal,           null],
  costs:          [pgCosts,           null],
  objectives:     [pgObjectives,      null],
  importer:       [pgImporter,        null],
  forecast:       [pgForecast,        afForecast],
  jibble:         [pgJibble,          afJibble],
  reports:        [pgReports,         null],
  stocks:         [pgStocks,          null],
  stockOrder:     [pgStockOrder,      null],
  users:          [pgUsers,           null],
};

const ROLE_LABELS = {
  admin:     'Administrador',
  gerente:   'Gerente',
  encargado: 'Encargado',
  reader:    'Solo lectura',
};
