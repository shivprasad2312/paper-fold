/* Built into sw.js with the exact local files from this release. */
const VERSION = __OFFLINE_VERSION__;
const ASSETS = __OFFLINE_ASSETS__;
const SCOPE = new URL(self.registration.scope);
const PREFIX = `ludo-club-precache:${encodeURIComponent(SCOPE.pathname)}:`;
const CACHE = `${PREFIX}${VERSION}`;
const SHELL = new URL('./index.html', SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      // A partial download must never replace a previously working release.
      await cache.addAll(ASSETS.map((asset) => new Request(new URL(asset, SCOPE), { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // Deliberately do not skipWaiting: an update must not interrupt a game.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CHECK_OFFLINE_CACHE' || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      const cache = await caches.open(CACHE);
      const available = new Set((await cache.keys()).map((request) => request.url));
      const missing = ASSETS.map((asset) => new URL(asset, SCOPE).href).filter((url) => !available.has(url));
      if (missing.length && event.data.repair) {
        // If storage was evicted, repair missing files when a connection exists.
        await cache.addAll(missing.map((url) => new Request(url, { cache: 'reload' })));
      }
      ready = missing.length === 0 || Boolean(event.data.repair);
    } catch { /* The app still works online if caching is blocked. */ }
    event.ports[0].postMessage({ ready });
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;

  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE);
      // Keep a session on one complete version. The next update activates after
      // all game tabs close, so navigation cannot mix old and new lazy chunks.
      // Precached files are same-origin and content-addressed by the release.
      // Some static servers send Vary: Origin; module requests include an Origin
      // header while the install fetch does not, so matching must ignore it.
      const cached = await cache.match(request.mode === 'navigate' ? SHELL : request, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
    } catch { /* Fall back to the network if CacheStorage becomes unavailable. */ }
    return fetch(request);
  })());
});
