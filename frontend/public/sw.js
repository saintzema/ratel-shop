const CACHE_VERSION = 'fairprice-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Core app shell — these are pre-cached on install
const APP_SHELL = [
    '/',
    '/manifest.json',
    '/logo.png',
    '/offline',
];

// ──────────────────────────────────────────────
// INSTALL — Pre-cache the app shell
// ──────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('[SW] Pre-caching app shell');
            return cache.addAll(APP_SHELL).catch(err => {
                // Don't fail install if some URLs aren't available yet
                console.warn('[SW] Some app shell URLs failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// ──────────────────────────────────────────────
// ACTIVATE — Clear old caches from previous versions
// ──────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => !name.startsWith(CACHE_VERSION))
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// caches.match() resolves to `undefined` when nothing is cached — passing that straight
// to event.respondWith() throws "Failed to convert value to 'Response'" and the browser
// reports the whole request as a network error (net::ERR_FAILED), even though the actual
// fetch may have simply failed for an unrelated transient reason. Almost none of the API
// GET routes (orders, notifications, negotiations, kyc, payouts, ...) are ever pre-cached,
// so every one of them hit this on any network blip. Every fallback below now guarantees
// a real Response no matter what.
function respondOrFallback(request) {
    return caches.match(request).then(cached => {
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    });
}

// ──────────────────────────────────────────────
// FETCH — Smart caching strategies per request type
// ──────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (POST, PUT, DELETE)
    if (request.method !== 'GET') return;

    // Skip chrome-extension, devtools, and external URLs
    if (!url.origin.startsWith('http') || url.hostname === 'localhost' && url.port === '3001') return;

    // ─── Strategy 1: API responses (products, sellers) — Network-first with cache fallback ───
    if (url.pathname.startsWith('/api/products') || url.pathname.startsWith('/api/sellers') || url.pathname.startsWith('/api/search-cache')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => respondOrFallback(request))
        );
        return;
    }

    // ─── Strategy 2: Images — Cache-first, fetch on miss ───
    if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(IMAGE_CACHE).then(cache => {
                            // Limit image cache size — evict oldest when > 100 entries
                            cache.keys().then(keys => {
                                if (keys.length > 100) cache.delete(keys[0]);
                            });
                            cache.put(request, clone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Return a transparent 1x1 pixel for failed images (no broken icons)
                    return new Response(
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                });
            })
        );
        return;
    }

    // ─── Strategy 3: Page navigations — Stale-while-revalidate with offline fallback ───
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache the latest page response
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Network failed — try cache first, then offline page, then a synthetic
                    // fallback if even '/offline' was never cached.
                    return caches.match(request).then(cached => {
                        if (cached) return cached;
                        return caches.match('/offline').then(offline => offline || new Response(
                            '<html><body>You appear to be offline.</body></html>',
                            { status: 503, headers: { 'Content-Type': 'text/html' } }
                        ));
                    });
                })
        );
        return;
    }

    // ─── Strategy 4: Static assets (JS, CSS, fonts) — Cache-first with network fallback ───
    if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font' ||
        url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                const fetchPromise = fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                }).catch(() => cached || respondOrFallback(request));

                // Return cached immediately, update in background (stale-while-revalidate)
                return cached || fetchPromise;
            })
        );
        return;
    }

    // ─── Default: Network with cache fallback ───
    event.respondWith(
        fetch(request).catch(() => respondOrFallback(request))
    );
});
