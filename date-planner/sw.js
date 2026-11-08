// דייטון – Service Worker: עבודה בלי אינטרנט והתקנה כאפליקציה
const VERSION = "dateon-v8";
const SHELL = [
  "./", "index.html", "style.css", "fx.css", "themes.css", "games.css", "extras.css", "scroll.css",
  "places.js", "ideas.js", "app.js", "fx.js", "games.js", "extras.js", "scrollfx.js",
  "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png",
];
const CDN_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];
const IMG_HOSTS = ["image.pollinations.ai"];
const MAX_IMAGES = 60;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dateon-") && ![VERSION, "dateon-cdn", "dateon-img"].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

// קודם מהמטמון, ובמקביל רענון ברקע
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => {
    if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // ניווט – אם אין רשת, מגישים את האפליקציה מהמטמון
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => {
      caches.open(VERSION).then((c) => c.put("index.html", res.clone()));
      return res;
    }).catch(() => caches.match("index.html")));
    return;
  }
  if (url.origin === location.origin) { e.respondWith(staleWhileRevalidate(req, VERSION)); return; }
  if (CDN_HOSTS.includes(url.hostname)) { e.respondWith(staleWhileRevalidate(req, "dateon-cdn")); return; }
  if (IMG_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open("dateon-img").then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") { c.put(req, res.clone()); trim("dateon-img", MAX_IMAGES); }
      return res;
    }).catch(() => Response.error()));
  }
  // כל השאר (למשל ה-API של Claude) – ישירות לרשת
});
