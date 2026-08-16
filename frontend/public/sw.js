/// <reference lib="webworker" />

/*
 * GymTrack service worker.
 *
 * Strategy:
 * - Precaches the offline fallback, icons, and manifest at install time.
 * - Cache-first for hashed Next.js build assets (/_next/static/) — immutable.
 * - Stale-while-revalidate for app icons/manifest.
 * - Network-only with offline fallback for page navigations. HTML is never
 *   cached because pages are personalized behind auth.
 * - Never touches the API origin, same-origin /api routes, or the Sentry
 *   tunnel (/monitoring).
 *
 * Bump CACHE_VERSION whenever precached assets change — a byte-level diff in
 * this file is what triggers the browser's update flow.
 */

const CACHE_VERSION = 'v1';
const PRECACHE = `gymtrack-precache-${CACHE_VERSION}`;
const RUNTIME = `gymtrack-runtime-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheFirstAsset(pathname) {
  return pathname.startsWith('/_next/static/');
}

function isAppAsset(pathname) {
  return (
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/icon.svg' ||
    pathname === '/apple-icon.png' ||
    pathname === OFFLINE_URL
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin requests (Go API, image CDNs) are never intercepted.
  if (url.origin !== self.location.origin) return;

  const { pathname } = url;

  // Same-origin API routes (auth session) and the Sentry tunnel must always
  // reach the network.
  if (pathname.startsWith('/api/') || pathname.startsWith('/monitoring')) return;

  // Page navigations: network-first, offline fallback. Never cached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  // Immutable build assets: cache-first.
  if (isCacheFirstAsset(pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // App icons/manifest: stale-while-revalidate.
  if (isAppAsset(pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
