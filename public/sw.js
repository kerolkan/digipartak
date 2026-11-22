/* DIGI parťák – service worker: aplikace funguje i bez internetu. */
const VERSION = 'dp-v3';
const CORE = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/icons.js', './js/kb.js', './js/guides.js', './js/bot.js', './js/scam.js', './js/app.js',
  './img/senior-zena.jpg', './img/senior-muz.jpg',
  './img/icons/icon-192.png', './img/icons/icon-512.png', './img/icons/maskable-512.png',
  './img/icons/apple-touch-icon.png', './img/icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'dp-fonts').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Písmo z Google Fonts – uložit pro offline použití.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('dp-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch (err) { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // Stránky: nejdřív síť (čerstvý obsah), jinak cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // Ostatní soubory: nejdřív síť (opravy rad se projeví hned), bez sítě cache.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req)));
});
