import { PROXY_URL, PROXY_TOKEN } from './config.js';
import { parseReservationsCsv } from './csvParser.js';
import { resolveReservationDate } from './events.js';

// Tempo máximo de espera por resposta do proxy (ms).
const FETCH_TIMEOUT_MS = 10_000;

async function fetchSheet(sheetName, bypassCache = false) {
  const params = new URLSearchParams({
    sheet: sheetName,
    token: PROXY_TOKEN,
  });
  if (bypassCache) params.append('_t', String(Date.now()));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${PROXY_URL}?${params}`, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status} ao buscar aba "${sheetName}"`);
  }

  const text = await response.text();

  // O proxy retorna JSON com { error: '...' } em caso de falha conhecida
  // (ex: token inválido, aba não encontrada).
  if (text.trimStart().startsWith('{')) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { /* não era JSON — segue */ }
    if (parsed?.error) throw new Error(parsed.error);
  }

  return text;
}

export async function fetchEventNames() {
  const csvText = await fetchSheet('_index');

  return csvText
    .split('\n')
    .map((line) => {
      if (!line.trim()) return null;

      const cols = line
        .split(',')
        .map((col) => col.replace(/^"|"$/g, '').trim());

      const tabName = cols[0];
      if (!tabName) return null;

      return {
        tabName,
        customHours: cols[1] || '',
      };
    })
    .filter(Boolean);
}

// Recebe o evento completo (não só tabName) para usar serviceKey como
// fonte de verdade do tipo e calcular eventDate via resolveReservationDate.
export async function fetchEventReservations(event, { bypassCache = false } = {}) {
  const csvText = await fetchSheet(event.tabName, bypassCache);

  const isCafe = event.serviceKey === 'cafe';
  const { reservations, skipped } = parseReservationsCsv(csvText, { isCafe });

  return {
    reservations: reservations.map((reservation) => ({
      ...reservation,
      eventDate: resolveReservationDate(event, reservation.horario),
    })),
    skipped,
  };
}
