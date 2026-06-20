// Controla o modo escuro. O botão só é visível no mobile (regra no CSS).
//
// O estado inicial já é aplicado por um script inline no <head> do
// index.html, antes do CSS ser pintado — isso evita o "flash" de tela
// clara antes deste módulo carregar. Aqui só sincronizamos o ícone do
// botão e cuidamos do clique.

const STORAGE_KEY = 'garcom:theme';

const root = document.documentElement;
const toggleButton = document.getElementById('theme-toggle');

function syncButton(isDark) {
  toggleButton.textContent = isDark ? '☀️' : '🌙';
  toggleButton.setAttribute('aria-pressed', String(isDark));
  toggleButton.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
}

function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // modo privado / localStorage indisponível — ignora silenciosamente
  }
}

export function initThemeToggle() {
  syncButton(root.getAttribute('data-theme') === 'dark');

  toggleButton.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') !== 'dark';

    if (next) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    syncButton(next);
    storeTheme(next ? 'dark' : 'light');
  });
}
