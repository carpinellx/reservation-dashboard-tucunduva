// Camada de acesso ao Google Sheets: busca a lista de eventos (_index)
// e os dados de reservas de cada aba individualmente.
//
// O acesso é feito via proxy (Google Apps Script Web App) em vez de
// consumir o endpoint gviz/tq diretamente. Isso mantém o SPREADSHEET_ID
// e o token fora do código público, e permite que a planilha fique privada.

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

/**
 * Lê a aba _index e devolve a lista de eventos.
 *
 * @returns {Array<{ tabName: string, customHours: string }>}
 */
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

/**
 * Busca as reservas de uma aba de evento específica.
 *
 * Recebe o objeto `event` completo (em vez de só `tabName`) para:
 * 1. Usar `event.serviceKey` como única fonte de verdade sobre o tipo do
 *    evento — evita re-derivar "é café?" com outra checagem de substring.
 * 2. Usar `event.date` via `resolveReservationDate` para calcular a data
 *    real de cada reserva, considerando eventos que atravessam a meia-noite.
 *
 * @param {{ tabName: string, serviceKey: string, date: Date }} event
 * @param {{ bypassCache?: boolean }} options
 * @returns {{ reservations: Array, skipped: Array }}
 */
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
