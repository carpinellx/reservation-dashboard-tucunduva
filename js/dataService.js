import { parseReservationsCsv } from './csvParser.js';

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
