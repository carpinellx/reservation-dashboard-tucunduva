// Service Worker — Fazenda Tucunduva
//
// Estratégia: network-first para tudo.
// Sempre busca do servidor quando há conexão — garante arquivos frescos.
// Cai para cache apenas se estiver offline.

const CACHE_NAME = 'garcom-v3';

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

// Instalação: pré-carrega os arquivos no cache para uso offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// Ativação: remove caches de versões anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: network-first para tudo.
// Online  → servidor (sempre atualizado) + atualiza cache em background.
// Offline → cache (última versão conhecida).
self.addEventListener('fetch', (event) => {
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Sem conexão.', { status: 503 });
  }
}
