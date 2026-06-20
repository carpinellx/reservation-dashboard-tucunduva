import { REFRESH_INTERVAL_MS, DEFAULT_SORT } from './config.js';
import { fetchEventNames, fetchEventReservations } from './sheets.js';
import { buildEventList, findDefaultEvent } from './events.js';
import { selectVisibleReservations, reservationKey } from './reservations.js';
import {
  renderEventSelector,
  renderActiveEventHeader,
  renderStats,
  renderTable,
  renderCounter,
  adaptTableToEvent,
  setStatus,
} from './render.js';
import { formatDate } from './utils.js';
import { initThemeToggle } from './theme.js';

// ─── Estado ───────────────────────────────────────────────────────────────

const state = {
  events:        [],
  selectedEvent: null,
  reservations:  [],
  previousKeys:  new Set(),
  filter:        'all',
  sort:          DEFAULT_SORT,
};

// ─── DOM ──────────────────────────────────────────────────────────────────

const elements = {
  headerDate:    document.getElementById('header-date'),
  searchInput:   document.getElementById('search'),
  sortSelect:    document.getElementById('sort-select'),
  refreshButton: document.getElementById('btn-refresh'),
  eventList:     document.getElementById('event-list'),
  filterButtons: {
    all:     document.getElementById('btn-all'),
    externa: document.getElementById('btn-externa'),
    interna: document.getElementById('btn-interna'),
  },
};

// ─── Renderização ─────────────────────────────────────────────────────────

function isCafeEvent() {
  return state.selectedEvent?.serviceKey === 'cafe';
}

function updateView(newKeys = new Set()) {
  const isCafe = isCafeEvent();

  const visible = selectVisibleReservations(state.reservations, {
    area:   isCafe ? 'all' : state.filter, // café não tem filtro de área
    search: elements.searchInput.value,
    sort:   state.sort,
  });

  renderStats(state.reservations);
  renderTable(visible, newKeys, isCafe);
  renderCounter(visible.length, state.reservations.length);
}

function setFilter(filter) {
  state.filter = filter;
  Object.entries(elements.filterButtons).forEach(([key, btn]) => {
    const active = key === filter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  updateView();
}

// ─── Carregamento ─────────────────────────────────────────────────────────

async function loadEvents() {
  setStatus(null, 'Carregando eventos...');
  try {
    const tabNames     = await fetchEventNames();
    state.events       = buildEventList(tabNames);
    const defaultEvent = findDefaultEvent(state.events);

    renderEventSelector(state.events, defaultEvent?.tabName ?? null);

    if (defaultEvent) {
      await selectEvent(defaultEvent);
    } else {
      setStatus(false, 'Nenhum evento encontrado no índice');
    }
  } catch (error) {
    setStatus(false, `Erro ao carregar eventos: ${error.message}`);
  }
}

async function selectEvent(event) {
  state.selectedEvent = event;
  state.reservations  = [];
  state.previousKeys  = new Set();

  // Ao trocar de evento, reseta o filtro de área
  setFilter('all');

  renderEventSelector(state.events, event.tabName);
  renderActiveEventHeader(event);
  adaptTableToEvent(event.serviceKey === 'cafe');
  setStatus(null, `Carregando ${event.serviceLabel}...`);

  try {
    state.reservations = await fetchEventReservations(event.tabName);
    state.previousKeys = new Set(state.reservations.map(reservationKey));
    updateView();

    const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setStatus(true, `${state.reservations.length} reservas · ${horario}`);
  } catch (error) {
    setStatus(false, `Erro ao carregar evento: ${error.message}`);
  }
}

async function refreshCurrentEvent() {
  if (!state.selectedEvent) return;
  elements.refreshButton.classList.add('spinning');

  try {
    const oldKeys = state.previousKeys;
    const fresh   = await fetchEventReservations(
      state.selectedEvent.tabName,
      { bypassCache: true },
    );

    const newKeys = new Set(
      fresh
        .filter((r) => !oldKeys.has(reservationKey(r)))
        .map(reservationKey),
    );

    state.reservations = fresh;
    state.previousKeys = new Set(fresh.map(reservationKey));
    updateView(newKeys);

    const horario   = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novidades = newKeys.size > 0 ? ` · ${newKeys.size} nova${newKeys.size > 1 ? 's' : ''}` : '';
    setStatus(true, `${state.reservations.length} reservas · ${horario}${novidades}`);
  } catch {
    setStatus(false, 'Erro ao atualizar');
  } finally {
    setTimeout(() => elements.refreshButton.classList.remove('spinning'), 400);
  }
}

// ─── Eventos ──────────────────────────────────────────────────────────────

function registerEventListeners() {
  elements.eventList.addEventListener('click', (e) => {
    const card = e.target.closest('[data-tab]');
    if (!card) return;
    const event = state.events.find((ev) => ev.tabName === card.dataset.tab);
    if (event) selectEvent(event);
  });

  elements.searchInput.addEventListener('input', updateView);

  elements.sortSelect.addEventListener('change', () => {
    state.sort = elements.sortSelect.value;
    updateView();
  });

  elements.refreshButton.addEventListener('click', refreshCurrentEvent);

  elements.filterButtons.all.addEventListener('click',     () => setFilter('all'));
  elements.filterButtons.externa.addEventListener('click', () => setFilter('externa'));
  elements.filterButtons.interna.addEventListener('click', () => setFilter('interna'));
}

// ─── Init ─────────────────────────────────────────────────────────────────

function init() {
  elements.headerDate.textContent = formatDate();
  elements.sortSelect.value       = state.sort;
  initThemeToggle();
  registerEventListeners();
  loadEvents();
  setInterval(refreshCurrentEvent, REFRESH_INTERVAL_MS);
}

init();
