// Camada de acesso ao Google Sheets: busca a lista de eventos (_index)
// e os dados de reservas de cada aba individualmente.

import { SPREADSHEET_ID } from './config.js';
import { parseReservationsCsv } from './csvParser.js';

const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

async function fetchSheet(sheetName, bypassCache = false) {
  const params = new URLSearchParams({ sheet: sheetName });
  if (bypassCache) params.append('_t', String(Date.now()));

  const response = await fetch(`${BASE_URL}&${params}`);
  if (!response.ok) throw new Error(`Erro ao buscar aba "${sheetName}"`);

  return response.text();
}

/**
 * Lê a aba _index e devolve a lista de eventos.
 *
 * Cada linha do _index pode ter:
 *   - Coluna A: nome da aba  ex: "03/07/2026 Noite de Caldos"
 *   - Coluna B: horários     ex: "19:00-22:00"  (opcional — só necessário pra eventos personalizados)
 *
 * @returns {Array<{ tabName: string, customHours: string }>}
 */
export async function fetchEventNames() {
  const csvText = await fetchSheet('_index');

  return csvText
    .split('\n')
    .map((line) => {
      if (!line.trim()) return null;

      // Divide a linha CSV respeitando aspas (ex: "20/06/2026 Almoço","")
      const cols = line
        .split(',')
        .map((col) => col.replace(/^"|"$/g, '').trim());

      const tabName = cols[0];
      if (!tabName) return null;

      return {
        tabName,
        customHours: cols[1] || '', // ex: "19:00-22:00" — vazio pra serviços conhecidos
      };
    })
    .filter(Boolean);
}

/**
 * Busca as reservas de uma aba de evento específica.
 *
 * @param {string} tabName  ex: "03/07/2026 Noite de Caldos"
 * @param {{ bypassCache?: boolean }} options
 */
export async function fetchEventReservations(tabName, { bypassCache = false } = {}) {
  const csvText = await fetchSheet(tabName, bypassCache);
  const isCafe  = tabName.toLowerCase().includes('caf');
  return parseReservationsCsv(csvText, { isCafe });
}
