// Service Worker — Fazenda Tucunduva
//
// Estratégias de cache:
//   - Arquivos estáticos (HTML, CSS, JS, imagens): cache-first
//     → carrega instantaneamente; atualiza cache em background.
//   - Dados do Google Sheets: network-first com fallback para cache
//     → sempre tenta buscar dados frescos; se offline, serve o último
//     conjunto de dados que foi buscado com sucesso.

const STATIC_CACHE  = 'garcom-static-v2';
const DATA_CACHE    = 'garcom-data-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/sheets.js',
  './js/events.js',
  './js/csvParser.js',
  './js/reservations.js',
  './js/render.js',
  './js/main.js',
  './js/utils.js',
  './assets/logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-apple.png',
];

// ─── Instalação ───────────────────────────────────────────────────────────
// Pré-carrega todos os arquivos estáticos no cache.
// skipWaiting() faz o SW ativar imediatamente, sem esperar as abas fecharem.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ─── Ativação ─────────────────────────────────────────────────────────────
// Remove versões antigas do cache para liberar espaço.
// clients.claim() faz o SW assumir o controle das abas abertas imediatamente.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// ─── Interceptação de requests ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dados da planilha → network-first (dados frescos sempre que possível)
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Arquivos estáticos → cache-first (resposta instantânea)
  event.respondWith(cacheFirst(request));
});

// ─── Estratégias de cache ─────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Recurso não está em cache e não há conexão — nada a fazer.
    return new Response('Recurso indisponível offline.', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sem conexão → devolve o último dado em cache, se existir.
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Sem conexão e sem dados em cache.', { status: 503 });
  }
}
