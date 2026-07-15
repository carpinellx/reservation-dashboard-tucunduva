import { SERVICES } from './config.js';

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
];

const CUSTOM_EVENT_ICON = '🎉';

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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

  return null;
}

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

export function resolveReservationDate(event, horario) {
  const date = new Date(event.date);
  date.setHours(0, 0, 0, 0);

  if (!horario) return date;

  const [h, m] = horario.split(':').map(Number);
  if (Number.isNaN(h)) return date;

  const window = getTimeWindow(event);
  const horarioMin = h * 60 + (m || 0);

  // Horário de madrugada em evento que atravessa a meia-noite -> dia seguinte.
  if (window && window.endMin <= window.startMin && horarioMin < window.startMin) {
    date.setDate(date.getDate() + 1);
  }

  date.setHours(h, m || 0, 0, 0);
  return date;
}

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
    serviceLabel = servicePart;
    serviceIcon  = CUSTOM_EVENT_ICON;
    serviceHours = customHours || '';
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

export function findDefaultEvent(events, now = new Date()) {
  if (events.length === 0) return null;

  const currentMin = now.getHours() * 60 + now.getMinutes();

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
