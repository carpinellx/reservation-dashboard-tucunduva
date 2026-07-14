// Regras de negócio para filtrar, ordenar e calcular valores das reservas.
// Não sabe nada sobre qual evento está selecionado — recebe os dados prontos.

import { ARRIVAL_TOLERANCE_MINUTES, CAFE_PRICING } from './config.js';
import { getAreaByMesa } from './utils.js';

/**
 * Chave única e estável para identificar uma reserva entre refreshes.
 * Usada para detectar quais linhas são novas após uma atualização.
 */
export function reservationKey(r) {
  return `${r.mesa}-${r.nome.trim().toLowerCase()}-${r.horario}`;
}

/**
 * Calcula o valor total de uma reserva de café da manhã.
 * Crianças até 5 anos (criancas_free) são gratuitas e não entram no cálculo.
 *
 * Extraído de render.js para cá porque é regra de negócio (precificação),
 * não responsabilidade da camada de apresentação — e para ser testável
 * sem precisar de DOM.
 */
export function calculateReservationTotal(reservation) {
  const adultos  = parseInt(reservation.adultos,      10) || 0;
  const criancas = parseInt(reservation.criancas,     10) || 0; // 6-10 anos, paga
  return adultos * CAFE_PRICING.adulto + criancas * CAFE_PRICING.crianca_paga;
}

const SORT_COMPARATORS = {
  mesa:    (a, b) => Number(a.mesa) - Number(b.mesa),
  nome:    (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  area:    (a, b) => a.area.localeCompare(b.area, 'pt-BR'),
  horario: (a, b) => (a.horario || '').localeCompare(b.horario || ''),
};

/**
 * Remove reservas cujo horário de chegada já ultrapassou a tolerância
 * operacional configurada.
 *
 * `reservation.eventDate` é um objeto `Date` completo e correto, resolvido
 * por `resolveReservationDate` em events.js — já considera eventos que
 * atravessam a meia-noite (ex: reserva de 02:25 numa festa 22:00–03:00
 * tem eventDate no dia seguinte ao da aba). Não re-parsear a string aqui
 * foi exatamente o que causava reservas de madrugada desaparecerem.
 */
function isWithinTolerance(reservation, now, serviceKey) {
// Apenas almoço utiliza tolerância de atraso.
  if (serviceKey !== 'almoco') {
    return true;
  }

  if (!reservation.horario || !reservation.eventDate) return true;

  const limit = new Date(reservation.eventDate);
  limit.setMinutes(limit.getMinutes() + ARRIVAL_TOLERANCE_MINUTES);

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