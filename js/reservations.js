import { ARRIVAL_TOLERANCE_MINUTES } from './config.js';
import { getAreaByMesa } from './utils.js';

export function reservationKey(r) {
  return `${r.mesa}-${r.nome.trim().toLowerCase()}-${r.horario}`;
}

const SORT_COMPARATORS = {
  mesa:    (a, b) => Number(a.mesa) - Number(b.mesa),
  nome:    (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  area:    (a, b) => a.area.localeCompare(b.area, 'pt-BR'),
  horario: (a, b) => (a.horario || '').localeCompare(b.horario || ''),
};

function isWithinTolerance(reservation, now, serviceKey) {
  // Apenas almoço utiliza tolerância de atraso.
  if (serviceKey !== 'almoco') return true;

  if (!reservation.horario || !reservation.eventDate) return true;

  const limit = new Date(reservation.eventDate);
  limit.setMinutes(limit.getMinutes() + ARRIVAL_TOLERANCE_MINUTES);

  return now <= limit;
}

export function selectVisibleReservations(reservations, { area, search, sort, serviceKey }, now = new Date()) {
  const query = search.toLowerCase().trim();

  const filtered = reservations.filter((r) => {
    const areaOk   = area === 'all' || getAreaByMesa(r.mesa) === area;
    const searchOk = !query || r.nome.toLowerCase().includes(query) || r.mesa.toString().includes(query);
    return areaOk && searchOk && isWithinTolerance(r, now, serviceKey);
  });

  const comparator = SORT_COMPARATORS[sort] || SORT_COMPARATORS.horario;
  return filtered.sort(comparator);
}