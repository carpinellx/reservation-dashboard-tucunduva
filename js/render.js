import { escapeHtml } from './utils.js';

const tbody = document.getElementById('tbody');
const emptyState = document.getElementById('empty-state');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const statElements = {
  reservas: document.getElementById('s-reservas'),
  adultos: document.getElementById('s-adultos'),
  criancas: document.getElementById('s-criancas'),
  total: document.getElementById('s-total'),
};

const CLOCK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

const PEOPLE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

function toNumber(value) {
  return parseInt(value, 10) || 0;
}

export function renderStats(reservations) {
  const adultos = reservations.reduce((sum, r) => sum + toNumber(r.adultos), 0);
  const criancas = reservations.reduce((sum, r) => sum + toNumber(r.criancas), 0);

  statElements.reservas.textContent = reservations.length;
  statElements.adultos.textContent = adultos;
  statElements.criancas.textContent = criancas;
  statElements.total.textContent = adultos + criancas;
}

function renderRow(reservation, index) {
  const adultos = toNumber(reservation.adultos);
  const criancas = toNumber(reservation.criancas);
  const total = adultos + criancas;

  const criancasTag = criancas > 0
    ? `<span class="criancas-tag">${criancas} cça${criancas > 1 ? 's' : ''}</span>`
    : '';

  const isInterna = reservation.area.toUpperCase() === 'INTERNA';
  const areaClass = isInterna ? 'area-interna' : 'area-externa';

  const obsMobile = reservation.obs
    ? `<div class="obs-mobile">📝 ${escapeHtml(reservation.obs)}</div>`
    : '';

  return `<tr style="animation-delay:${index * 0.04}s">
    <td><span class="mesa-num">${escapeHtml(reservation.mesa)}</span></td>
    <td class="nome">${escapeHtml(reservation.nome.trim())}${obsMobile}</td>
    <td>
      <span class="horario">
        ${CLOCK_ICON}
        ${escapeHtml(reservation.horario)}
      </span>
    </td>
    <td>
      <span class="pessoas">
        ${PEOPLE_ICON}
        ${total} ${criancasTag}
      </span>
    </td>
    <td>
      <span class="area-tag ${areaClass}">
        <span class="desktop-area">${escapeHtml(reservation.area)}</span>
        <span class="mobile-area">${isInterna ? 'INT' : 'EXT'}</span>
      </span>
    </td>
    <td class="obs">${reservation.obs ? escapeHtml(reservation.obs) : '—'}</td>
  </tr>`;
}

export function renderTable(reservations) {
  if (reservations.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = reservations.map(renderRow).join('');
}

export function setStatus(ok, message) {
  statusDot.className = 'dot ' + (ok === true ? 'ok' : ok === false ? 'err' : '');
  statusText.textContent = message;
}
