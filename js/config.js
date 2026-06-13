// Constantes da aplicação — valores que antes estavam "soltos" no meio do código.

// URL CSV padrão usada caso o usuário não informe outra planilha no banner de configuração.
export const DEFAULT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1Sk1QLUn4ymAIRco2M7yD3ep5oW-G6iowcimP1P4SWJ0/gviz/tq?tqx=out:csv&gid=0';

// Intervalo de atualização automática dos dados.
export const REFRESH_INTERVAL_MS = 15000;

// Tolerância (em minutos) após o horário marcado para a reserva ainda aparecer na lista.
export const ARRIVAL_TOLERANCE_MINUTES = 15;

// Chave usada para persistir a ordenação escolhida pelo usuário.
export const SORT_STORAGE_KEY = 'sort';

export const DEFAULT_SORT = 'horario';
