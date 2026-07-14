// Camada de apresentação: recebe dados prontos e atualiza o DOM.

import { escapeHtml } from './utils.js';
import { getAreaByMesa } from './utils.js';
import { reservationKey, calculateReservationTotal } from './reservations.js';
import { calcularStatusMesa } from './powerchef.js';

const tbody       = document.getElementById('tbody');
const thead       = document.querySelector('#reservas-table thead');
const emptyState  = document.getElementById('empty-state');
const statusDot   = document.getElementById('status-dot');
const statusText  = document.getElementById('status-text');
const eventList   = document.getElementById('event-list');
const eventHeader = document.getElementById('active-event-header');
const counterEl   = document.getElementById('visible-counter');
const thAreaValor    = document.getElementById('th-area-ou-valor');
const filterGroup    = document.getElementById('filter-group-area');
const sortOptionArea = document.getElementById('sort-option-area');
const btnTodasMesas  = document.getElementById('btn-todas-mesas');

const statElements = {
  reservas: document.getElementById('s-reservas'),
  adultos:  document.getElementById('s-adultos'),
  criancas: document.getElementById('s-criancas'),
  total:    document.getElementById('s-total'),
};

const CLOCK_ICON  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const PEOPLE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

function toNumber(v) { return parseInt(v, 10) || 0; }

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Seletor de eventos ────────────────────────────────────────────────────

export function renderEventSelector(events, selectedTabName) {
  if (events.length === 0) {
    eventList.innerHTML = '<span class="event-list-empty">Nenhum evento no índice</span>';
    return;
  }

  eventList.innerHTML = events.map((event) => {
    const isSelected = event.tabName === selectedTabName;
    const classes = [
      'event-card',
      isSelected    ? 'selected' : '',
      event.isToday ? 'today'    : '',
      event.isPast  ? 'past'     : '',
    ].filter(Boolean).join(' ');

    const badge = event.isToday ? '<span class="event-badge">Hoje</span>' : '';

    return `<button
      class="${classes}"
      data-tab="${escapeHtml(event.tabName)}"
      type="button"
      aria-pressed="${isSelected}"
    >
      <span class="event-service">${event.serviceIcon} ${escapeHtml(event.serviceLabel)}</span>
      <span class="event-date">${escapeHtml(event.weekdayLabel)}, ${escapeHtml(event.dateLabel)}</span>
      ${badge}
    </button>`;
  }).join('');
}

export function renderActiveEventHeader(event) {
  if (!event) {
    eventHeader.textContent = '';
    eventHeader.style.display = 'none';
    return;
  }
  eventHeader.style.display = 'flex';
  eventHeader.textContent =
    `${event.serviceIcon}  ${event.serviceLabel} · ${event.weekdayLabel}, ${event.dateLabel} · ${event.serviceHours}`;
}

// ─── Adaptações por tipo de evento ────────────────────────────────────────

/**
 * Ajusta a tabela e os filtros de acordo com o tipo de evento.
 * Para café: esconde filtros de área, troca o cabeçalho da coluna e
 * remove a opção "Área" do seletor de ordenação (reservation.area é
 * sempre vazio em eventos de café — ordenar por ela não teria efeito).
 *
 * @param {boolean} isCafe
 */
const THEAD_CAFE = `<tr>
  <th scope="col">Mesa</th>
  <th scope="col">Nome</th>
  <th scope="col">Horário</th>
  <th scope="col">Pessoas</th>
</tr>`;

const THEAD_ALMOCO = `<tr>
  <th scope="col">Mesa</th>
  <th scope="col">Nome</th>
  <th scope="col">Horário</th>
  <th scope="col">Pessoas</th>
  <th scope="col" class="col-status">Status</th>
</tr>`;

export function adaptTableToEvent(isCafe) {
  thead.innerHTML                = isCafe ? THEAD_CAFE : THEAD_ALMOCO;
  filterGroup.style.display      = isCafe ? 'none'     : 'flex';
  sortOptionArea.hidden          = isCafe;
  btnTodasMesas.style.display    = isCafe ? 'none'     : 'inline-flex';
}

// ─── Contador de visíveis ──────────────────────────────────────────────────

export function renderCounter(visibleCount, totalCount) {
  if (visibleCount === totalCount || totalCount === 0 || visibleCount === 0) {
    counterEl.hidden = true;
    return;
  }
  counterEl.textContent = `Mostrando ${visibleCount} de ${totalCount}`;
  counterEl.hidden = false;
}

// ─── Estatísticas ──────────────────────────────────────────────────────────

export function renderStats(reservations) {
  const adultos  = reservations.reduce((sum, r) => sum + toNumber(r.adultos), 0);
  const criancas = reservations.reduce((sum, r) =>
    sum + toNumber(r.criancas) + toNumber(r.criancas_free), 0);

  statElements.reservas.textContent = reservations.length;
  statElements.adultos.textContent  = adultos;
  statElements.criancas.textContent = criancas;
  statElements.total.textContent    = adultos + criancas;
}

// ─── Tabela ────────────────────────────────────────────────────────────────

function renderAreaOuValor(reservation, isCafe) {
  if (!isCafe) {
    const isInterna = getAreaByMesa(reservation.mesa) === 'interna';
    const cls = isInterna ? 'area-interna' : 'area-externa';
    const label = isInterna ? 'INTERNA' : 'EXTERNA';
    return `<span class="area-tag ${cls}">
      <span class="desktop-area">${label}</span>
      <span class="mobile-area">${isInterna ? 'INT' : 'EXT'}</span>
    </span>`;
  }

  return `<span class="valor-total">${formatCurrency(calculateReservationTotal(reservation))}</span>`;
}

function renderRow(reservation, index, isNew, isCafe, mesasOcupadas) {
  const adultos  = toNumber(reservation.adultos);
  const criancas = toNumber(reservation.criancas) + toNumber(reservation.criancas_free);
  const total    = adultos + criancas;

  const criancasTag = criancas > 0
    ? `<span class="criancas-tag">${criancas} cça${criancas > 1 ? 's' : ''}</span>`
    : '';

  // Observação aparece embaixo do nome em todos os eventos
  const obsMobile = reservation.obs
    ? `<div class="obs-mobile">📝 ${escapeHtml(reservation.obs)}</div>`
    : '';

  const rowAttrs = isNew
    ? 'class="is-new"'
    : `style="animation-delay:${index * 0.04}s"`;

  const mesaCell    = `<td><span class="mesa-num">${escapeHtml(reservation.mesa)}</span></td>`;
  const nomeCell    = `<td class="nome">${escapeHtml(reservation.nome.trim())}${obsMobile}</td>`;
  const horarioCell = `<td><span class="horario">${CLOCK_ICON} ${escapeHtml((reservation.horario || '').slice(0, 5))}</span></td>`;
  const pessoasCell = `<td><span class="pessoas">${PEOPLE_ICON} ${total} ${criancasTag}</span></td>`;

  if (isCafe) {
    // Café: Mesa | Nome (+obs) | Horário | Pessoas
    return `<tr ${rowAttrs}>${mesaCell}${nomeCell}${horarioCell}${pessoasCell}</tr>`;
  }

  // Almoço: Mesa | Nome (+obs) | Horário | Pessoas | Status (desktop)
  const status     = calcularStatusMesa(reservation.mesa, mesasOcupadas);
  const statusCell = status
    ? `<td class="col-status"><span class="mesa-status ${status.classe}" title="${status.extra}">${status.label}</span></td>`
    : `<td class="col-status">—</td>`;

  return `<tr ${rowAttrs}>${mesaCell}${nomeCell}${horarioCell}${pessoasCell}${statusCell}</tr>`;
}

function renderRowSalao(mesaInfo, index) {
  const { mesa, label, classe, reserva, mesaAberta } = mesaInfo;
  const isLivre = !reserva && !mesaAberta;

  const nomeCell = reserva
    ? escapeHtml(reserva.nome?.trim() || '')
    : mesaAberta
      ? `<span style="color:var(--texto-suave);font-style:italic">Sem reserva</span>`
      : '<span style="color:var(--texto-suave)">—</span>';

  const obsMobile = reserva?.obs
    ? `<div class="obs-mobile">📝 ${escapeHtml(reserva.obs)}</div>`
    : '';

  const horarioCell = reserva?.horario
    ? `<span class="horario">${CLOCK_ICON} ${escapeHtml(reserva.horario.slice(0, 5))}</span>`
    : '—';

  const adultos  = toNumber(reserva?.adultos);
  const criancas = toNumber(reserva?.criancas) + toNumber(reserva?.criancas_free);
  const total    = adultos + criancas;
  const pessoasCell = total > 0
    ? `<span class="pessoas">${PEOPLE_ICON} ${total}</span>`
    : mesaAberta?.pessoas
      ? `<span class="pessoas">${PEOPLE_ICON} ${mesaAberta.pessoas}</span>`
      : '—';

  // Salão usa o mesmo layout de 5 colunas do almoço
  return `<tr class="${isLivre ? 'mesa-livre' : ''}" style="animation-delay:${index * 0.04}s">
    <td><span class="mesa-num">${mesa}</span></td>
    <td class="nome">${nomeCell}${obsMobile}</td>
    <td>${horarioCell}</td>
    <td>${pessoasCell}</td>
    <td class="col-status"><span class="mesa-status ${classe}">${label}</span></td>
  </tr>`;
}

export function renderTable(reservations, newKeys = new Set(), isCafe = false, mesasOcupadas = []) {
  if (reservations.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tbody.innerHTML = reservations
    .map((r, i) => renderRow(r, i, newKeys.has(reservationKey(r)), isCafe, mesasOcupadas))
    .join('');
}

export function renderTabelaSalao(visaoSalao) {
  emptyState.style.display = 'none';
  tbody.innerHTML = visaoSalao
    .map((mesaInfo, i) => renderRowSalao(mesaInfo, i))
    .join('');
}

// ─── Status ────────────────────────────────────────────────────────────────

export function setStatus(ok, message) {
  statusDot.className    = 'dot ' + (ok === true ? 'ok' : ok === false ? 'err' : '');
  statusText.textContent = message;
}