// מאתר הברגות – Service Worker: עבודה בלי אינטרנט והתקנה כאפליקציה
const VERSION = 'threads-v1';
const SHELL = [
  './', 'index.html', 'style.css', 'data.js', 'thread-math.js', 'app.js', 'model3d.js',
  'vendor/three.module.min.js', 'vendor/OrbitControls.js', 'vendor/RoomEnvironment.js',
  'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('threads-') && k !== VERSION && k !== 'threads-fonts').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    // גופנים: מהמטמון, ואם אין – מהרשת ושמירה
    e.respondWith(caches.open('threads-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // קבצי האתר: מהרשת כשיש (כדי לקבל עדכונים), אחרת מהמטמון
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
