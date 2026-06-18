// Camada de apresentação: recebe dados prontos e atualiza o DOM.

import { escapeHtml } from './utils.js';
import { reservationKey } from './reservations.js';
import { CAFE_PRICING } from './config.js';

const tbody       = document.getElementById('tbody');
const emptyState  = document.getElementById('empty-state');
const statusDot   = document.getElementById('status-dot');
const statusText  = document.getElementById('status-text');
const eventList   = document.getElementById('event-list');
const eventHeader = document.getElementById('active-event-header');
const counterEl   = document.getElementById('visible-counter');
const thAreaValor = document.getElementById('th-area-ou-valor');
const filterGroup = document.getElementById('filter-group-area');

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
 * Para café: esconde filtros de área e troca o cabeçalho da coluna.
 * Para outros: restaura o estado padrão.
 *
 * @param {boolean} isCafe
 */
export function adaptTableToEvent(isCafe) {
  thAreaValor.textContent     = isCafe ? 'Valor' : 'Área';
  filterGroup.style.display   = isCafe ? 'none'  : 'flex';
}

// ─── Contador de visíveis ──────────────────────────────────────────────────

export function renderCounter(visibleCount, totalCount) {
  if (visibleCount === totalCount || totalCount === 0) {
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
    const isInterna = reservation.area === 'INTERNA';
    const cls = isInterna ? 'area-interna' : 'area-externa';
    return `<span class="area-tag ${cls}">
      <span class="desktop-area">${escapeHtml(reservation.area)}</span>
      <span class="mobile-area">${isInterna ? 'INT' : 'EXT'}</span>
    </span>`;
  }

  const adultos  = toNumber(reservation.adultos);
  const criancas = toNumber(reservation.criancas); // 6-10, paga
  const total    = adultos * CAFE_PRICING.adulto + criancas * CAFE_PRICING.crianca_paga;

  return `<span class="valor-total">${formatCurrency(total)}</span>`;
}

function renderRow(reservation, index, isNew, isCafe) {
  const adultos  = toNumber(reservation.adultos);
  const criancas = toNumber(reservation.criancas) + toNumber(reservation.criancas_free);
  const total    = adultos + criancas;

  const criancasTag = criancas > 0
    ? `<span class="criancas-tag">${criancas} cça${criancas > 1 ? 's' : ''}</span>`
    : '';

  const obsMobile = reservation.obs
    ? `<div class="obs-mobile">📝 ${escapeHtml(reservation.obs)}</div>`
    : '';

  const rowAttrs = isNew
    ? 'class="is-new"'
    : `style="animation-delay:${index * 0.04}s"`;

  return `<tr ${rowAttrs}>
    <td><span class="mesa-num">${escapeHtml(reservation.mesa)}</span></td>
    <td class="nome">${escapeHtml(reservation.nome.trim())}${obsMobile}</td>
    <td>
      <span class="horario">
        ${CLOCK_ICON}
        ${escapeHtml((reservation.horario || '').slice(0, 5))}
      </span>
    </td>
    <td>
      <span class="pessoas">
        ${PEOPLE_ICON}
        ${total} ${criancasTag}
      </span>
    </td>
    <td>${renderAreaOuValor(reservation, isCafe)}</td>
    <td class="obs">${reservation.obs ? escapeHtml(reservation.obs) : '—'}</td>
  </tr>`;
}

export function renderTable(reservations, newKeys = new Set(), isCafe = false) {
  if (reservations.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = reservations
    .map((r, i) => renderRow(r, i, newKeys.has(reservationKey(r)), isCafe))
    .join('');
}

// ─── Status ────────────────────────────────────────────────────────────────

export function setStatus(ok, message) {
  statusDot.className    = 'dot ' + (ok === true ? 'ok' : ok === false ? 'err' : '');
  statusText.textContent = message;
}
