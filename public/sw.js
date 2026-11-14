/* Climate Chaser service worker.
 * Policy:
 *  - Never cache credential-bearing URLs (appid=/key=).
 *  - Open-Meteo API: network-first, cache fallback (stale data is labelled by the app).
 *  - Same-origin static assets: cache-first (they are content-hashed by Vite).
 *  - Navigations: network-first, falling back to the cached shell or /offline.html.
 *  - Map tiles / radar tiles / images you didn't select: network-only (quota).
 */

const VERSION = "climate-chaser-v1";
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;
const PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
const API_HOSTS = new Set([
  "api.open-meteo.com",
  "air-quality-api.open-meteo.com",
  "geocoding-api.open-meteo.com",
]);
const MAX_API_ENTRIES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("climate-chaser-") && !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCredentialUrl(url) {
  return /appid=|api_key=|apikey=|[?&]key=/i.test(url);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Credential-bearing requests bypass the cache entirely.
  if (isCredentialUrl(url.href)) return;

  // Open-Meteo API: network-first with cache fallback.
  if (API_HOSTS.has(url.hostname)) {
    event.respondWith(networkFirst(request, API_CACHE, MAX_API_ENTRIES));
    return;
  }

  // Archive endpoint caches especially well but is larger; same strategy.
  if (url.hostname === "archive-api.open-meteo.com") {
    event.respondWith(networkFirst(request, API_CACHE, MAX_API_ENTRIES));
    return;
  }

  // Navigations: network-first, shell fallback, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(async () => {
          const shell = await caches.match("/");
          return shell ?? caches.match("/offline.html");
        })
    );
    return;
  }

  // Same-origin static assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
  }
  // Everything else (tiles, fonts CDN, reverse-geocode) goes to the network.
});

async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache, maxEntries);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const overflow = keys.length - maxEntries;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}
