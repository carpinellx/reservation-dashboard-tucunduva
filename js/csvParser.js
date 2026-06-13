// Responsável apenas por transformar o texto CSV exportado pelo Google Sheets
// em uma lista de objetos de reserva. Não conhece nada sobre DOM ou rede.

const MIN_COLUMNS = 7;

/**
 * Faz o parsing do CSV exportado pela planilha "Fazenda Tucunduva".
 *
 * O CSV é organizado em blocos: uma linha de título ("Sábado" / "Domingo")
 * seguida pelas reservas daquele dia. Linhas que não têm o formato esperado
 * (cabeçalhos, linhas em branco, etc.) são ignoradas.
 *
 * @param {string} csvText
 * @returns {Array<{
 *   dia: 'sabado' | 'domingo' | '',
 *   mesa: string,
 *   nome: string,
 *   adultos: string,
 *   criancas: string,
 *   horario: string,
 *   area: string,
 *   obs: string,
 * }>}
 */
export function parseReservationsCsv(csvText) {
  const lines = csvText.split('\n').filter((line) => line.trim());
  const reservations = [];
  let secaoAtual = '';

  for (const line of lines) {
    const cols = line
      .split('","')
      .map((col) => col.replace(/^"/, '').replace(/"$/, '').trim());

    const primeiraColuna = (cols[1] || '').toLowerCase();

    if (primeiraColuna.includes('sábado')) {
      secaoAtual = 'sabado';
      continue;
    }

    if (primeiraColuna.includes('domingo')) {
      secaoAtual = 'domingo';
      continue;
    }

    if (cols.length < MIN_COLUMNS) continue;

    const mesa = cols[1];
    const nome = cols[2];

    if (!mesa || !nome) continue;
    if (Number.isNaN(Number(mesa))) continue;

    reservations.push({
      dia: secaoAtual,
      mesa,
      nome,
      adultos: cols[3] || '0',
      criancas: cols[4] || '0',
      horario: cols[5] || '',
      area: (cols[6] || '').toUpperCase(),
      obs: cols[7] || '',
    });
  }

  return reservations;
}
