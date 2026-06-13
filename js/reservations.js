import { ARRIVAL_TOLERANCE_MINUTES } from './config.js';
import { getDiaAtivo } from './utils.js';

const SORT_COMPARATORS = {
  mesa: (a, b) => Number(a.mesa) - Number(b.mesa),
  nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  area: (a, b) => a.area.localeCompare(b.area, 'pt-BR'),
  horario: (a, b) => (a.horario || '').localeCompare(b.horario || ''),
};

export function getReservationsDoDiaAtivo(reservations, referenceDate = new Date()) {
  const diaAtivo = getDiaAtivo(referenceDate);
  return reservations.filter((r) => r.dia === diaAtivo);
}

function isDentroDaTolerancia(reservation, now) {
  if (!reservation.horario) return true;

  const [horas, minutos] = reservation.horario.split(':').map(Number);
  const limite = new Date(now);
  limite.setHours(horas, minutos, 0, 0);
  limite.setMinutes(limite.getMinutes() + ARRIVAL_TOLERANCE_MINUTES);

  return now <= limite;
}

export function selectVisibleReservations(reservationsDoDiaAtivo, { area, search, sort }, now = new Date()) {
  const query = search.toLowerCase().trim();

  const filtered = reservationsDoDiaAtivo.filter((r) => {
    const areaOk = area === 'all' || r.area.toLowerCase() === area;

    const searchOk = !query
      || r.nome.toLowerCase().includes(query)
      || r.mesa.toString().includes(query);

    return areaOk && searchOk && isDentroDaTolerancia(r, now);
  });

  const comparator = SORT_COMPARATORS[sort] || SORT_COMPARATORS.horario;
  return filtered.sort(comparator);
}
