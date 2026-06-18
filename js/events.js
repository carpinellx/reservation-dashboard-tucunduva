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
 * Recebe a lista de entradas do _index, parseia cada uma,
 * calcula os flags isToday/isPast e ordena cronologicamente.
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
      return {
        ...event,
        isToday: isSameDay(eventDay, today),
        isPast:  eventDay < today,
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

  const active = events.find((e) => {
    if (!e.isToday) return false;
    const window = getTimeWindow(e);
    if (!window) return false; // sem janela definida → não conta como "ativo agora"
    return currentMin >= window.startMin && currentMin <= window.endMin;
  });
  if (active) return active;

  const nextToday = events.find((e) => {
    if (!e.isToday) return false;
    return currentMin < getStartMinutes(e);
  });
  if (nextToday) return nextToday;

  const upcoming = events.find((e) => !e.isToday && !e.isPast);
  if (upcoming) return upcoming;

  return events[events.length - 1];
}
