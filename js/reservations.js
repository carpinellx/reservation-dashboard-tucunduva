// Regras de negócio para selecionar quais reservas aparecem no painel:
// dia ativo, filtro de área, busca por texto, tolerância de horário e ordenação.

import { ARRIVAL_TOLERANCE_MINUTES } from './config.js';
import { getDiaAtivo } from './utils.js';

const SORT_COMPARATORS = {
  mesa: (a, b) => Number(a.mesa) - Number(b.mesa),
  nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  area: (a, b) => a.area.localeCompare(b.area, 'pt-BR'),
  horario: (a, b) => (a.horario || '').localeCompare(b.horario || ''),
};

/**
 * Retorna apenas as reservas do dia ativo (sábado ou domingo, conforme a
 * data/hora atual). É a base usada tanto para a tabela quanto para as
 * estatísticas, garantindo que ambas mostrem o mesmo recorte de dados.
 */
export function getReservationsDoDiaAtivo(reservations, referenceDate = new Date()) {
  const diaAtivo = getDiaAtivo(referenceDate);
  return reservations.filter((r) => r.dia === diaAtivo);
}

/**
 * Verifica se uma reserva ainda está dentro da janela de tolerância
 * (horário marcado + alguns minutos). Reservas sem horário definido
 * são consideradas sempre válidas.
 */
function isDentroDaTolerancia(reservation, now) {
  if (!reservation.horario) return true;

  const [horas, minutos] = reservation.horario.split(':').map(Number);
  const limite = new Date(now);
  limite.setHours(horas, minutos, 0, 0);
  limite.setMinutes(limite.getMinutes() + ARRIVAL_TOLERANCE_MINUTES);

  return now <= limite;
}

/**
 * Aplica filtro de área, busca textual e tolerância de horário, depois
 * ordena o resultado de acordo com o critério escolhido.
 *
 * @param {Array} reservationsDoDiaAtivo - já filtradas por `getReservationsDoDiaAtivo`
 * @param {{ area: 'all'|'externa'|'interna', search: string, sort: string }} options
 */
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
