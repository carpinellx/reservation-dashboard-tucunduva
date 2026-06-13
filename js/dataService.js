// Camada de acesso a dados: busca o CSV publicado pelo Google Sheets
// e devolve a lista de reservas já interpretada.

import { parseReservationsCsv } from './csvParser.js';

/**
 * Busca o CSV na URL informada e retorna a lista de reservas.
 * Lança um erro com uma mensagem amigável caso a busca ou o parsing falhem.
 *
 * @param {string} csvUrl
 * @param {{ bypassCache?: boolean }} [options]
 */
export async function fetchReservations(csvUrl, { bypassCache = false } = {}) {
  const url = bypassCache ? `${csvUrl}&_t=${Date.now()}` : csvUrl;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erro ao buscar planilha');
  }

  const csvText = await response.text();
  const reservations = parseReservationsCsv(csvText);

  if (reservations.length === 0) {
    throw new Error('Formato não reconhecido — verifique as colunas da planilha');
  }

  return reservations;
}
