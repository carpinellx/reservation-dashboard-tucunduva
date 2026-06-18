// Regras de negócio para filtrar e ordenar as reservas de um evento.
// Não sabe nada sobre qual evento está selecionado — recebe os dados prontos.

import { ARRIVAL_TOLERANCE_MINUTES } from './config.js';

/**
 * Chave única e estável para identificar uma reserva entre refreshes.
 * Usada para detectar quais linhas são novas após uma atualização.
 */
export function reservationKey(r) {
  return `${r.mesa}-${r.nome.trim().toLowerCase()}-${r.horario}`;
}

const SORT_COMPARATORS = {
  mesa:    (a, b) => Number(a.mesa) - Number(b.mesa),
  nome:    (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  area:    (a, b) => a.area.localeCompare(b.area, 'pt-BR'),
  horario: (a, b) => (a.horario || '').localeCompare(b.horario || ''),
};

function isWithinTolerance(reservation, now) {
  if (!reservation.horario || !reservation.eventDate) {
    return true;
  }

  const [day, month, year] = reservation.eventDate
    .split('/')
    .map(Number);

  const [hours, minutes] = reservation.horario
    .split(':')
    .map(Number);

  const limit = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes + ARRIVAL_TOLERANCE_MINUTES
  );

  return now <= limit;
}

/**
 * Filtra por área, busca textual e tolerância de horário,
 * depois ordena pelo critério escolhido.
 *
 * @param {Array} reservations
 * @param {{ area: string, search: string, sort: string }} options
 * @param {Date} now
 */
export function selectVisibleReservations(reservations, { area, search, sort }, now = new Date()) {
  const query = search.toLowerCase().trim();

  const filtered = reservations.filter((r) => {
    const areaOk = area === 'all' || r.area.toLowerCase() === area;
    const searchOk =
      !query ||
      r.nome.toLowerCase().includes(query) ||
      r.mesa.toString().includes(query);

    // CORREÇÃO: Descomentado para o filtro de horário voltar a funcionar
    return areaOk && searchOk && isWithinTolerance(r, now);
  });

  const comparator = SORT_COMPARATORS[sort] || SORT_COMPARATORS.horario;
  return filtered.sort(comparator);
}