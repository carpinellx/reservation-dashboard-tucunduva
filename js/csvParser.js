// Transforma o texto CSV exportado pelo Google Sheets em uma lista de
// objetos de reserva. Suporta dois layouts de colunas:
//
// Almoço:  empty | MESA | NOME | ADULTO | CRIANÇA | HORÁRIO | ÁREA | OBS
// Café:    empty | MESA | NOME | ADULTO | CRIANÇA 6-10 | CRIANÇA -5 | HORÁRIO | OBS

const MIN_COLUMNS = 7;

/**
 * @param {string}  csvText
 * @param {{ isCafe?: boolean }} options
 */
export function parseReservationsCsv(csvText, { isCafe = false } = {}) {
  const lines = csvText.split('\n').filter((line) => line.trim());
  const reservations = [];

  for (const line of lines) {
    const cols = line
      .split('","')
      .map((col) => col.replace(/^"/, '').replace(/"$/, '').trim());

    if (cols.length < MIN_COLUMNS) continue;

    const mesa = cols[1];
    const nome = cols[2];

    if (!mesa || !nome) continue;
    if (Number.isNaN(Number(mesa))) continue;

    if (isCafe) {
      // ADULTO=3 | CRIANÇA 6-10=4 | CRIANÇA -5=5 | HORÁRIO=6 | OBS=7
      reservations.push({
        mesa,
        nome,
        adultos:       cols[3] || '0',
        criancas:      cols[4] || '0', // 6-10 anos (paga)
        criancas_free: cols[5] || '0', // até 5 anos (gratuita)
        horario:       cols[6] || '',
        area:          '',             // café não tem área
        obs:           cols[7] || '',
      });
    } else {
      // ADULTO=3 | CRIANÇA=4 | HORÁRIO=5 | ÁREA=6 | OBS=7
      reservations.push({
        mesa,
        nome,
        adultos:       cols[3] || '0',
        criancas:      cols[4] || '0',
        criancas_free: '0',
        horario:       cols[5] || '',
        area:          (cols[6] || '').toUpperCase(),
        obs:           cols[7] || '',
      });
    }
  }

  return reservations;
}
