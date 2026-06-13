const MIN_COLUMNS = 7;

export function parseReservationsCsv(csvText) {
  const lines = csvText.split('\n').filter((line) => line.trim());
  const reservations = [];
  let currentsection = '';

  for (const line of lines) {
    const cols = line
      .split('","')
      .map((col) => col.replace(/^"/, '').replace(/"$/, '').trim());

    const firstColumn = (cols[1] || '').toLowerCase();

    if (firstColumn.includes('sábado')) {
      currentsection = 'sabado';
      continue;
    }

    if (firstColumn.includes('domingo')) {
      currentsection = 'domingo';
      continue;
    }

    if (cols.length < MIN_COLUMNS) continue;

    const mesa = cols[1];
    const nome = cols[2];

    if (!mesa || !nome) continue;
    if (Number.isNaN(Number(mesa))) continue;

    reservations.push({
      dia: currentsection,
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
