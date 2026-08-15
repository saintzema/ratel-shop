// Bumped to v5 to force-purge the caches the previous strategies bloated (the
// activate handler deletes every cache not matching the current version).
const CACHE_VERSION = 'fairprice-v5';
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
                            cache.put(request, clone);
                            // Evict down to the cap. The old version deleted exactly ONE
                            // entry per miss regardless of how far over the limit it was,
                            // so a browsing session that loaded hundreds of product images
                            // grew the cache without bound — it could never catch up.
                            cache.keys().then(keys => {
                                const excess = keys.length - 100;
                                for (let i = 0; i < excess; i++) cache.delete(keys[i]);
                            });
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
                    // Only keep the app-shell entry point as an offline fallback.
                    // This used to cache EVERY navigation — every product page, every
                    // search permutation — into an unbounded cache, which is how a
                    // browsing session accumulated ~111 MB of resources. Product pages
                    // are re-fetched fresh anyway, so storing them bought nothing but
                    // disk.
                    if (url.pathname === '/') {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    }
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

    // ─── Strategy 4: Static assets (JS, CSS, fonts) — Cache-first, IMMUTABLE ───
    //
    // This was stale-while-revalidate: it served the cached copy AND re-fetched
    // the asset over the network every single time, on every page load, forever.
    // Next.js fingerprints these files (/_next/static/chunks/main-<hash>.js), so
    // a given URL's contents can never change — a new build produces a new URL.
    // Re-fetching them bought nothing and was the bulk of a measured 1548
    // requests / 111 MB on a single homepage session, which on Nigerian mobile
    // data is somebody's bundle gone.
    //
    // Now: if it's cached, serve it and stop. No network at all.
    if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font' ||
        url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                }).catch(() => respondOrFallback(request));
            })
        );
        return;
    }

    // ─── Default: Network with cache fallback ───
    event.respondWith(
        fetch(request).catch(() => respondOrFallback(request))
    );
});
