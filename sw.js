const VERSION = 'v1';
const STATIC_CACHE = `koalitions-o-mat-${VERSION}`;
const DATA_CACHE = `koalitions-o-mat-data-${VERSION}`;

const PRECACHE = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.webmanifest',
    './config.json',
    './elections.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Nur GET-Anfragen, gleicher Ursprung oder das ECharts-CDN
    const isEchartsCdn = url.origin !== location.origin && url.hostname === 'cdn.jsdelivr.net';
    if (request.method !== 'GET') return;
    if (url.origin !== location.origin && !isEchartsCdn) return;

    // Nach JSON-Daten (config, elections, election-data): network-first, damit
    // sie aktualisiert werden, wenn online, aber offline trotzdem verfügbar sind.
    if (request.destination === '' && url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(DATA_CACHE).then(cache => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request)
                    .then(cached => cached || caches.match('./index.html')))
        );
        return;
    }

    // Alle anderen Requests (HTML, CSS, JS, Manifest, CDN): cache-first mit Auffüllen.
    event.respondWith(
        caches.match(request)
            .then(cached => cached || fetch(request).then(response => {
                if (response && response.ok && request.method === 'GET') {
                    const copy = response.clone();
                    const cacheName = url.origin === location.origin ? STATIC_CACHE : DATA_CACHE;
                    caches.open(cacheName).then(cache => cache.put(request, copy));
                }
                return response;
            }))
    );
});