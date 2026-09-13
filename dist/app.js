import { assessmentQuestions, defaultState, knowledgeArticles, navItems, sources, supplyGroups, tasks, verifiedPlaces } from "./data.js";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const fileInput = document.querySelector("#family-photo-input");
const STORAGE_KEY = "redscore-state-v1";
const LEGACY_STORAGE_KEY = "plans-state-v2";
const CONTACT_EMAIL = "administration@redscore.de";
const clone = value => JSON.parse(JSON.stringify(value));
const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const icon = (name, className = "icon3d") => `<img class="${className}" src="assets/icons-3d/${name}.png" alt="" />`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const fmt = n => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n);

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    if (!saved) return clone(defaultState);
    return {
      ...clone(defaultState), ...saved,
      profile: { ...defaultState.profile, ...saved.profile },
      household: { ...defaultState.household, ...saved.household },
      assessment: { ...defaultState.assessment, ...saved.assessment },
      supplies: { ...defaultState.supplies, ...saved.supplies },
      media: { ...defaultState.media, ...saved.media },
      settings: { ...defaultState.settings, ...saved.settings },
      ui: { ...defaultState.ui, ...saved.ui },
    };
  } catch { return clone(defaultState); }
}
let state = loadState();
let warningState = { status: "loading", warnings: [], checkedAt: null, fallback: false };
let warningRequested = false;
const LIVE_CACHE_KEY = "redscore-live-lage-v1";
const LIVE_REFRESH_MS = 60_000;
const liveCache = (() => {
  try { return JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || localStorage.getItem("plans-live-lage-v1")) || {}; }
  catch { return {}; }
})();
let liveState = {
  status: navigator.onLine ? "idle" : "offline",
  events: Array.isArray(liveCache.events) ? liveCache.events : [],
  sources: Array.isArray(liveCache.sources) ? liveCache.sources : [],
  lastSyncAt: liveCache.lastSyncAt || null,
  receivedAt: liveCache.receivedAt || null,
  scope: liveCache.scope || "for_you",
  filter: liveCache.filter || "all",
  error: null,
};
let liveRequest = null;
let liveRefreshTimer = null;
let liveClockTimer = null;
const save = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast("Diese Änderung konnte lokal nicht gespeichert werden."); }
};
function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 3200);
}

function score() {
  if (!state.assessment.completedAt || assessmentQuestions.some(([id]) => typeof state.assessment.answers[id] !== "boolean")) return null;
  return Math.round(assessmentQuestions.filter(([id]) => state.assessment.answers[id]).length / assessmentQuestions.length * 100);
}
function supplyPercent() {
  const recorded = supplyGroups.filter(group => state.supplies[group.id] !== null);
  if (!recorded.length) return null;
  return Math.round(recorded.reduce((sum, group) => sum + clamp(state.supplies[group.id] / group.target, 0, 1), 0) / supplyGroups.length * 100);
}
function hashRoute() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  return route || "home";
}
function navigate(route) {
  if (!state.authenticated && route !== "public") {
    state.ui.modal = "login";
    render();
    return;
  }
  location.hash = `#/${route}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const routeLabel = route => ({ home: "Start", plan: "Mein Plan", supplies: "Vorräte", map: "Schutz in deiner Nähe", warnschutz: "Warnschutz", knowledge: "Wissen", profile: "Profil" })[route] || "Start";
function brand(light = false) {
  return `<button class="wordmark ${light ? "light" : ""}" data-route="${state.authenticated ? "home" : "public"}" aria-label="RedScore Startseite"><img src="assets/redscore-logo.png" alt="" /><span>Red<span>Score</span></span><small>KATASTROPHENVORBEREITUNG FÜR ALLE.</small></button>`;
}
function footer(dark = false) {
  return `<footer class="site-footer ${dark ? "dark" : ""}">
    ${brand(false)}
    <nav><a href="#about">Über RedScore</a><a href="${sources.bbkChecklist}" target="_blank" rel="noreferrer">BBK-Quellen</a><a href="mailto:${CONTACT_EMAIL}?subject=Datenschutz%20bei%20RedScore">Datenschutz</a><a href="mailto:${CONTACT_EMAIL}?subject=Impressum%20RedScore">Impressum</a><a href="mailto:${CONTACT_EMAIL}">Kontakt</a></nav>
    <p>Orientiert an offiziellen Empfehlungen des BBK. · <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
  </footer>`;
}

function publicHeader() {
  return `<header class="public-header">${brand(true)}<nav>
    <button data-scroll="top" class="active">⌂ Start</button><button data-scroll="how">▣ So funktioniert’s</button><button data-route="knowledge">▰ Wissen</button><button data-scroll="about">⌖ Über RedScore</button>
  </nav><div class="public-actions"><button class="search-button" aria-label="Suche">⌕</button><button class="outline" data-open-login>Einloggen</button><button class="green" data-open-login>Kostenlos registrieren</button><span>DE⌄</span></div></header>`;
}
function categoryCard(iconName, title, copy, route) {
  return `<button class="public-category" data-route="${route}">${icon(iconName, "public-icon")}<strong>${title}</strong><span>${copy}</span></button>`;
}
function renderPublic() {
  document.body.className = "public-mode";
  const categories = [
    ["supplies", "Vorräte", "Reichen deine Vorräte für den Ernstfall?", "supplies"],
    ["home", "Zuhause & Notfall", "Wie sicher ist dein Zuhause?", "plan"],
    ["map", "Schutz in deiner Nähe", "Kennst du wichtige Orte in deiner Umgebung?", "map"],
    ["radio", "Warnschutz", "Erhältst du rechtzeitig Warnungen?", "warnschutz"],
    ["knowledge", "Wissen", "Weißt du, was im Ernstfall zu tun ist?", "knowledge"],
    ["profile", "Familie", "Ist deine Familie eingebunden und vorbereitet?", "profile"],
  ];
  app.innerHTML = `<div id="top" class="public-page">${publicHeader()}
    <section class="public-hero">
      <div class="public-hero-copy"><h1>Wie gut bist du<br>wirklich <em>vorbereitet?</em></h1><p>RedScore zeigt dir auf einen Blick, welche Bereiche du für Katastrophen und Versorgungsausfälle bereits geprüft hast – und was du noch verbessern kannst.</p>
        <div class="cta-row"><button class="green large" data-open-login>Jetzt kostenlos prüfen <span>→</span></button><button class="outline large" data-scroll="how">So funktioniert’s</button></div>
        <div class="trust-row"><span>✓ Kostenlos</span><span>✓ Unverbindlich</span><span>✓ Datenschutzfreundlich</span></div>
      </div>
      <aside class="public-score-card"><small>Dein Vorsorgestand</small><div class="empty-score">–</div><strong>Noch nicht berechnet</strong><p>Erst deine vollständigen Antworten ergeben einen Wert.</p></aside>
      <div class="script-note">Heute vorbereiten.<br>Morgen sicherer leben.</div>
    </section>
    <section class="public-categories">${categories.map(item => categoryCard(...item)).join("")}</section>
    <section class="public-info" id="about">
      <article class="lighthouse-card"><div><small>DEIN REDSCORE</small><h2>Ein Check. Mehr Klarheit.</h2><p>RedScore ordnet persönliche Katastrophenvorbereitung übersichtlich nach offiziellen Empfehlungen. Es gibt keinen Beispielwert: Erst vollständig beantwortete Fragen erzeugen deinen eigenen Stand.</p><ul><li>✓ Individuelle Auswertung</li><li>✓ Konkrete Handlungsschritte</li><li>✓ Orientierung an offiziellen Quellen</li><li>✓ Für Bürgerinnen und Bürger in jeder Lebenslage</li><li>✓ Lokal und datensparsam</li></ul><button class="green large" data-open-login>Jetzt Prüfung starten →</button></div></article>
      <article class="why-card"><small>WARUM VORSORGEN?</small><h2>Krisen kommen<br>meist ungeplant.</h2><p>Ob Stromausfall, Unwetter oder eine andere Notlage: Vorbereitung schützt Handlungsspielraum und reduziert Risiken.</p><div class="benefits"><span>🛡️ <b>Mehr Sicherheit</b></span><span>🌱 <b>Weniger Abhängigkeit</b></span><span>🤝 <b>Ruhe und Klarheit</b></span><span>▥ <b>Schritt für Schritt</b></span></div></article>
    </section>
    <section class="how-strip" id="how"><h2>So einfach geht’s</h2><div><article><b>1</b><span><strong>Testzugang öffnen</strong><small>Nicole ist der einzige eingerichtete Testuser.</small></span></article><i>›</i><article><b>2</b><span><strong>Angaben machen</strong><small>Bestände und Vorsorge ehrlich erfassen.</small></span></article><i>›</i><article><b>3</b><span><strong>Stand erhalten</strong><small>Auswertung ansehen und Maßnahmen umsetzen.</small></span></article></div></section>
    <section class="public-band"><article>👥<span><b>Für alle Lebenslagen</b><small>Haushaltsabhängig geplant.</small></span></article><article>🛡️<span><b>Offizielle Grundlagen</b><small>BBK und DWD als Quellen.</small></span></article><article>🔒<span><b>Deine Daten bleiben lokal</b><small>Foto und Eingaben auf diesem Gerät.</small></span></article><article>🍃<span><b>Mehr Resilienz</b><small>Praktisch statt alarmistisch.</small></span></article></section>
    ${footer()}
  </div>${modal()}`;
}

function appHeader(active) {
  return `<header class="app-header">${brand(true)}<nav>${navItems.map(item => `<button data-route="${item.id}" class="${active === item.id ? "active" : ""}">${icon(item.icon, "nav-icon")}<span>${item.label}</span></button>`).join("")}</nav><div class="user-tools"><button class="search-button">⌕</button><button class="bell" data-route="warnschutz">${icon("bell", "nav-icon")}<i></i></button><button class="avatar" data-route="profile">NM</button><button class="user-name" data-route="profile">Nicole⌄</button></div></header>`;
}
function familyUpload(className = "") {
  if (state.media.familyPhoto) return `<button class="family-photo ${className}" data-upload-photo style="--photo:url('${state.media.familyPhoto}')"><span>Foto ändern</span></button>`;
  return `<button class="family-upload ${className}" data-upload-photo>${icon("profile", "upload-icon")}<span><b>Eigenes Foto hochladen</b><small>Erst danach erscheinen personalisierte Motive. Das Foto bleibt auf diesem Gerät.</small></span><strong>＋</strong></button>`;
}
function loggedShell(active, content, pageClass = "") {
  document.body.className = "logged-mode";
  return `<div class="logged-page ${pageClass}">${appHeader(active)}<main>${content}</main>${footer(true)}</div>${modal()}`;
}
function scoreRing(value, red = false) {
  if (value === null) return `<div class="score-ring empty"><div><small>DEIN STAND</small><strong>–</strong><span>nicht berechnet</span></div></div>`;
  return `<div class="score-ring ${red ? "danger" : ""}" style="--score:${value}"><div><small>DEIN STAND</small><strong>${value}</strong><span>von 100</span></div></div>`;
}
function warningSummary(compact = false) {
  if (warningState.status === "loading") return `<span><b>DWD-Live-Abfrage läuft</b><small>Für Landkreis Stade</small></span>`;
  if (warningState.status === "fallback") return `<span><b>Keine DWD-Wetterwarnung beim letzten Abruf</b><small>Landkreis Stade · Stand 12.09.2026</small></span>`;
  if (warningState.status === "error") return `<span><b>Warnstatus nicht verfügbar</b><small>Bitte direkt beim DWD prüfen.</small></span>`;
  if (!warningState.warnings.length) return `<span><b>Keine DWD-Wetterwarnung</b><small>Landkreis Stade · zuletzt live geprüft</small></span>`;
  const first = warningState.warnings[0];
  return `<span><b>${esc(first.headline || first.event || "DWD-Wetterwarnung")}</b><small>${esc(first.regionName || "Landkreis Stade")}</small></span>`;
}

const liveScopeLabels = { for_you: "Für dich", germany: "Deutschland", world: "Weltlage", all: "Alle" };
const liveFilterLabels = { all: "Alle", drones: "Drohnen", cyber: "Cyber", disasters: "Katastrophen", weather: "Wetter", infrastructure: "Infrastruktur", supply: "Versorgung", security: "Sicherheit" };
const liveCategoryLabels = {
  drones: "Drohnen", cyber: "Cyber", it_outage: "IT-Ausfall", critical_infrastructure: "Kritische Infrastruktur",
  power_outage: "Stromausfall", telecom_outage: "Telekommunikation", drinking_water: "Trinkwasser",
  flood: "Hochwasser", heavy_rain: "Starkregen", storm: "Sturm", extreme_heat: "Hitze", wildfire: "Waldbrand",
  earthquake: "Erdbeben", volcano: "Vulkan", tsunami: "Tsunami", severe_weather: "Unwetter",
  evacuation: "Evakuierung", major_fire: "Großbrand", chemical_incident: "Chemieunfall", hazmat: "Gefahrstoff",
  radiological: "Radiologisch", transport_outage: "Verkehr", supply_disruption: "Versorgung",
  civil_protection: "Katastrophenschutz", official_warning: "Amtliche Warnung", international_security: "Weltlage",
};
const liveSeverityLabels = { critical: "KRITISCH", high: "HOCH", medium: "MITTEL", low: "GERING", info: "HINWEIS" };
const liveVerificationLabels = {
  official: "OFFIZIELL", verified: "BESTÄTIGTE QUELLE", multiple_sources: "MEHRFACH BESTÄTIGT",
  osint_unconfirmed: "OSINT – NOCH NICHT OFFIZIELL BESTÄTIGT", unknown: "UNBESTÄTIGT",
};

function relativeTime(value) {
  if (!value) return "noch nie";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "unbekannt";
  if (seconds < 60) return `vor ${seconds} Sek.${seconds === 1 ? "" : ""}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

function safeExternalUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; }
  catch { return ""; }
}

function liveEventIcon(category) {
  if (["storm","heavy_rain","flood","severe_weather","extreme_heat"].includes(category)) return "weather-warning";
  if (["drinking_water","supply_disruption"].includes(category)) return "water";
  if (["earthquake","volcano","tsunami","wildfire","major_fire","evacuation"].includes(category)) return "special";
  if (["official_warning","civil_protection","radiological","chemical_incident","hazmat"].includes(category)) return "bell";
  return category === "drones" ? "radio" : "settings";
}

function liveConnectionIsFresh() {
  const received = liveState.receivedAt ? new Date(liveState.receivedAt).getTime() : 0;
  const synced = liveState.lastSyncAt ? new Date(liveState.lastSyncAt).getTime() : received;
  return navigator.onLine && liveState.status === "live" && Date.now() - received < 150_000 && Date.now() - synced < 10 * 60_000;
}

function updateLiveClock() {
  const label = document.querySelector("#live-age");
  if (!label) return;
  const online = liveConnectionIsFresh();
  const stamp = online ? liveState.receivedAt : (liveState.lastSyncAt || liveState.receivedAt);
  label.textContent = online ? `Zuletzt aktualisiert ${relativeTime(stamp)}` : `Letzter Lageabgleich ${relativeTime(stamp)}`;
}

function storeLiveCache() {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
      events: liveState.events, sources: liveState.sources, lastSyncAt: liveState.lastSyncAt,
      receivedAt: liveState.receivedAt, scope: liveState.scope, filter: liveState.filter,
    }));
  } catch { /* The feed remains usable in memory. */ }
}

async function requestLiveLage(force = false) {
  if (!state.authenticated) return;
  if (!navigator.onLine) {
    liveState.status = "offline";
    if (["home","warnschutz"].includes(hashRoute())) render();
    return;
  }
  if (liveRequest) return liveRequest;
  const received = liveState.receivedAt ? new Date(liveState.receivedAt).getTime() : 0;
  if (!force && received && Date.now() - received < 30_000) return;
  liveState.status = liveState.events.length ? "refreshing" : "loading";
  const params = new URLSearchParams({
    scope: liveState.scope, filter: liveState.filter, limit: "12", country: "Deutschland",
    region: "Niedersachsen", district: "Stade", lat: "53.823008", lon: "9.285572",
  });
  liveRequest = fetch(`/api/live-lage?${params}`, { cache: "no-store", headers: { accept: "application/json" } })
    .then(async response => {
      if (!response.ok) throw new Error("Live-Lage API unavailable");
      const payload = await response.json();
      liveState.events = Array.isArray(payload.events) ? payload.events : [];
      liveState.sources = Array.isArray(payload.sources) ? payload.sources : [];
      liveState.lastSyncAt = payload.lastSyncAt || null;
      liveState.receivedAt = payload.generatedAt || new Date().toISOString();
      liveState.status = "live";
      liveState.error = null;
      storeLiveCache();
      const regionalWarnings = liveState.events.filter(event => ["official_warning","storm","heavy_rain","flood","severe_weather","extreme_heat"].includes(event.category) && /stade|niedersachsen/i.test(`${event.region || ""} ${event.city || ""}`));
      warningState = { status: "ok", warnings: regionalWarnings.map(event => ({ headline: event.title, regionName: event.region || event.city || "Niedersachsen" })), checkedAt: liveState.receivedAt, fallback: false };
    })
    .catch(() => {
      liveState.status = liveState.events.length ? "offline" : "error";
      liveState.error = "Die Live-Lage konnte nicht aktualisiert werden.";
      warningState = { status: "error", warnings: [], checkedAt: liveState.lastSyncAt, fallback: false };
    })
    .finally(() => {
      liveRequest = null;
      clearTimeout(liveRefreshTimer);
      liveRefreshTimer = setTimeout(() => requestLiveLage(true), LIVE_REFRESH_MS);
      if (state.authenticated && ["home","warnschutz"].includes(hashRoute())) render();
    });
  return liveRequest;
}

function liveEventCard(event) {
  const severity = String(event.severity || "info");
  const verification = liveVerificationLabels[event.verification_status] || liveVerificationLabels.unknown;
  const location = [event.city, event.region, event.country].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ") || "Ort nicht ermittelt";
  const sources = Array.isArray(event.sources) ? event.sources : [];
  const sourceNames = [...new Set(sources.map(source => source.name).filter(Boolean))].slice(0, 2).join(", ") || "Quelle nicht benannt";
  const distance = event.relevance?.distance_km;
  return `<article class="live-event tone-${esc(severity)}">
    <div class="live-event-top">${icon(liveEventIcon(event.category), "live-event-icon")}<span>${esc(liveCategoryLabels[event.category] || event.category || "Lage")}</span><b>${esc(liveSeverityLabels[severity] || "HINWEIS")}</b><time>${relativeTime(event.published_at)}</time></div>
    <h3>${esc(event.title)}</h3><p>${esc(event.summary || "Für diese strukturierte Meldung liegt keine weitere Kurzbeschreibung vor.")}</p>
    <div class="live-meta"><span>⌖ ${esc(location)}</span><span>Quelle: ${esc(sourceNames)}</span></div>
    <div class="live-evidence"><em class="verify-${esc(event.verification_status || "unknown")}">${esc(verification)}</em>${Number(event.source_count) > 1 ? `<span>Bestätigt durch ${Number(event.source_count)} Quellen</span>` : ""}</div>
    <div class="live-relevance"><span>Relevanz für dich: <b>${esc(liveSeverityLabels[event.relevance?.level] || "GERING")}</b>${Number.isFinite(distance) ? ` · ${Math.round(distance)} km entfernt` : ""}</span><button data-live-detail="${esc(event.id)}">Details öffnen →</button></div>
  </article>`;
}

function liveLagePanel() {
  const isLive = liveConnectionIsFresh();
  const stateTitle = isLive ? "LIVE-LAGE" : "OFFLINE";
  const events = liveState.events;
  return `<aside class="live-lage-panel" aria-label="Aktuelle Sicherheits- und Krisenlage">
    <header><div><span class="live-dot ${isLive ? "live" : "offline"}"></span><h2>${stateTitle}</h2></div><button data-live-refresh aria-label="Live-Lage aktualisieren">↻</button><small id="live-age">${isLive ? "Zuletzt aktualisiert" : "Letzter Lageabgleich"} ${relativeTime(isLive ? liveState.receivedAt : (liveState.lastSyncAt || liveState.receivedAt))}</small></header>
    <div class="live-scope">${Object.entries(liveScopeLabels).map(([key,label]) => `<button data-live-scope="${key}" class="${liveState.scope===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-filters">${Object.entries(liveFilterLabels).map(([key,label]) => `<button data-live-filter="${key}" class="${liveState.filter===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-list ${liveState.status}">${events.length ? events.map(liveEventCard).join("") : `<div class="live-empty">${icon("radio","big-icon")}<h3>${liveState.status === "loading" ? "Lageabgleich läuft …" : liveState.status === "error" ? "Lage-Dienst nicht erreichbar" : "Keine aktiven Meldungen in dieser Auswahl"}</h3><p>${liveState.status === "error" ? "Gespeicherte Meldungen würden hier offline weiter angezeigt. Bitte später erneut versuchen." : "Das ist kein Entwarnungssignal. Im Ereignisfall gelten amtliche Warnungen und Anweisungen."}</p></div>`}</div>
    <footer><span>${liveState.sources.length} strukturierte Quellen aktiv</span><small>Keine Boulevard- oder allgemeinen Politikmeldungen.</small></footer>
  </aside>`;
}
function nextTask() { return tasks.find(task => !state.taskStatus[task.id]) || null; }
function renderHome() {
  const value = score();
  const open = tasks.filter(task => !state.taskStatus[task.id]).length;
  const next = nextTask();
  const water = state.supplies.water;
  const waterDays = water === null ? null : Math.floor(water / 6);
  const statusTone = warningState.status === "ok" && !warningState.warnings.length ? "safe" : ["loading", "fallback"].includes(warningState.status) ? "neutral" : "danger";
  const heroPhoto = state.media.familyPhoto ? `style="--hero-photo:url('${state.media.familyPhoto}')"` : "";
  const content = `<div class="home-live-layout"><div class="home-core"><section class="dashboard-hero" ${heroPhoto}>
    <div class="dashboard-copy"><h1>Heute vorsorgen.<br><em>Morgen sicherer.</em></h1><p>Krisen kommen oft unerwartet.<br>Sei vorbereitet – für deine Familie,<br>dein Zuhause und deine Zukunft.</p><blockquote>„Sicherheit ist planbar – Schritt für Schritt.“</blockquote></div>
    <div class="dashboard-score">${scoreRing(value, value !== null && value < 50)}<div class="score-message"><strong>${value === null ? "Noch nicht bewertet." : value >= 70 ? "Gut vorbereitet." : "Es gibt wichtige Lücken."}</strong><p>${value === null ? "Beantworte zuerst alle zwölf Fragen. Wir zeigen niemals einen erfundenen Beispielwert." : "Der Wert basiert ausschließlich auf deinen Antworten."}</p><button class="${value !== null && value < 50 ? "red" : "green"}" data-open-assessment>${value === null ? "Jetzt ehrlich prüfen" : "Angaben aktualisieren"} →</button></div></div>
    <div class="dashboard-family">${familyUpload("hero-family")}</div>
  </section>
  <section class="status-grid">
    <button class="status-card ${statusTone}" data-route="warnschutz">${icon("weather-warning", "status-icon")}${warningSummary(true)}<b>›</b></button>
    <button class="status-card blue" data-route="supplies">${icon("water", "status-icon")}<span><b>${waterDays === null ? "Trinkwasser nicht erfasst" : `Trinkwasser für ${waterDays} Tage`}</b><small>BBK-Ziel: 10 Tage / 60 Liter</small></span><b>›</b></button>
    <button class="status-card amber" data-route="plan">${icon("plan", "status-icon")}<span><b>${open} Aufgaben offen</b><small>Nur selbst bestätigte Aufgaben zählen.</small></span><b>›</b></button>
    <button class="status-card safe" data-route="map">${icon("home", "status-icon")}<span><b>Verifizierte Orte</b><small>Keine bestätigten Schutzraumdaten im Datensatz.</small></span><b>›</b></button>
  </section>
  <section class="next-step"><div class="section-title"><div><h2>Dein nächster Schritt</h2><p>Eine kleine Maßnahme – große Wirkung.</p></div><button data-route="plan">Alle Aufgaben anzeigen →</button></div>
    ${next ? `<article class="next-task">${icon(next.icon, "task-image")}<div><span>${next.priority.toUpperCase()} · BBK-ORIENTIERT</span><h3>${next.title}</h3><p>${next.description}</p></div><button class="green" data-task-done="${next.id}">Als erledigt markieren →</button></article>` : `<article class="all-done">Alle Aufgaben wurden von Nicole bestätigt.</article>`}
  </section>
  <section class="feature-row">${[
    ["pantry.png","Vorräte","Bestände selbst erfassen.","supplies"],
    ["shelter.png","Schutz in deiner Nähe","Verifizierte Anlaufstellen.","map"],
    ["warning-storm.png","Warnschutz","DWD-Status und Warnwege.","warnschutz"],
    ["knowledge.png","Wissen","Offizielle Hinweise verständlich.","knowledge"],
  ].map(([img,title,copy,route]) => `<button data-route="${route}" style="--feature:url('assets/${img}')"><span><b>${title}</b><small>${copy}</small></span><strong>›</strong></button>`).join("")}</section></div>${liveLagePanel()}</div>`;
  app.innerHTML = loggedShell("home", content, "home-page");
  requestLiveLage();
}

function taskRow(task) {
  const done = !!state.taskStatus[task.id];
  return `<article class="task-row ${done ? "done" : ""}"><button data-task-done="${task.id}" aria-label="Status ändern">${done ? "✓" : ""}</button>${icon(task.icon, "row-icon")}<div><h3>${task.title}</h3><p>${task.description}</p></div><span class="priority ${task.priority.toLowerCase()}">${task.priority}</span><button data-task-detail="${task.id}">›</button></article>`;
}
function renderPlan() {
  const filters = ["Alle", "Vorräte", "Zuhause", "Unterwegs", "Familie"];
  const shown = tasks.filter(task => state.ui.planFilter === "Alle" || task.category === state.ui.planFilter);
  const done = tasks.filter(task => state.taskStatus[task.id]).length;
  const content = `<section class="subhero compact"><div><h1>Mein Plan</h1><h2>Schritt für Schritt mehr Sicherheit.</h2><p>Dein Fortschritt enthält nur Aufgaben, die du selbst bestätigt hast.</p></div></section>
    <div class="content-wrap two-column"><aside class="side-card"><small>DEIN FORTSCHRITT</small><strong>${done} / ${tasks.length}</strong><div class="bar"><i style="width:${done/tasks.length*100}%"></i></div><p>${done ? "Bestätigte Maßnahmen" : "Noch nichts als erledigt markiert"}</p></aside><section>
      <div class="filter-row">${filters.map(f => `<button data-plan-filter="${f}" class="${f===state.ui.planFilter?"active":""}">${f}</button>`).join("")}</div>
      <div class="task-list">${shown.map(taskRow).join("")}</div>
    </section></div>`;
  app.innerHTML = loggedShell("plan", content, "plan-page");
}

function renderSupplies() {
  const percent = supplyPercent();
  const filters = ["Alle", "Versorgung", "Gesundheit", "Haushalt"];
  const content = `<section class="image-hero pantry-hero"><div><h1>Vorräte</h1><h2>Heute vorsorgen. Morgen sicher.</h2><p>Ein alltagstauglicher Vorrat schafft Handlungsspielraum, wenn Versorgung oder Strom ausfallen.</p><a href="${sources.bbkGuide}" target="_blank" rel="noreferrer">Empfehlungen des BBK öffnen →</a></div></section>
    <div class="content-wrap supplies-layout"><aside class="side-card">${scoreRing(percent)}<p>${percent === null ? "Noch kein Bestand erfasst." : "Aus selbst eingetragenen Beständen berechnet."}</p><button class="outline" data-open-supply="water">Jetzt erfassen</button></aside>
    <section><article class="household-card">${icon("profile","big-icon")}<div><small>HAUSHALT</small><h2>2 Erwachsene · 1 Kind · 1 Hund</h2><p>Empfohlener Betrachtungszeitraum: <b>10 Tage</b></p></div></article>
      <div class="filter-row">${filters.map(f => `<button class="${f==="Alle"?"active":""}">${f}</button>`).join("")}</div>
      <div class="supply-table"><div class="table-head"><span>Bereich</span><span>BBK-orientiertes Ziel</span><span>Dein Bestand</span><span></span></div>
        ${supplyGroups.map(group => { const val = state.supplies[group.id]; const complete = val !== null && val >= group.target; return `<article><div>${icon(group.icon,"row-icon")}<span><b>${group.label}</b><small>${group.note}</small></span></div><strong>${fmt(group.target)} ${group.unit}</strong><span class="${complete?"complete":val===null?"unknown":"partial"}">${val === null ? "Nicht erfasst" : `${fmt(val)} ${group.unit}`}</span><button data-open-supply="${group.id}">Bearbeiten</button></article>`; }).join("")}</div>
      <p class="source-note">Ziele sind Orientierung, kein amtliches Prüfsiegel. Medikamente und Sonderbedarf individuell abstimmen.</p>
    </section></div>`;
  app.innerHTML = loggedShell("supplies", content, "supplies-page");
}

function renderMap() {
  const categories = ["Alle", "Behörden", "Versorgung", "Gesundheit", "Schutzräume"];
  const shown = state.ui.mapFilter === "Schutzräume" ? [] : verifiedPlaces.filter(p => state.ui.mapFilter === "Alle" || p.category === state.ui.mapFilter);
  const content = `<section class="image-hero shelter-hero"><div><h1>Schutz in deiner Nähe</h1><h2>Verifizierte Orte für den Ernstfall.</h2><p>Nur nachvollziehbare Adressen werden angezeigt. Für Freiburg (Elbe) liegen uns derzeit keine verifizierten öffentlichen Schutzraumdaten vor.</p></div></section>
    <div class="map-controls"><div>⌖ <b>21729 Freiburg (Elbe)</b></div><button data-save-offline>${state.settings.offlinePlacesSaved ? "Offline-Liste aktualisieren" : "Offline-Liste speichern"}</button></div>
    <div class="filter-row wide">${categories.map(f => `<button data-map-filter="${f}" class="${f===state.ui.mapFilter?"active":""}">${f}</button>`).join("")}</div>
    <div class="map-layout"><section class="place-list"><h2>Ergebnisse (${shown.length})</h2>${shown.length ? shown.map(place => `<article>${icon(place.icon,"place-icon")}<div><b>${place.name}</b><small>${place.address}</small><em>Quelle: ${place.source}</em></div><a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(place.address)}" target="_blank" rel="noreferrer">Route ↗</a></article>`).join("") : `<div class="no-data">${icon("home","big-icon")}<h3>Keine verifizierten öffentlichen Schutzräume</h3><p>Im Ernstfall gelten die Anweisungen der Behörden. Wir erfinden keine Standorte.</p></div>`}</section>
      <section class="real-map offline-preview" aria-label="Schematische Offline-Übersicht für Freiburg (Elbe)"><svg viewBox="0 0 900 520" aria-hidden="true"><rect width="900" height="520" fill="#173b3b"/><path d="M-50 110 C170 190 315 65 505 145 S730 340 960 250" fill="none" stroke="#285f71" stroke-width="125"/><path d="M-30 92 C170 165 310 48 515 132 S745 326 950 236" fill="none" stroke="#3d8395" stroke-width="6"/><g fill="none" stroke="#51634e" stroke-width="18" opacity=".8"><path d="M40 430 C250 300 330 370 520 265 S740 160 900 175"/><path d="M80 15 C130 175 230 220 380 292 S670 410 845 540"/></g><g fill="none" stroke="#d9c785" stroke-width="5"><path d="M20 430 C260 320 340 350 520 270 S720 180 930 175"/><path d="M90 -20 C155 185 260 228 390 290 S680 410 840 535"/></g><circle cx="520" cy="270" r="62" fill="#22a7ea18" stroke="#38b9f2" stroke-width="3"/><circle cx="520" cy="270" r="11" fill="#1eaef1" stroke="#fff" stroke-width="4"/></svg><div class="map-city-label">Freiburg (Elbe)</div><div class="map-water-label">Elbe</div><div class="offline-caption"><b>Offline-Übersicht</b><small>Schematisch · keine Navigation</small></div><a href="https://www.openstreetmap.org/?mlat=53.823008&amp;mlon=9.285572#map=13/53.823008/9.285572" target="_blank" rel="noreferrer">OpenStreetMap online öffnen ↗</a></section>
    </div><div class="emergency-bar">⚠ <b>Im Ernstfall:</b> Aktuelle Warnmeldungen und behördliche Anweisungen haben Vorrang. <button data-route="warnschutz">Warnstatus prüfen →</button></div>`;
  app.innerHTML = loggedShell("map", content, "map-page");
}

function renderWarnschutz() {
  const checked = warningState.checkedAt ? new Date(warningState.checkedAt).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "–";
  const content = `<section class="image-hero warning-hero"><div><h1>Früh informiert.<br><em>Besser vorbereitet.</em></h1><p>Amtliche Wetterwarnungen und belastbare Warnwege für Nicole in Freiburg (Elbe).</p></div></section>
    <div class="warning-layout"><section><article class="current-warning ${warningState.status==="ok"&&!warningState.warnings.length?"safe":warningState.status==="fallback"?"neutral":""}">${icon(warningState.warnings.length?"weather-warning":"health","warning-large")}${warningSummary()}<span>Live-Prüfung: ${checked}</span><a href="${sources.dwd}" target="_blank" rel="noreferrer">Beim DWD öffnen ↗</a></article>
      <div class="warning-cards"><article>${icon("bell","big-icon")}<h3>Cell Broadcast</h3><p>Warnungen werden auf kompatiblen, eingeschalteten Mobiltelefonen ohne App ausgesendet.</p></article><article>${icon("weather-warning","big-icon")}<h3>NINA</h3><p>Die offizielle Warn-App des BBK bündelt Zivil-, Polizei-, Wetter- und Hochwasserwarnungen.</p><a href="${sources.nina}" target="_blank">NINA beim BBK ↗</a></article><article>${icon("radio","big-icon")}<h3>Radio</h3><p>Ein Batterie-, Solar- oder Kurbelradio bleibt bei Strom- und Internetausfall wichtig.</p></article></div>
    </section><aside><h3>Benachrichtigungen</h3><p>RedScore kann den Browserzugriff anfragen. Eine Freigabe ersetzt keine Warn-App.</p><button class="green" data-notifications>${"Notification" in window && Notification.permission === "granted" ? "Browser-Mitteilungen erlaubt" : "Berechtigung prüfen"}</button><h3>Verhalten bei Unwetter</h3><ul><li>Amtliche Meldungen verfolgen</li><li>Fenster und Türen schließen</li><li>Lose Gegenstände sichern</li><li>Überflutete Bereiche meiden</li></ul></aside></div>`;
  app.innerHTML = loggedShell("warnschutz", content, "warn-page");
  requestWarnings();
}

function renderKnowledge() {
  const query = state.ui.knowledgeSearch.toLowerCase();
  const shown = knowledgeArticles.filter(a => !query || (a.title+" "+a.summary).toLowerCase().includes(query));
  const content = `<section class="image-hero knowledge-hero"><div><h1>Wissen <em>schützt.</em></h1><h2>Verstehen. Vorbereiten. Handeln.</h2><p>Verständliche Hinweise und offizielle Quellen für mehr Sicherheit in allen Lebenslagen.</p><form data-knowledge-search><input name="query" value="${esc(state.ui.knowledgeSearch)}" placeholder="Thema suchen …"><button>⌕</button></form></div><span class="sign-copy">WISSEN<br>VON HEUTE.<br>SICHERHEIT<br>VON MORGEN.</span></section>
    <div class="content-wrap knowledge-content"><section><h2>Empfehlungen für dich</h2><div class="article-grid">${shown.map(article => `<article class="${state.media.familyPhoto?"personalized":""}" ${state.media.familyPhoto?`style="--photo:url('${state.media.familyPhoto}')"`:""}><div class="article-visual">${icon(article.icon,"article-icon")}</div><small>${article.category} · ${article.minutes} Min.</small><h3>${article.title}</h3><p>${article.summary}</p><button data-article="${article.id}">Ansehen →</button></article>`).join("")}</div></section>
      <aside class="knowledge-side"><h3>Offizielle Ressourcen</h3><a href="${sources.bbkGuide}" target="_blank">BBK-Ratgeber ↗</a><a href="${sources.bbkBag}" target="_blank">Notgepäck ↗</a><a href="${sources.bbkDocuments}" target="_blank">Dokumente sichern ↗</a><a href="${sources.nina}" target="_blank">Warn-App NINA ↗</a></aside></div>`;
  app.innerHTML = loggedShell("knowledge", content, "knowledge-page");
}

function renderProfile() {
  const content = `<div class="content-wrap profile-layout"><section><h1>Profil</h1><article class="profile-card"><div class="avatar large">NM</div><div><h2>Nicole Mrozinski</h2><p>2 Erwachsene · 1 Kind · 1 Hund</p><small>Freiburg (Elbe), Flecken · Niedersachsen</small></div></article>
    <div class="profile-photo-panel">${familyUpload()}</div>
    <div class="settings-list"><article>${icon("map","row-icon")}<span><b>Standort</b><small>21729 Freiburg (Elbe) · Landkreis Stade</small></span></article><article>${icon("profile","row-icon")}<span><b>Haushalt</b><small>2 Erwachsene · 1 Kind · 1 Hund</small></span></article><article>${icon("settings","row-icon")}<span><b>Datenschutz</b><small>Foto, Antworten und Bestände bleiben lokal in diesem Browser.</small></span></article></div>
  </section><aside class="profile-actions"><button class="outline" data-open-assessment>Vorsorgestand neu prüfen</button><button class="outline" data-remove-photo ${state.media.familyPhoto?"":"disabled"}>Foto entfernen</button><button class="red" data-logout>Abmelden</button></aside></div>`;
  app.innerHTML = loggedShell("profile", content, "profile-page");
}

function modal() {
  if (!state.ui.modal) return "";
  if (state.ui.modal === "login") return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal>×</button>${icon("profile","modal-icon")}<small>LOKALER TESTZUGANG</small><h2>Nicole Mrozinski</h2><p>2 Erwachsene, 1 Kind, 1 Hund<br>21729 Freiburg (Elbe), Flecken</p><button class="green full" data-login>Testzugang öffnen →</button><em>Keine Demo-Werte: Antworten und Bestände beginnen leer.</em></section></div>`;
  if (state.ui.modal === "assessment") {
    const answered = assessmentQuestions.filter(([id]) => typeof state.assessment.answers[id] === "boolean").length;
    return `<div class="modal-backdrop"><section class="modal assessment-modal"><button class="modal-close" data-close-modal>×</button><small>TRANSPARENTE EIGENE AUSWERTUNG</small><h2>RedScore Vorsorge-Check</h2><p>Beantworte alle Fragen ehrlich. Jede Ja-Antwort zählt gleich; unbeantwortete Fragen erzeugen keinen Score.</p><div class="assessment-progress">${answered} von ${assessmentQuestions.length} beantwortet</div><div class="question-list">${assessmentQuestions.map(([id,q,hint],i) => `<article><b>${i+1}</b><div><strong>${q}</strong><small>${hint}</small></div><div><button data-answer="${id}:true" class="${state.assessment.answers[id]===true?"yes":""}">Ja</button><button data-answer="${id}:false" class="${state.assessment.answers[id]===false?"no":""}">Nein</button></div></article>`).join("")}</div><button class="green full" data-finish-assessment ${answered < assessmentQuestions.length ? "disabled" : ""}>Auswertung berechnen</button><a href="${sources.bbkChecklist}" target="_blank">Grundlage: BBK-Ratgeber und Checkliste ↗</a></section></div>`;
  }
  if (state.ui.modal.startsWith("supply:")) {
    const id = state.ui.modal.split(":")[1], group = supplyGroups.find(g => g.id === id), value = state.supplies[id];
    return `<div class="modal-backdrop"><section class="modal supply-modal"><button class="modal-close" data-close-modal>×</button>${icon(group.icon,"modal-icon")}<small>ECHTEN BESTAND EINTRAGEN</small><h2>${group.label}</h2><p>Ziel: ${fmt(group.target)} ${group.unit}<br>${group.note}</p><form data-supply-form="${id}"><label>Vorhandener Bestand <input type="number" name="value" min="0" step="${group.step}" value="${value===null?"":value}" placeholder="Noch nicht erfasst" required> <span>${group.unit}</span></label><button class="green full">Speichern</button></form><em>Der Wert wird nur lokal auf diesem Gerät gespeichert.</em></section></div>`;
  }
  if (state.ui.modal.startsWith("task:")) {
    const id = state.ui.modal.split(":")[1], task = tasks.find(t => t.id === id);
    return `<div class="modal-backdrop"><section class="modal task-modal"><button class="modal-close" data-close-modal>×</button>${icon(task.icon,"modal-icon")}<small>${task.priority.toUpperCase()} · ${task.category.toUpperCase()}</small><h2>${task.title}</h2><p>${task.description}</p><ul>${task.checklist.map(item => `<li>✓ ${item}</li>`).join("")}</ul><button class="green full" data-task-done="${task.id}">${state.taskStatus[task.id]?"Wieder öffnen":"Als erledigt markieren"}</button></section></div>`;
  }
  if (state.ui.modal.startsWith("article:")) {
    const id = state.ui.modal.split(":")[1], article = knowledgeArticles.find(a => a.id === id);
    return `<div class="modal-backdrop"><section class="modal article-modal"><button class="modal-close" data-close-modal>×</button>${icon(article.icon,"modal-icon")}<small>${article.category}</small><h2>${article.title}</h2><p>${article.summary}</p><ul>${article.bullets.map(item => `<li>${item}</li>`).join("")}</ul><a class="green link-button" href="${sources.bbkGuide}" target="_blank">BBK-Ratgeber öffnen ↗</a></section></div>`;
  }
  if (state.ui.modal.startsWith("live:")) {
    const id = state.ui.modal.slice(5);
    const event = liveState.events.find(item => item.id === id);
    if (!event) return "";
    const originals = (Array.isArray(event.sources) ? event.sources : []).filter(source => safeExternalUrl(source.url));
    const originalUrl = safeExternalUrl(event.canonical_url);
    return `<div class="modal-backdrop"><section class="modal live-detail-modal"><button class="modal-close" data-close-modal>×</button>${icon(liveEventIcon(event.category),"modal-icon")}<small>${esc(liveCategoryLabels[event.category] || "LAGEEREIGNIS")} · ${esc(liveVerificationLabels[event.verification_status] || liveVerificationLabels.unknown)}</small><h2>${esc(event.title)}</h2><p>${esc(event.summary)}</p><dl><div><dt>Veröffentlicht</dt><dd>${new Date(event.published_at).toLocaleString("de-DE")}</dd></div><div><dt>Von RedScore gefunden</dt><dd>${new Date(event.first_seen_at).toLocaleString("de-DE")}</dd></div><div><dt>Region</dt><dd>${esc([event.city,event.region,event.country].filter(Boolean).join(" · ") || "nicht ermittelt")}</dd></div><div><dt>Relevanz</dt><dd>${esc(liveSeverityLabels[event.relevance?.level] || "GERING")}</dd></div></dl><h3>Nachvollziehbare Quellen (${originals.length})</h3><div class="live-source-list">${originals.map(source => `<a href="${safeExternalUrl(source.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(source.name)}</b><small>${esc(source.title || "Originalmeldung")} · ${relativeTime(source.published_at)}</small></a>`).join("") || "<p>Keine veröffentlichte Original-URL verfügbar.</p>"}</div>${originalUrl ? `<a class="green link-button" href="${originalUrl}" target="_blank" rel="noopener noreferrer">Originalmeldung öffnen ↗</a>` : ""}<em>Diese Lageübersicht ersetzt keine amtliche Warnung. Folge im Ereignisfall den Anweisungen der Behörden.</em></section></div>`;
  }
  return "";
}

function render() {
  if (!state.authenticated) return renderPublic();
  const route = hashRoute();
  ({ home: renderHome, plan: renderPlan, supplies: renderSupplies, map: renderMap, warnschutz: renderWarnschutz, knowledge: renderKnowledge, profile: renderProfile }[route] || renderHome)();
}

async function requestWarnings() {
  if (warningRequested) return;
  warningRequested = true;
  await requestLiveLage();
  warningRequested = false;
}

app.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) {
    if (event.target.classList.contains("modal-backdrop")) { state.ui.modal = null; render(); }
    return;
  }
  if (button.dataset.route) return navigate(button.dataset.route);
  if (button.dataset.liveScope) { liveState.scope = button.dataset.liveScope; liveState.events = []; render(); return requestLiveLage(true); }
  if (button.dataset.liveFilter) { liveState.filter = button.dataset.liveFilter; liveState.events = []; render(); return requestLiveLage(true); }
  if (button.matches("[data-live-refresh]")) return requestLiveLage(true);
  if (button.dataset.liveDetail) { state.ui.modal = `live:${button.dataset.liveDetail}`; return render(); }
  if (button.dataset.scroll) return document.querySelector("#"+button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
  if (button.matches("[data-open-login]")) { state.ui.modal = "login"; return render(); }
  if (button.matches("[data-login]")) { state.authenticated = true; state.ui.modal = null; save(); location.hash = "#/home"; return render(); }
  if (button.matches("[data-logout]")) { state.authenticated = false; state.ui.modal = null; save(); location.hash = ""; return render(); }
  if (button.matches("[data-close-modal]") || event.target.classList.contains("modal-backdrop")) { state.ui.modal = null; return render(); }
  if (button.matches("[data-open-assessment]")) { state.ui.modal = "assessment"; return render(); }
  if (button.dataset.answer) { const [id,val] = button.dataset.answer.split(":"); state.assessment.answers[id] = val === "true"; save(); return render(); }
  if (button.matches("[data-finish-assessment]")) { if (assessmentQuestions.every(([id]) => typeof state.assessment.answers[id] === "boolean")) { state.assessment.completedAt = new Date().toISOString(); state.ui.modal = null; save(); toast("Dein eigener Vorsorgestand wurde berechnet."); render(); } return; }
  if (button.dataset.taskDone) { state.taskStatus[button.dataset.taskDone] = !state.taskStatus[button.dataset.taskDone]; state.ui.modal = null; save(); toast("Aufgabenstatus gespeichert."); return render(); }
  if (button.dataset.taskDetail) { state.ui.modal = "task:"+button.dataset.taskDetail; return render(); }
  if (button.dataset.planFilter) { state.ui.planFilter = button.dataset.planFilter; save(); return render(); }
  if (button.dataset.openSupply) { state.ui.modal = "supply:"+button.dataset.openSupply; return render(); }
  if (button.dataset.mapFilter) { state.ui.mapFilter = button.dataset.mapFilter; save(); return render(); }
  if (button.dataset.article) { state.ui.modal = "article:"+button.dataset.article; return render(); }
  if (button.matches("[data-upload-photo]")) return fileInput.click();
  if (button.matches("[data-remove-photo]")) { state.media.familyPhoto = null; save(); toast("Das lokale Foto wurde entfernt."); return render(); }
  if (button.matches("[data-save-offline]")) { state.settings.offlinePlacesSaved = true; save(); toast("Die verifizierte Ortsliste ist lokal gespeichert. Die Kartenkacheln bleiben online."); return render(); }
  if (button.matches("[data-notifications]")) {
    if (!("Notification" in window)) return toast("Dieser Browser unterstützt keine Web-Mitteilungen.");
    const permission = await Notification.requestPermission();
    state.settings.notifications = permission === "granted"; save(); toast(permission === "granted" ? "Browser-Mitteilungen erlaubt." : "Keine Berechtigung erteilt."); return render();
  }
});

app.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.dataset.supplyForm) {
    const value = Number(new FormData(form).get("value"));
    if (!Number.isFinite(value) || value < 0) return;
    state.supplies[form.dataset.supplyForm] = value;
    state.ui.modal = null; save(); toast("Tatsächlicher Bestand gespeichert."); render();
  }
  if (form.matches("[data-knowledge-search]")) { state.ui.knowledgeSearch = new FormData(form).get("query").trim(); save(); render(); }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      state.media.familyPhoto = canvas.toDataURL("image/jpeg", .84);
      save(); fileInput.value = ""; toast("Foto lokal gespeichert."); render();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

window.addEventListener("hashchange", render);
window.addEventListener("offline", () => { liveState.status = "offline"; if (state.authenticated && hashRoute() === "home") render(); });
window.addEventListener("online", () => { if (state.authenticated) requestLiveLage(true); });
liveClockTimer = setInterval(updateLiveClock, 1000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
render();

if (navigator.modelContext?.registerTool) {
  navigator.modelContext.registerTool({ name: "get_redscore_status", description: "Returns Nicole's entered RedScore state without inventing data.", inputSchema: { type: "object", properties: {} }, execute: async () => ({ score: score(), supplies: state.supplies, completedTasks: Object.keys(state.taskStatus).filter(id => state.taskStatus[id]), household: state.household }) });
  navigator.modelContext.registerTool({ name: "open_redscore_assessment", description: "Opens the transparent RedScore assessment.", inputSchema: { type: "object", properties: {} }, execute: async () => { state.ui.modal = "assessment"; render(); return { opened: true }; } });
}
