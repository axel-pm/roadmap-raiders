/* Roadmap Raiders service worker — offline play after first visit.
   Network-first for navigations (new deploys land), stale-while-revalidate
   for static assets/art/audio, cache-first for cross-origin fonts. */

const VERSION = 'rr-v1';
const CACHE = `rr-cache-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Precache the app shell: the entry HTML plus its hashed JS/CSS assets
  // (parsed from the HTML) so the game boots offline after the first visit.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const base = ['./', './index.html', './manifest.webmanifest'];
    try {
      const res = await fetch('./index.html', { cache: 'no-store' });
      const html = await res.text();
      await cache.put('./index.html', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
      await cache.put('./', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
      const assets = [...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
      const fontCss = [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com[^"]+)"/g)].map((m) => m[1]);
      await Promise.all([...base, ...assets, ...fontCss].map((u) =>
        cache.add(u).catch(() => { /* best-effort per asset */ })));
    } catch {
      await cache.addAll(base).catch(() => {});
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith('rr-cache-') && k !== CACHE).map((k) => caches.delete(k)),
    )).then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return /\/(assets|art|audio|icons)\//.test(url.pathname)
    || /\.(webp|png|jpg|svg|m4a|woff2?|css|js)$/.test(url.pathname);
}

function isFont(url) {
  return url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // navigations: network-first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // cross-origin fonts: cache-first (opaque ok)
  if (isFont(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)),
    );
    return;
  }

  // same-origin static: stale-while-revalidate
  if (url.origin === self.location.origin && isAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      }),
    );
  }
});
