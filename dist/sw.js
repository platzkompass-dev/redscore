const CACHE_NAME = "redscore-shell-v46";
const APP_SHELL = ["./favicon.png", "./favicon.ico", "./", "./index.html", "./styles.css?v=31", "./app.js?v=35", "./analytics.js?v=1", "./i18n.js?v=14", "./data.js?v=5", "./manifest.webmanifest?v=6", "./assets/redscore-logo.png?v=5", "./assets/redscore-logo-full.png?v=6", "./assets/bbk-logo.svg?v=2", "./assets/favicon.ico?v=5", "./assets/favicon-32x32.png?v=5", "./assets/app-icon-180.png?v=5", "./assets/app-icon-192.png?v=5", "./assets/app-icon-512.png?v=5", "./assets/app-icon-maskable-192.png?v=5", "./assets/app-icon-maskable-512.png?v=5", "./assets/public-hero.png", "./assets/dashboard-storm.png", "./assets/lighthouse.png", "./assets/pantry.png", "./assets/warning-storm.png", "./assets/knowledge.png", "./assets/shelter.png", "./assets/icons-3d/home.png", "./assets/icons-3d/plan.png", "./assets/icons-3d/supplies.png", "./assets/icons-3d/map.png", "./assets/icons-3d/radio.png", "./assets/icons-3d/knowledge.png", "./assets/icons-3d/profile.png", "./assets/icons-3d/bell.png", "./assets/icons-3d/weather-warning.png", "./assets/icons-3d/water.png", "./assets/icons-3d/food.png", "./assets/icons-3d/special.png", "./assets/icons-3d/backpack.png", "./assets/icons-3d/medical.png", "./assets/icons-3d/household.png", "./assets/icons-3d/health.png", "./assets/icons-3d/hospital.png", "./assets/icons-3d/settings.png", "./assets/icons-3d/battery.png", "./assets/icons-3d/euro-banknote.png", "./assets/icons-3d/coat.png", "./assets/icons-3d/light-bulb.png"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    })));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && url.origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});
