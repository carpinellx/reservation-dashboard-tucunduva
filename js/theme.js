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
  // O tema já foi aplicado pelo script inline no <head> — aqui só
  // sincronizamos o ícone do botão com o estado atual.
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
