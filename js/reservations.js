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

function isDentroDaTolerancia(reservation, now) {
  // Garantimos que a reserva tenha horário E a data para calcularmos corretamente
  if (!reservation.horario || !reservation.data) return true;

  const [horas, minutos] = reservation.horario.split(':').map(Number);
  
  // CORREÇÃO: Usamos reservation.data como ponto de partida
  const limite = new Date(reservation.data);
  
  // Ajustamos para o horário da reserva
  limite.setHours(horas, minutos, 0, 0);
  
  // Somamos os minutos de tolerância permitidos
  limite.setMinutes(limite.getMinutes() + ARRIVAL_TOLERANCE_MINUTES);

  // Verificamos se o momento atual ainda está dentro do limite
  return now <= limite;
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
    return areaOk && searchOk && isDentroDaTolerancia(r, now);
  });

  const comparator = SORT_COMPARATORS[sort] || SORT_COMPARATORS.horario;
  return filtered.sort(comparator);
}