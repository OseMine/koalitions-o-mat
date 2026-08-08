const VERSION = 'v2';
const STATIC_CACHE = `koalitions-o-mat-static-${VERSION}`;
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

// Diese Dateien gehören zur App-Shell: Wenn sich die Seite geändert hat, müssen
// sie neu vom Netz geholt werden, damit keine veralteten Dateien zurückbleiben.
const APP_SHELL_ASSETS = ['./styles.css', './script.js', './manifest.webmanifest', './index.html'];

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

// Vergleicht zwei Responses byte-genau.
async function responsesEqual(a, b) {
    const [at, bt] = await Promise.all([a.text(), b.text()]);
    return at === bt;
}

// Network-first für Navigations-/HTML-Requests: Liefert immer die frische Seite
// vom Server, wenn online. Hat sich der Inhalt geändert, wird die alte
// App-Shell verworfen, sodass CSS/JS beim nächsten Abruf neu geladen werden.
async function navigationRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    try {
        const response = await fetch(request);
        if (!response || !response.ok) {
            return cached || (await cache.match('./index.html'));
        }
        const copy = response.clone();
        const fresh = response.clone();
        let changed = !cached;
        if (cached) {
            changed = !(await responsesEqual(cached, fresh));
        }
        if (changed) {
            // Inhalt hat sich geändert → veraltete Shell-Dateien entfernen.
            await Promise.all(APP_SHELL_ASSETS.map(p => cache.delete(p)));
        }
        await cache.put(request, copy);
        return response;
    } catch (err) {
        // Offline: auf gecachte Version zurückfallen.
        return cached || (await cache.match('./index.html'));
    }
}

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

    // Navigations-/HTML-Requests: network-first mit automatischer Invalidierung.
    if (request.mode === 'navigate') {
        event.respondWith(navigationRequest(request));
        return;
    }

    // Alle anderen Requests (CSS, JS, Manifest, CDN): cache-first mit Auffüllen.
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