const CACHE_NAME = "redscore-shell-v3";
const APP_SHELL = ["./", "./index.html", "./styles.css?v=3", "./app.js?v=3", "./data.js", "./manifest.webmanifest", "./assets/redscore-logo.png", "./assets/redscore-logo-full.png", "./assets/favicon.ico", "./assets/app-icon-192.png", "./assets/app-icon-512.png", "./assets/app-icon-maskable-192.png", "./assets/app-icon-maskable-512.png", "./assets/public-hero.png", "./assets/dashboard-storm.png", "./assets/lighthouse.png", "./assets/pantry.png", "./assets/warning-storm.png", "./assets/knowledge.png", "./assets/shelter.png", "./assets/icons-3d/home.png", "./assets/icons-3d/plan.png", "./assets/icons-3d/supplies.png", "./assets/icons-3d/map.png", "./assets/icons-3d/radio.png", "./assets/icons-3d/knowledge.png", "./assets/icons-3d/profile.png", "./assets/icons-3d/bell.png", "./assets/icons-3d/weather-warning.png", "./assets/icons-3d/water.png", "./assets/icons-3d/food.png", "./assets/icons-3d/special.png", "./assets/icons-3d/backpack.png", "./assets/icons-3d/medical.png", "./assets/icons-3d/household.png", "./assets/icons-3d/health.png", "./assets/icons-3d/hospital.png"];
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
