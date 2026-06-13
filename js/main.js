// Ponto de entrada da aplicação: mantém o estado em memória, conecta os
// eventos da interface e orquestra as outras camadas (dados, regras e render).

import {
  DEFAULT_SHEET_CSV_URL,
  REFRESH_INTERVAL_MS,
  SORT_STORAGE_KEY,
  DEFAULT_SORT,
} from './config.js';
import { fetchReservations } from './dataService.js';
import { getReservationsDoDiaAtivo, selectVisibleReservations } from './reservations.js';
import { renderStats, renderTable, setStatus } from './render.js';
import { buildCsvUrl, formatDate } from './utils.js';

function readStoredSort() {
  try {
    return localStorage.getItem(SORT_STORAGE_KEY) || DEFAULT_SORT;
  } catch {
    // localStorage pode não estar disponível (ex.: modo privado).
    return DEFAULT_SORT;
  }
}

function storeSort(sort) {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sort);
  } catch {
    // Ignora silenciosamente — preferência de ordenação não é crítica.
  }
}

const state = {
  reservations: [],
  filter: 'all',
  sort: readStoredSort(),
  csvUrl: DEFAULT_SHEET_CSV_URL,
};

const elements = {
  headerDate: document.getElementById('header-date'),
  configBanner: document.getElementById('config-banner'),
  configError: document.getElementById('config-error'),
  sheetUrlInput: document.getElementById('sheet-url'),
  btnCarregar: document.getElementById('btn-carregar'),
  searchInput: document.getElementById('search'),
  sortSelect: document.getElementById('sort-select'),
  refreshButton: document.getElementById('btn-refresh'),
  filterButtons: {
    all: document.getElementById('btn-all'),
    externa: document.getElementById('btn-externa'),
    interna: document.getElementById('btn-interna'),
  },
};

function updateView() {
  const reservationsDoDia = getReservationsDoDiaAtivo(state.reservations);

  const visibleReservations = selectVisibleReservations(reservationsDoDia, {
    area: state.filter,
    search: elements.searchInput.value,
    sort: state.sort,
  });

  renderStats(reservationsDoDia);
  renderTable(visibleReservations);
}

function setFilter(filter) {
  state.filter = filter;

  Object.entries(elements.filterButtons).forEach(([key, button]) => {
    const isActive = key === filter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  updateView();
}

function showConfigError(message) {
  elements.configError.textContent = message;
  elements.configError.style.display = 'block';
}

function hideConfigError() {
  elements.configError.style.display = 'none';
}

async function loadInitialData() {
  setStatus(null, 'Carregando...');

  try {
    state.reservations = await fetchReservations(state.csvUrl);
    elements.configBanner.style.display = 'none';
    updateView();

    const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setStatus(true, `${state.reservations.length} reservas carregadas · ${horario}`);
  } catch (error) {
    showConfigError(error.message);
    elements.configBanner.style.display = 'block';
    setStatus(false, 'Erro ao carregar planilha');
  }
}

async function refreshData() {
  elements.refreshButton.classList.add('spinning');

  try {
    state.reservations = await fetchReservations(state.csvUrl, { bypassCache: true });
    updateView();

    const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setStatus(true, `${state.reservations.length} reservas · atualizado às ${horario}`);
  } catch {
    setStatus(false, 'Erro ao atualizar');
  } finally {
    setTimeout(() => elements.refreshButton.classList.remove('spinning'), 400);
  }
}

function handleCarregarClick() {
  hideConfigError();

  const rawUrl = elements.sheetUrlInput.value.trim();
  if (!rawUrl) {
    showConfigError('Cole o link da planilha do Google Sheets.');
    return;
  }

  const csvUrl = buildCsvUrl(rawUrl);
  if (!csvUrl) {
    showConfigError('Link inválido — confirme se é o link de compartilhamento da planilha do Google Sheets.');
    return;
  }

  state.csvUrl = csvUrl;
  loadInitialData();
}

function registerEventListeners() {
  elements.searchInput.addEventListener('input', updateView);

  elements.sortSelect.addEventListener('change', () => {
    state.sort = elements.sortSelect.value;
    storeSort(state.sort);
    updateView();
  });

  elements.refreshButton.addEventListener('click', refreshData);
  elements.btnCarregar.addEventListener('click', handleCarregarClick);

  elements.filterButtons.all.addEventListener('click', () => setFilter('all'));
  elements.filterButtons.externa.addEventListener('click', () => setFilter('externa'));
  elements.filterButtons.interna.addEventListener('click', () => setFilter('interna'));
}

function init() {
  elements.headerDate.textContent = formatDate();
  elements.sortSelect.value = state.sort;

  registerEventListeners();
  loadInitialData();

  setInterval(refreshData, REFRESH_INTERVAL_MS);
}

init();
