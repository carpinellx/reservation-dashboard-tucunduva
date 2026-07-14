// Lógica de negócio dos eventos: interpreta nomes de abas, monta a lista
// de eventos e decide qual deve ser selecionado automaticamente.

import { SERVICES } from './config.js';

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
];

// Ícone padrão para eventos personalizados (qualquer nome que não seja Almoço/Café)
const CUSTOM_EVENT_ICON = '🎉';

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Dado um evento, retorna seu horário de início em minutos desde meia-noite.
 * Usado para ordenar e para detectar qual evento está ativo agora.
 *
 * Para eventos personalizados com horário definido (ex: "19:00-22:00"),
 * extrai o início da string. Sem horário definido, ordena no final do dia.
 */
function getStartMinutes(event) {
  if (SERVICES[event.serviceKey]) {
    const [h, m] = SERVICES[event.serviceKey].start.split(':').map(Number);
    return h * 60 + m;
  }

  if (event.serviceHours) {
    const startPart = event.serviceHours.split(/[–\-]/)[0].trim();
    const pieces = startPart.split(':').map(Number);
    if (pieces.length >= 1 && !Number.isNaN(pieces[0])) {
      return pieces[0] * 60 + (pieces[1] || 0);
    }
  }

  return 23 * 60 + 59; // sem horário definido → ordena no fim do dia
}

/**
 * Retorna { startMin, endMin } para verificar se um evento está ativo agora.
 * Para eventos sem horário, retorna null (não tem janela definida).
 */
function getTimeWindow(event) {
  if (SERVICES[event.serviceKey]) {
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    return {
      startMin: toMin(SERVICES[event.serviceKey].start),
      endMin:   toMin(SERVICES[event.serviceKey].end),
    };
  }

  if (event.serviceHours) {
    const parts = event.serviceHours.split(/[–\-]/).map((s) => s.trim());
    if (parts.length === 2) {
      const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      return { startMin: toMin(parts[0]), endMin: toMin(parts[1]) };
    }
  }

  return null; // evento sem janela de horário definida
}

/**
 * Mesma janela de getTimeWindow, mas em objetos `Date` completos (não só
 * minutos do dia) — necessário para comparar corretamente com `now` quando
 * o evento atravessa a meia-noite (ex: "22:00–03:00"). Nesse caso, o fim
 * da janela cai no dia *seguinte* ao da aba.
 *
 * Retorna null se o evento não tem janela de horário definida.
 */
function getEffectiveWindow(event) {
  const window = getTimeWindow(event);
  if (!window) return null;

  const start = new Date(event.date);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(window.startMin);

  const end = new Date(event.date);
  end.setHours(0, 0, 0, 0);
  end.setMinutes(window.endMin);

  // Fim "antes" do início → atravessa a meia-noite → término é no dia seguinte.
  if (window.endMin <= window.startMin) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

/**
 * Resolve a data real (dia + hora) de uma reserva a partir do horário dela
 * e da data da aba do evento. Necessário porque, em eventos que atravessam
 * a meia-noite (ex: aba "17/06/2026 Jantar", horário 22:00–03:00), um
 * horário como "02:25" pertence ao dia *seguinte* (18/06) — não ao dia da
 * aba — e isso muda o resultado de qualquer comparação com "agora".
 *
 * O resultado é propagado como `reservation.eventDate` (um Date completo)
 * para que `isWithinTolerance` em reservations.js possa calcular o limite
 * correto sem re-parsear a data e reproduzir o mesmo erro.
 *
 * @param {object} event    Evento parseado por parseTabName.
 * @param {string} horario  ex: "02:25"
 * @returns {Date}
 */
export function resolveReservationDate(event, horario) {
  const date = new Date(event.date);
  date.setHours(0, 0, 0, 0);

  if (!horario) return date;

  const [h, m] = horario.split(':').map(Number);
  if (Number.isNaN(h)) return date;

  const window = getTimeWindow(event);
  const horarioMin = h * 60 + (m || 0);

  // Evento atravessa a meia-noite e este horário é menor que o início dele
  // → pertence à madrugada do dia seguinte, não ao dia da aba.
  if (window && window.endMin <= window.startMin && horarioMin < window.startMin) {
    date.setDate(date.getDate() + 1);
  }

  date.setHours(h, m || 0, 0, 0);
  return date;
}

/**
 * Transforma um nome de aba + horário opcional em um objeto de evento.
 *
 * Formato esperado do nome da aba: "DD/MM/AAAA Nome do Evento"
 * Exemplos:
 *   "20/06/2026 Almoço"          → serviço conhecido
 *   "21/06/2026 Café"            → serviço conhecido
 *   "03/07/2026 Noite de Caldos" → evento personalizado
 *
 * @param {{ tabName: string, customHours: string }}
 */
function parseTabName({ tabName, customHours }) {
  const spaceIdx = tabName.indexOf(' ');
  if (spaceIdx === -1) return null;

  const datePart    = tabName.substring(0, spaceIdx);
  const servicePart = tabName.substring(spaceIdx + 1).trim();

  const pieces = datePart.split('/').map(Number);
  if (pieces.length !== 3 || pieces.some(Number.isNaN)) return null;

  const [day, month, year] = pieces;
  const date = new Date(year, month - 1, day);

  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) return null;

  // Detecta serviço conhecido; qualquer outro nome é evento personalizado.
  let serviceKey, serviceLabel, serviceIcon, serviceHours;
  const nameLower = servicePart.toLowerCase();

  if (nameLower.includes('almo')) {
    serviceKey   = 'almoco';
    serviceLabel = SERVICES.almoco.label;
    serviceIcon  = SERVICES.almoco.icon;
    serviceHours = `${SERVICES.almoco.start}–${SERVICES.almoco.end}`;
  } else if (nameLower.includes('caf')) {
    serviceKey   = 'cafe';
    serviceLabel = SERVICES.cafe.label;
    serviceIcon  = SERVICES.cafe.icon;
    serviceHours = `${SERVICES.cafe.start}–${SERVICES.cafe.end}`;
  } else {
    serviceKey   = 'custom';
    serviceLabel = servicePart;           // usa o nome exatamente como foi digitado
    serviceIcon  = CUSTOM_EVENT_ICON;
    serviceHours = customHours || '';     // horário da coluna B do _index (se houver)
  }

  return {
    tabName,
    date,
    dateLabel:    `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
    weekdayLabel: WEEKDAY_NAMES[date.getDay()],
    serviceKey,
    serviceLabel,
    serviceIcon,
    serviceHours,
    isToday: false,
    isPast:  false,
  };
}

/**
 * Constrói a lista de eventos visíveis a partir das entradas do _index,
 * ordenada cronologicamente.
 *
 * Eventos passados são removidos da lista. O cálculo de `isPast` usa a
 * janela de horário real do evento (não só o dia civil da aba) — isso
 * garante que um evento que começa à noite e atravessa a meia-noite
 * (ex: aba "17/06", horário "22:00–03:00") continue na lista enquanto
 * ainda estiver em andamento de madrugada, mesmo já sendo o dia 18/06.
 * O bug anterior era exatamente aqui: o `isPast` comparava só a data da
 * aba com hoje, então "17/06 < 18/06 → isPast = true" era calculado
 * assim que o relógio virava, e o evento sumia do seletor mesmo rolando.
 *
 * @param {Array<{ tabName: string, customHours: string }>} entries
 * @param {Date} now
 */
export function buildEventList(entries, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return entries
    .map(parseTabName)
    .filter(Boolean)
    .map((event) => {
      const eventDay = new Date(
        event.date.getFullYear(),
        event.date.getMonth(),
        event.date.getDate(),
      );

      // Usa o fim real da janela de horário para não marcar como passado
      // um evento noturno que ainda está rolando de madrugada.
      const effectiveWindow = getEffectiveWindow(event);
      const isPast = effectiveWindow
        ? now > effectiveWindow.end
        : eventDay < today;

      return {
        ...event,
        isToday: isSameDay(eventDay, today),
        isPast,
      };
    })
    .filter((event) => !event.isPast)
    .sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
      return getStartMinutes(a) - getStartMinutes(b);
    });
}

/**
 * Decide qual evento selecionar automaticamente ao abrir o painel.
 *
 * Prioridade:
 * 1. Evento de hoje dentro da janela de horário (incluindo personalizados com horário).
 * 2. Próximo evento de hoje que ainda não começou.
 * 3. Próximo evento futuro.
 * 4. Evento mais recente (fallback).
 *
 * @param {Array} events
 * @param {Date} now
 */
export function findDefaultEvent(events, now = new Date()) {
  if (events.length === 0) return null;

  const currentMin = now.getHours() * 60 + now.getMinutes();

  // Usa datas reais (não isToday + minutos do dia) para que um evento
  // noturno que atravessa a meia-noite (ex: 22:00–03:00) continue sendo
  // detectado como "ativo agora" de madrugada, mesmo sendo o dia seguinte.
  const active = events.find((e) => {
    const window = getEffectiveWindow(e);
    if (!window) return false;
    return now >= window.start && now <= window.end;
  });
  if (active) return active;

  const nextToday = events.find((e) => {
    if (!e.isToday) return false;
    return currentMin < getStartMinutes(e);
  });
  if (nextToday) return nextToday;

  // buildEventList já filtra eventos passados — isPast é sempre false aqui.
  const upcoming = events.find((e) => !e.isToday);
  if (upcoming) return upcoming;

  return events[events.length - 1];
}
