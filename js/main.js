import { REFRESH_INTERVAL_MS, DEFAULT_SORT } from './config.js';
import { fetchEventNames, fetchEventReservations } from './sheets.js';
import { buildEventList, findDefaultEvent } from './events.js';
import { selectVisibleReservations, reservationKey } from './reservations.js';
import { fetchMesasOcupadas, montarVisaoSalao } from './powerchef.js';
import {
  renderEventSelector,
  renderActiveEventHeader,
  renderStats,
  renderTable,
  renderTabelaSalao,
  renderCounter,
  adaptTableToEvent,
  setStatus,
} from './render.js';
import { formatDate, getAreaByMesa } from './utils.js';
import { initThemeToggle } from './theme.js';

const state = {
  events:            [],
  selectedEvent:     null,
  reservations:      [],
  previousKeys:      new Set(),
  filter:            'all',
  sort:              DEFAULT_SORT,
  mesasOcupadas:     [],
  mostrarTodasMesas: false,  // false = tabela de reservas | true = visão do salão
};

const elements = {
  headerDate:    document.getElementById('header-date'),
  searchInput:   document.getElementById('search'),
  sortSelect:    document.getElementById('sort-select'),
  refreshButton: document.getElementById('btn-refresh'),
  eventList:     document.getElementById('event-list'),
  btnTodasMesas: document.getElementById('btn-todas-mesas'),
  filterButtons: {
    all:     document.getElementById('btn-all'),
    externa: document.getElementById('btn-externa'),
    interna: document.getElementById('btn-interna'),
  },
};

function isCafeEvent() {
  return state.selectedEvent?.serviceKey === 'cafe';
}

function updateView(newKeys = new Set()) {
  const isCafe = isCafeEvent();

  renderStats(state.reservations);

  if (state.mostrarTodasMesas) {
    // Aplica o filtro de área (Externa/Interna) igual à view de reservas.
    let visaoSalao = montarVisaoSalao(state.mesasOcupadas, state.reservations);

    if (state.filter !== 'all') {
      visaoSalao = visaoSalao.filter((m) => getAreaByMesa(m.mesa) === state.filter);
    }

    renderTabelaSalao(visaoSalao);
    renderCounter(0, 0);
  } else {
const reservasVisiveis = selectVisibleReservations(state.reservations, {
  area: isCafe ? 'all' : state.filter,
  search: elements.searchInput.value,
  sort: state.sort,
  serviceKey: state.selectedEvent?.serviceKey,
});
    renderTable(reservasVisiveis, newKeys, isCafe, state.mesasOcupadas);
    renderCounter(reservasVisiveis.length, state.reservations.length);
  }
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

function toggleTodasMesas() {
  state.mostrarTodasMesas = !state.mostrarTodasMesas;

  elements.btnTodasMesas?.classList.toggle('active', state.mostrarTodasMesas);
  elements.btnTodasMesas?.setAttribute('aria-pressed', String(state.mostrarTodasMesas));

  updateView();
}

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
  state.selectedEvent    = event;
  state.reservations     = [];
  state.previousKeys     = new Set();
  state.mostrarTodasMesas = false; // volta pra view padrão ao trocar de evento

  setFilter('all');
  elements.btnTodasMesas?.classList.remove('active');
  elements.btnTodasMesas?.setAttribute('aria-pressed', 'false');

  renderEventSelector(state.events, event.tabName);
  renderActiveEventHeader(event);
  adaptTableToEvent(event.serviceKey === 'cafe');
  setStatus(null, `Carregando ${event.serviceLabel}...`);

  try {
    const [{ reservations, skipped }, mesasOcupadas] = await Promise.all([
      fetchEventReservations(event),
      fetchMesasOcupadas(),
    ]);

    if (skipped.length > 0) {
      console.warn(`${skipped.length} linha(s) ignoradas em "${event.tabName}":`, skipped);
    }

    state.mesasOcupadas = mesasOcupadas;
    state.reservations  = reservations;
    state.previousKeys  = new Set(reservations.map(reservationKey));

    // Revela o conteúdo principal (estava oculto até o primeiro carregamento)
    document.getElementById('stats-bar').style.display       = '';
    document.querySelector('.toolbar').style.display         = '';
    document.querySelector('.table-container').style.display = '';

    updateView();

    const horario     = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const avisoLinhas = skipped.length > 0 ? ` · ⚠️ ${skipped.length} linha(s) ignoradas` : '';
    setStatus(true, `${reservations.length} reservas · ${horario}${avisoLinhas}`);
  } catch (error) {
    setStatus(false, `Erro ao carregar evento: ${error.message}`);
  }
}

async function refreshCurrentEvent() {
  if (!state.selectedEvent) return;
  elements.refreshButton.classList.add('spinning');

  try {
    const oldKeys = state.previousKeys;

    const [{ reservations: fresh, skipped }, mesasOcupadas] = await Promise.all([
      fetchEventReservations(state.selectedEvent, { bypassCache: true }),
      fetchMesasOcupadas(),
    ]);

    if (skipped.length > 0) {
      console.warn(`${skipped.length} linha(s) ignoradas em "${state.selectedEvent.tabName}":`, skipped);
    }

    const newKeys = new Set(
      fresh
        .filter((r) => !oldKeys.has(reservationKey(r)))
        .map(reservationKey),
    );

    state.mesasOcupadas = mesasOcupadas;
    state.reservations  = fresh;
    state.previousKeys  = new Set(fresh.map(reservationKey));
    updateView(newKeys);

    const horario     = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const novidades   = newKeys.size > 0 ? ` · ${newKeys.size} nova${newKeys.size > 1 ? 's' : ''}` : '';
    const avisoLinhas = skipped.length > 0 ? ` · ⚠️ ${skipped.length} ignorada(s)` : '';
    setStatus(true, `${fresh.length} reservas · ${horario}${novidades}${avisoLinhas}`);
  } catch (error) {
    console.error(`Falha ao atualizar "${state.selectedEvent.tabName}":`, error);
    setStatus(false, 'Erro ao atualizar');
  } finally {
    elements.refreshButton.classList.remove('spinning');
  }
}

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
  
  elements.btnTodasMesas?.addEventListener('click', toggleTodasMesas);

  elements.filterButtons.all.addEventListener('click',     () => setFilter('all'));
  elements.filterButtons.externa.addEventListener('click', () => setFilter('externa'));
  elements.filterButtons.interna.addEventListener('click', () => setFilter('interna'));
}

function init() {
  elements.headerDate.textContent = formatDate();
  elements.sortSelect.value       = state.sort;

  // Esconde o conteúdo principal até um evento ser carregado
  document.getElementById('stats-bar').style.display       = 'none';
  document.querySelector('.toolbar').style.display         = 'none';
  document.querySelector('.table-container').style.display = 'none';

  initThemeToggle();
  registerEventListeners();
  loadEvents();
  setInterval(refreshCurrentEvent, REFRESH_INTERVAL_MS);
}

init();