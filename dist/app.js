import { assessmentQuestions, defaultState, knowledgeArticles, navItems, sources, supplyGroups, tasks } from "./data.js?v=4";
import { applyLanguage, getLanguage, setLanguage, translateText } from "./i18n.js?v=11";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const STORAGE_KEY = "redscore-state-v1";
const SESSION_KEY = "redscore-session-v1";
const CONTACT_EMAIL = "administration@redscore.de";
const clone = value => JSON.parse(JSON.stringify(value));
const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const icon = (name, className = "icon3d") => `<img class="${className}" src="assets/icons-3d/${name}.png" alt="" />`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const fmt = n => new Intl.NumberFormat(getLanguage() === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 1 }).format(n);
const customSupplyCategories = ["Versorgung", "Gesundheit", "Haushalt", "Sonstiges"];

function normalizeCustomSupplies(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((item, index) => {
    const quantity = Number(item?.quantity);
    const category = customSupplyCategories.includes(item?.category) ? item.category : "Sonstiges";
    return {
      id: /^custom-[a-z0-9-]{4,80}$/i.test(String(item?.id || "")) ? String(item.id) : `custom-imported-${index}`,
      label: String(item?.label || "").trim().slice(0, 80),
      category,
      quantity: Number.isFinite(quantity) ? clamp(quantity, 0, 999999) : 0,
      unit: String(item?.unit || "Stück").trim().slice(0, 30) || "Stück",
      note: String(item?.note || "").trim().slice(0, 160),
      createdAt: String(item?.createdAt || new Date().toISOString()),
      updatedAt: String(item?.updatedAt || item?.createdAt || new Date().toISOString()),
    };
  }).filter(item => item.label);
}

function createCustomSupplyId() {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `custom-${token}`;
}

function customSupplyIcon(category) {
  return ({ Versorgung: "supplies", Gesundheit: "medical", Haushalt: "household", Sonstiges: "special" })[category] || "special";
}

function loadState() {
  try {
    localStorage.removeItem("plans-state-v2");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return clone(defaultState);
    return {
      ...clone(defaultState), ...saved,
      authenticated: false,
      profile: { ...defaultState.profile, ...saved.profile },
      household: { ...defaultState.household, ...saved.household },
      assessment: { ...defaultState.assessment, ...saved.assessment },
      supplies: { ...defaultState.supplies, ...saved.supplies },
      supplyDetails: { ...defaultState.supplyDetails, ...saved.supplyDetails },
      customSupplies: normalizeCustomSupplies(saved.customSupplies),
      settings: { ...defaultState.settings, ...saved.settings },
      packlist: { ...defaultState.packlist, ...saved.packlist },
      ui: { ...defaultState.ui, ...saved.ui },
    };
  } catch { return clone(defaultState); }
}
let state = loadState();
let warningState = { status: "loading", warnings: [], checkedAt: null, fallback: false };
let warningRequested = false;
const LIVE_CACHE_KEY = "redscore-live-lage-v3";
const PLACES_CACHE_KEY = "redscore-nearby-places-v1";
const LIVE_REFRESH_MS = 60_000;
const liveCache = (() => {
  try {
    const cached = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || "null") || {};
    return cached.language === getLanguage() ? cached : {};
  }
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
let liveRequestLanguage = null;
let liveRefreshTimer = null;
let liveClockTimer = null;
const placesCache = (() => {
  try { return JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || "null"); }
  catch { return null; }
})();
let placesState = {
  status: navigator.onLine ? "idle" : "offline",
  key: placesCache?.key || "",
  center: placesCache?.center || null,
  places: Array.isArray(placesCache?.places) ? placesCache.places : [],
  fetchedAt: placesCache?.fetchedAt || null,
  error: null,
};
let placesRequest = null;
let mapRouteState = { status: "idle", placeId: null, route: null, error: null };
let session = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } })();
let syncTimer = null;
let accountBusy = false;
let languageMenuOpen = false;
const householdScenes = {
  "solo-woman": "assets/households/solo-woman.png",
  "solo-man": "assets/households/solo-man.png",
  "couple-woman-man": "assets/households/couple-woman-man.png",
  "couple-two-women": "assets/households/couple-two-women.png",
  "couple-two-men": "assets/households/couple-two-men.png",
  "family-woman-man": "assets/households/family-woman-man.png",
  "family-two-women": "assets/households/family-two-women.png",
  "family-two-men": "assets/households/family-two-men.png",
  "single-parent": "assets/households/single-parent.png",
  "family-neutral": "assets/households/family-neutral.png",
  "neutral-household": "assets/pantry.png",
};

// Persönliche Notfallrucksack-Checkliste auf Basis der BBK-Empfehlungen.
// Die Einträge sind bewusst Empfehlungen und keine erfundenen Bestandsdaten.
const emergencyPackItems = [
  { id: "water", category: "Wasser", label: "Trinkwasser", detail: "Eine kleine Flasche pro Person für den Weg; Vorrat separat planen.", quantity: "persönlicher Bedarf", icon: "water", priority: "hoch" },
  { id: "food", category: "Verpflegung", label: "Haltbare Verpflegung", detail: "Kompakt, energiereich und ohne Kühlung genießbar.", quantity: "für unterwegs", icon: "food", priority: "mittel" },
  { id: "medicine", category: "Gesundheit", label: "Persönliche Medikamente", detail: "Regelmäßige Medikamente und wichtige Hilfsmittel einpacken.", quantity: "persönlich", icon: "medical", priority: "hoch" },
  { id: "first-aid", category: "Gesundheit", label: "Erste-Hilfe-Material", detail: "Kleine Reiseapotheke inklusive Pflastern und Verbandmaterial.", quantity: "1 Set", icon: "health", priority: "hoch" },
  { id: "radio", category: "Information", label: "Radio", detail: "Batterie-, Solar- oder Kurbelradio für amtliche Informationen.", quantity: "1 Gerät", icon: "radio", priority: "hoch" },
  { id: "flashlight", category: "Licht & Energie", label: "Taschenlampe", detail: "Robuste Lampe und passende Ersatzbatterien.", quantity: "1 je Person", icon: "weather-warning", priority: "mittel" },
  { id: "powerbank", category: "Licht & Energie", label: "Geladene Powerbank", detail: "Mit passendem Ladekabel und regelmäßig geprüftem Ladezustand.", quantity: "1–2 Stück", icon: "battery", priority: "mittel" },
  { id: "documents", category: "Dokumente", label: "Dokumentenkopien", detail: "Ausweise, Versicherungen und medizinische Informationen geschützt kopieren.", quantity: "1 Mappe", icon: "plan", priority: "hoch" },
  { id: "cash", category: "Dokumente", label: "Bargeld", detail: "Kleine Scheine und Münzen für Situationen ohne Kartenzahlung.", quantity: "persönlich", icon: "euro-banknote", priority: "mittel" },
  { id: "clothing", category: "Unterwegs", label: "Warme Kleidung", detail: "Wetterfeste Wechselkleidung, feste Schuhe und eine Rettungsdecke.", quantity: "pro Person", icon: "coat", priority: "mittel" },
  { id: "hygiene", category: "Unterwegs", label: "Hygieneartikel", detail: "Handdesinfektion, Feuchttücher und persönliche Hygieneartikel.", quantity: "pro Person", icon: "health", priority: "mittel" },
  { id: "whistle", category: "Unterwegs", label: "Signalpfeife", detail: "Klein, leicht und bei eingeschränkter Sicht hörbar.", quantity: "1 Stück", icon: "bell", priority: "niedrig" },
  { id: "keys", category: "Unterwegs", label: "Ersatzschlüssel", detail: "Wohnung, Keller, Fahrzeug oder wichtige Zugangskarten prüfen.", quantity: "nach Bedarf", icon: "settings", priority: "niedrig" },
  { id: "pet", category: "Haustiere", label: "Haustierbedarf", detail: "Futter, Wasser, Leine/Transportbox, Medikamente und Unterlagen.", quantity: "je Tier", icon: "special", priority: "hoch", petsOnly: true },
];

function selectedScene() { return householdScenes[state.profile.selectedScene] || householdScenes["neutral-household"]; }
function sceneStyle(_key, property = "--scene-image") { return `style="${property}:url('${selectedScene()}')"`; }
function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "RS"; }
function householdPeople() { return (state.household.adults?.length || 0) + Number(state.household.children || 0); }
function petCount() { return (state.household.pets || []).reduce((sum, pet) => sum + Number(pet.count || 0), 0); }
function petLabel(type) { return translateText(({ dog: "Hund", cat: "Katze", bird: "Vogel", small_animal: "Kleintier", fish: "Fische", reptile: "Reptil", other: "Tier" })[type] || "Tier"); }
function householdSummary() {
  const adults = state.household.adults?.length || 0, children = Number(state.household.children || 0), pets = petCount();
  return [`${adults} ${adults === 1 ? "erwachsene Person" : "Erwachsene"}`, children ? `${children} ${children === 1 ? "Kind" : "Kinder"}` : null, pets ? `${pets} ${pets === 1 ? "Haustier" : "Haustiere"}` : null].filter(Boolean).join(" · ");
}
function chooseScene(adults, children) {
  const genders = adults.map(item => item.gender).sort();
  if (children > 0 && adults.length === 1) return "single-parent";
  if (children > 0 && adults.length === 2) {
    if (genders.join("|") === "man|woman") return "family-woman-man";
    if (genders.every(value => value === "woman")) return "family-two-women";
    if (genders.every(value => value === "man")) return "family-two-men";
    return "family-neutral";
  }
  if (children > 0 || adults.length > 2 || adults.some(item => ["diverse", "unspecified"].includes(item.gender))) return "family-neutral";
  if (adults.length === 1) return adults[0].gender === "woman" ? "solo-woman" : adults[0].gender === "man" ? "solo-man" : "neutral-household";
  if (adults.length === 2) {
    if (genders.join("|") === "man|woman") return "couple-woman-man";
    if (genders.every(value => value === "woman")) return "couple-two-women";
    if (genders.every(value => value === "man")) return "couple-two-men";
  }
  return "neutral-household";
}
const save = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast("Diese Änderung konnte lokal nicht gespeichert werden."); }
  if (state.authenticated && session?.access_token) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncAccount().catch(() => {}), 900);
  }
};

async function accountRequest(action, payload = {}, accessToken = session?.access_token) {
  const response = await fetch("/api/account", {
    method: "POST", cache: "no-store", headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Kontodienst nicht erreichbar.");
  return result;
}

function persistSession(value) {
  session = value;
  if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value)); else localStorage.removeItem(SESSION_KEY);
}

function consumeAuthRedirect() {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  const confirmed = query.get("auth") === "confirmed";
  const failed = Boolean(query.get("error") || fragment.get("error"));
  if (accessToken && refreshToken) {
    const expiresIn = Math.max(60, Number(fragment.get("expires_in")) || 3600);
    persistSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: fragment.get("token_type") || "bearer",
      expires_in: expiresIn,
      expires_at: Number(fragment.get("expires_at")) || Math.floor(Date.now() / 1000) + expiresIn,
    });
  }
  if (confirmed || failed || (accessToken && refreshToken)) history.replaceState(null, "", "/#/home");
  return { confirmed: confirmed || Boolean(accessToken && refreshToken), failed };
}

async function refreshSessionIfNeeded() {
  if (!session?.refresh_token) return false;
  const expiresAt = Number(session.expires_at || 0) * 1000;
  if (session.access_token && expiresAt > Date.now() + 60_000) return true;
  try { const result = await accountRequest("refresh", { refreshToken: session.refresh_token }, ""); persistSession(result.session); return true; }
  catch { persistSession(null); return false; }
}

async function loadAccount() {
  if (!(await refreshSessionIfNeeded())) return false;
  const result = await accountRequest("load");
  const profile = result.profile;
  state.authenticated = true;
  state.profile = {
    id: result.user.id, email: result.user.email || "", name: profile?.display_name || result.user?.user_metadata?.display_name || session.user?.user_metadata?.display_name || "",
    initials: initials(profile?.display_name || result.user?.user_metadata?.display_name || session.user?.user_metadata?.display_name), onboardingCompleted: Boolean(profile?.onboarding_completed),
    selectedScene: profile?.selected_scene || "neutral-household",
  };
  state.household = profile ? {
    adults: Array.isArray(profile.adults) ? profile.adults : [], children: Number(profile.children_count || 0), pets: Array.isArray(profile.pets) ? profile.pets : [],
    postalCode: profile.postal_code || "", city: profile.city || "", state: profile.state || "", district: profile.district || "",
    location: [profile.postal_code, profile.city].filter(Boolean).join(" "),
  } : clone(defaultState.household);
  state.assessment = clone(defaultState.assessment);
  state.taskStatus = {};
  state.supplies = clone(defaultState.supplies);
  state.supplyDetails = clone(defaultState.supplyDetails);
  state.customSupplies = clone(defaultState.customSupplies);
  state.settings = clone(defaultState.settings);
  state.packlist = clone(defaultState.packlist);
  state.ui = clone(defaultState.ui);
  if (result.appState) {
    state.assessment = { ...state.assessment, ...(result.appState.assessment || {}) };
    state.taskStatus = result.appState.task_status || {};
    state.supplies = { ...state.supplies, ...(result.appState.supplies || {}) };
    state.supplyDetails = result.appState.supply_details || {};
    state.customSupplies = normalizeCustomSupplies(result.appState.custom_supplies);
    state.settings = { ...state.settings, ...(result.appState.settings || {}) };
    state.packlist = { ...state.packlist, ...(result.appState.packlist || {}) };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return true;
}

async function syncAccount() {
  if (!state.authenticated || !session?.access_token || !navigator.onLine) return;
  await refreshSessionIfNeeded();
  await accountRequest("save", {
    profile: {
      display_name: state.profile.name, adults: state.household.adults, children_count: state.household.children, pets: state.household.pets,
      postal_code: state.household.postalCode, city: state.household.city, state: state.household.state, district: state.household.district,
      onboarding_completed: state.profile.onboardingCompleted, selected_scene: state.profile.selectedScene,
    },
    appState: { assessment: state.assessment, task_status: state.taskStatus, supplies: state.supplies, supply_details: state.supplyDetails, custom_supplies: normalizeCustomSupplies(state.customSupplies), packlist: state.packlist, settings: state.settings },
  });
}
function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = translateText(message);
  toastRegion.append(node);
  setTimeout(() => node.remove(), 3200);
}

function relevantAssessmentQuestions() {
  return assessmentQuestions.filter(([id]) => id !== "pet" || petCount() > 0);
}

function relevantTasks() {
  return tasks.filter(task => task.id !== "pet" || petCount() > 0);
}

function score() {
  const questions = relevantAssessmentQuestions();
  if (!state.assessment.completedAt || questions.some(([id]) => typeof state.assessment.answers[id] !== "boolean")) return null;
  const preparedness = questions.filter(([id]) => state.assessment.answers[id]).length / questions.length * 100;
  // The homepage score is the single household score. Supply progress contributes
  // transparently once the assessment is complete; the supplies page shows only
  // its own progress, never a second score.
  const supplies = supplyPercent() ?? 0;
  return Math.round(preparedness * 0.7 + supplies * 0.3);
}
function supplyPercent() {
  const relevant = supplyGroups.filter(group => group.id !== "pet" || petCount() > 0);
  const recorded = relevant.filter(group => state.supplies[group.id] !== null);
  if (!recorded.length) return null;
  return Math.round(recorded.reduce((sum, group) => sum + clamp(state.supplies[group.id] / supplyTarget(group), 0, 1), 0) / relevant.length * 100);
}

function supplyTarget(group) { return group.id === "water" ? Math.max(1, householdPeople()) * 2 * 10 : group.target; }
function supplyNote(group) {
  if (group.id === "water") return `${Math.max(1, householdPeople())} ${householdPeople() === 1 ? "Person" : "Personen"} × 2 Liter × 10 Tage`;
  if (group.id === "pet") return petCount() ? `${petCount()} ${petCount() === 1 ? "Haustier" : "Haustiere"}: Futter, Wasser, Medikamente und Transport` : "Nur relevant, wenn Haustiere im Haushalt leben";
  return group.note;
}

function supplyTargetLabel(group) {
  return group.inputMode === "level" ? "Einsatzbereit" : `${fmt(supplyTarget(group))} ${group.unit}`;
}

function supplyValueLabel(group, value) {
  if (value === null) return "Nicht erfasst";
  if (group.inputMode === "level") return value >= 1 ? "Vollständig" : value > 0 ? "Teilweise" : "Nicht vorhanden";
  return `${fmt(value)} ${group.unit}`;
}

function supplyInput(group, value) {
  if (group.inputMode === "packages") {
    const details = state.supplyDetails[group.id] || {};
    const containerSize = Number(details.containerSize) || 1.5;
    const containerCount = Number.isFinite(Number(details.containerCount))
      ? Number(details.containerCount)
      : value === null ? "" : Math.max(0, Math.round(value / containerSize));
    return `<fieldset class="quantity-fields"><legend>Wassergebinde erfassen</legend><label><span>Anzahl Gebinde</span><input type="number" name="containerCount" min="0" max="200" step="1" inputmode="numeric" value="${containerCount}" placeholder="z. B. 12" required></label><label><span>Liter je Gebinde</span><select name="containerSize">${group.packageSizes.map(size => `<option value="${size}" ${size===containerSize?"selected":""}>${fmt(size)} Liter</option>`).join("")}</select></label><output data-supply-total>${value === null ? "Gesamtmenge wird beim Speichern berechnet" : `Bisher erfasst: ${fmt(value)} Liter`}</output></fieldset>`;
  }
  if (group.inputMode === "level") {
    return `<fieldset class="quantity-fields"><legend>Ausstattungsstand</legend><label><span>Status</span><select name="value" required><option value="" ${value===null?"selected":""} disabled>Bitte auswählen</option><option value="0" ${value===0?"selected":""}>Nicht vorhanden</option><option value="0.5" ${value===0.5?"selected":""}>Teilweise vorhanden</option><option value="1" ${value===1?"selected":""}>Vollständig und einsatzbereit</option></select></label></fieldset>`;
  }
  return `<fieldset class="quantity-fields"><legend>Reichweite in Tagen</legend><label><span>Für wie viele Tage reicht dein Bestand?</span><input type="number" name="value" min="0" max="${group.max}" step="1" inputmode="numeric" value="${value===null?"":value}" placeholder="z. B. 7" required></label><div class="quantity-suggestions" aria-label="Schnellauswahl">${group.suggestions.map(day => `<button type="button" data-supply-suggestion="${day}">${day} Tage</button>`).join("")}</div></fieldset>`;
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

const routeLabel = route => ({ home: "Start", plan: "Mein Plan", packliste: "Notfallrucksack", supplies: "Vorräte", map: "SafePlaces", warnschutz: "Warnschutz", knowledge: "Wissen", profile: "Profil" })[route] || "Start";
function languageControl() {
  const language = getLanguage();
  return `<div class="language-switcher"><button class="language-flag" data-language-toggle aria-label="${language === "de" ? "Sprache auswählen" : "Select language"}" aria-expanded="${languageMenuOpen}"><span class="flag-icon flag-${language}" aria-hidden="true"></span></button><div class="language-menu" ${languageMenuOpen ? "" : "hidden"}><button data-language="de" class="${language === "de" ? "active" : ""}"><span class="flag-icon flag-de" aria-hidden="true"></span> Deutsch</button><button data-language="en" class="${language === "en" ? "active" : ""}"><span class="flag-icon flag-en" aria-hidden="true"></span> English</button></div></div>`;
}
function brand(light = false) {
  return `<button class="wordmark ${light ? "light" : ""}" data-route="${state.authenticated ? "home" : "public"}" aria-label="RedScore Startseite"><img src="assets/redscore-logo.png?v=5" alt="" /><span><em>Red</em>Score</span><small>Weil der Ernstfall nicht fragt, ob du bereit bist.</small></button>`;
}
function footer(dark = false) {
  return `<footer class="site-footer ${dark ? "dark" : ""}">
    ${brand(false)}
    <nav><button data-legal="about">Über RedScore</button><a href="${sources.bbkChecklist}" target="_blank" rel="noreferrer">BBK-Quellen</a><button data-legal="privacy">Datenschutz</button><button data-legal="imprint">Impressum</button></nav>
    <a class="bbk-source-badge" href="${sources.bbkChecklist}" target="_blank" rel="noreferrer" aria-label="Zu den offiziellen Informationen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe"><img class="bbk-source-logo" src="assets/bbk-logo.svg?v=2" alt="Bundesamt für Bevölkerungsschutz und Katastrophenhilfe"><span><small class="bbk-note-wide">Deine Aufgaben beruhen auf den Empfehlungen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe. Es existiert keine behördliche Zusammenarbeit.</small><small class="bbk-note-mobile">Offizielle Informationsquelle · keine behördliche Partnerschaft</small></span></a>
  </footer>`;
}

function publicHeader() {
  return `<header class="public-header">${brand(true)}<nav>
    <button data-scroll="top" class="active">Start</button><button data-scroll="how">So funktioniert’s</button><button data-route="knowledge">Wissen</button><button data-scroll="about">Über RedScore</button>
  </nav><div class="public-actions"><button class="search-button" aria-label="Suche">⌕</button><button class="outline" data-open-auth="login">Einloggen</button><button class="green" data-open-auth="register">Kostenlos registrieren</button>${languageControl()}</div></header>`;
}
function categoryCard(iconName, title, copy, route) {
  return `<button class="public-category" data-route="${route}">${icon(iconName, "public-icon")}<strong>${title}</strong><span>${copy}</span></button>`;
}
function renderPublic() {
  document.body.className = "public-mode";
  const categories = [
    ["supplies", "Vorräte", "Reichen deine Vorräte für den Ernstfall?", "supplies"],
    ["home", "Zuhause & Notfall", "Wie sicher ist dein Zuhause?", "plan"],
    ["map", "SafePlaces", "Kennst du wichtige Orte in deiner Umgebung?", "map"],
    ["radio", "Warnschutz", "Erhältst du rechtzeitig Warnungen?", "warnschutz"],
    ["knowledge", "Wissen", "Weißt du, was im Ernstfall zu tun ist?", "knowledge"],
    ["profile", "Familie", "Ist deine Familie eingebunden und vorbereitet?", "profile"],
  ];
  app.innerHTML = `<div id="top" class="public-page">${publicHeader()}
    <section class="public-hero">
      <div class="public-hero-copy"><h1>Wie gut bist du<br>wirklich <em>vorbereitet?</em></h1><p>RedScore zeigt dir auf einen Blick, welche Bereiche du für Katastrophen und Versorgungsausfälle bereits geprüft hast – und was du noch verbessern kannst.</p>
        <div class="cta-row"><button class="green large" data-open-auth="register">Jetzt kostenlos prüfen <span>→</span></button><button class="outline large" data-scroll="how">So funktioniert’s</button></div>
        <div class="trust-row"><span>✓ Kostenlos</span><span>✓ Unverbindlich</span><span>✓ Datenschutzfreundlich</span></div>
      </div>
      <aside class="public-score-card"><small>Dein Vorsorgestand</small><div class="empty-score">–</div><strong>Noch nicht berechnet</strong><p>Erst deine vollständigen Antworten ergeben einen Wert.</p></aside>
      <div class="script-note">Niemand kann es sich leisten,<br>unvorbereitet zu sein.</div>
    </section>
    <section class="public-categories">${categories.map(item => categoryCard(...item)).join("")}</section>
    <section class="public-info" id="about">
      <article class="lighthouse-card"><div><small>DEIN REDSCORE</small><h2>Ein Check. Mehr Klarheit.</h2><p>RedScore ordnet persönliche Katastrophenvorbereitung übersichtlich nach offiziellen Empfehlungen. Es gibt keinen Beispielwert: Erst vollständig beantwortete Fragen erzeugen deinen eigenen Stand.</p><ul><li>✓ Individuelle Auswertung</li><li>✓ Konkrete Handlungsschritte</li><li>✓ Orientierung an offiziellen Quellen</li><li>✓ Für Bürgerinnen und Bürger in jeder Lebenslage</li><li>✓ Offline nutzbar und kontogebunden</li></ul><button class="green large" data-open-auth="register">Jetzt kostenlos starten →</button></div></article>
      <article class="why-card"><small>WARUM VORSORGEN?</small><h2>Krisen kommen<br>meist ungeplant.</h2><p>Ob Stromausfall, Unwetter oder eine andere Notlage: Vorbereitung schützt Handlungsspielraum und reduziert Risiken.</p><div class="benefits"><span>🛡️ <b>Mehr Sicherheit</b></span><span>🌱 <b>Weniger Abhängigkeit</b></span><span>🤝 <b>Ruhe und Klarheit</b></span><span>▥ <b>Schritt für Schritt</b></span></div></article>
    </section>
    <section class="how-strip" id="how"><h2>So einfach geht’s</h2><div><article><b>1</b><span><strong>Konto anlegen</strong><small>E-Mail bestätigen und sicher anmelden.</small></span></article><i>›</i><article><b>2</b><span><strong>Haushalt einrichten</strong><small>Personen, Kinder, Haustiere und Standort erfassen.</small></span></article><i>›</i><article><b>3</b><span><strong>Vorsorge starten</strong><small>Passende Mengen, Aufgaben und Lagehinweise erhalten.</small></span></article></div></section>
    <section class="public-band"><article>👥<span><b>Für alle Lebenslagen</b><small>Inklusive Haushaltsmodelle ohne Annahmen.</small></span></article><article>🛡️<span><b>Offizielle Grundlagen</b><small>BBK und DWD als Quellen.</small></span></article><article>🔒<span><b>Datensparsam</b><small>Keine privaten Fotos und keine Gesichtsanalyse.</small></span></article><article>🍃<span><b>Mehr Resilienz</b><small>Praktisch statt alarmistisch.</small></span></article></section>
    ${footer()}
  </div>${modal()}`;
}

function appHeader(active) {
  return `<header class="app-header">${brand(true)}<nav>${navItems.map(item => `<button data-route="${item.id}" class="${active === item.id ? "active" : ""}">${icon(item.icon, "nav-icon")}<span>${item.label}</span></button>`).join("")}</nav><div class="user-tools">${languageControl()}<button class="search-button" data-route="knowledge" aria-label="Wissen durchsuchen">⌕</button><button class="bell" data-route="warnschutz" aria-label="Warnschutz öffnen">${icon("bell", "nav-icon")}<i></i></button><button class="avatar" data-route="profile" aria-label="Profil öffnen">${esc(state.profile.initials || initials(state.profile.name))}</button><button class="user-name" data-route="profile">${esc((state.profile.name || "Profil").split(" ")[0])}⌄</button></div></header>`;
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
  const region = state.household.district || state.household.state || state.household.city || "deinen Standort";
  if (warningState.status === "loading") return `<span><b>DWD-Live-Abfrage läuft</b><small>Für ${esc(region)}</small></span>`;
  if (warningState.status === "fallback") return `<span><b>Keine DWD-Wetterwarnung beim letzten Abruf</b><small>${esc(region)} · gespeicherter Stand</small></span>`;
  if (warningState.status === "error") return `<span><b>Warnstatus nicht verfügbar</b><small>Bitte direkt beim DWD prüfen.</small></span>`;
  if (!warningState.warnings.length) return `<span><b>Keine DWD-Wetterwarnung</b><small>${esc(region)} · zuletzt live geprüft</small></span>`;
  const first = warningState.warnings[0];
  return `<span><b>${esc(first.headline || first.event || "DWD-Wetterwarnung")}</b><small>${esc(first.regionName || "Landkreis Stade")}</small></span>`;
}

const liveScopeLabels = { for_you: "Für dich", germany: "Deutschland", world: "Weltlage", all: "Alle" };
const liveFilterLabels = { all: "Alle", conflicts: "Kriege", drones: "Drohnen", cyber: "Cyber", disasters: "Katastrophen", weather: "Wetter", infrastructure: "Infrastruktur", supply: "Versorgung", security: "Sicherheit" };
const liveCategoryLabels = {
  drones: "Drohnen", cyber: "Cyber", it_outage: "IT-Ausfall", critical_infrastructure: "Kritische Infrastruktur",
  power_outage: "Stromausfall", telecom_outage: "Telekommunikation", drinking_water: "Trinkwasser",
  flood: "Hochwasser", heavy_rain: "Starkregen", storm: "Sturm", extreme_heat: "Hitze", wildfire: "Waldbrand",
  earthquake: "Erdbeben", volcano: "Vulkan", tsunami: "Tsunami", severe_weather: "Unwetter",
  evacuation: "Evakuierung", major_fire: "Großbrand", chemical_incident: "Chemieunfall", hazmat: "Gefahrstoff",
  radiological: "Radiologisch", transport_outage: "Verkehr", supply_disruption: "Versorgung",
  civil_protection: "Katastrophenschutz", official_warning: "Amtliche Warnung", international_security: "Kriege & Konflikte",
};
const liveSeverityLabels = { critical: "KRITISCH", high: "HOCH", medium: "MITTEL", low: "GERING", info: "HINWEIS" };
const liveVerificationLabels = {
  official: "OFFIZIELL", verified: "BESTÄTIGTE QUELLE", multiple_sources: "MEHRFACH BESTÄTIGT",
  osint_unconfirmed: "OSINT – NOCH NICHT OFFIZIELL BESTÄTIGT", unknown: "UNBESTÄTIGT",
};

function relativeTime(value) {
  const english = getLanguage() === "en";
  if (!value) return english ? "never" : "noch nie";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return english ? "unknown" : "unbekannt";
  if (seconds < 60) return english ? `${seconds} sec. ago` : `vor ${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return english ? `${minutes} min. ago` : `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return english ? `${hours} hr. ago` : `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return english ? `${days} day${days === 1 ? "" : "s"} ago` : `vor ${days} Tag${days === 1 ? "" : "en"}`;
}

function safeExternalUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; }
  catch { return ""; }
}

function liveEventIcon(category) {
  if (category === "international_security") return "radio";
  if (["storm","heavy_rain","flood","severe_weather","extreme_heat"].includes(category)) return "weather-warning";
  if (["drinking_water","supply_disruption"].includes(category)) return "water";
  if (["earthquake","volcano","tsunami","wildfire","major_fire","evacuation"].includes(category)) return "special";
  if (["official_warning","civil_protection","radiological","chemical_incident","hazmat"].includes(category)) return "bell";
  return category === "drones" ? "radio" : "settings";
}

const weatherClusterCategories = new Set(["official_warning", "storm", "heavy_rain", "flood", "severe_weather", "extreme_heat"]);
function normalizedIncidentTitle(value) {
  const noise = new Set(["amtliche", "warnung", "wetterwarnung", "unwetterwarnung", "vor", "fur", "fuer", "der", "die", "das", "und"]);
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9äöüß ]/g, " ").split(/\s+/).filter(token => token.length > 1 && !noise.has(token)).join(" ");
}
function eventPrimarySource(event) {
  const source = Array.isArray(event.sources) ? event.sources[0] : null;
  if (source?.name) return String(source.name).toLowerCase().trim();
  try { return new URL(event.canonical_url || "").hostname.replace(/^www\./, ""); }
  catch { return "unknown"; }
}
function sameVisibleIncident(left, right) {
  if (left.category !== right.category || String(left.country || "").toLowerCase() !== String(right.country || "").toLowerCase()) return false;
  if (Math.abs(Date.parse(left.published_at || 0) - Date.parse(right.published_at || 0)) > 12 * 60 * 60 * 1000) return false;
  if (normalizedIncidentTitle(left.title) !== normalizedIncidentTitle(right.title) || eventPrimarySource(left) !== eventPrimarySource(right)) return false;
  if (weatherClusterCategories.has(left.category) && (left.verification_status === "official" || right.verification_status === "official")) return true;
  return `${left.city || ""}|${left.region || ""}`.toLowerCase() === `${right.city || ""}|${right.region || ""}`.toLowerCase() || (left.canonical_url && left.canonical_url === right.canonical_url);
}
function collapseLiveEvents(events) {
  const groups = [];
  for (const event of events) {
    const group = groups.find(candidate => sameVisibleIncident(candidate[0], event));
    if (group) group.push(event); else groups.push([event]);
  }
  return groups.map(group => {
    if (group.length === 1 || Number(group[0].cluster_count) > 1) return group[0];
    const members = [...group].sort((a, b) => Number(b.relevance?.score || 0) - Number(a.relevance?.score || 0) || Date.parse(b.published_at) - Date.parse(a.published_at));
    const sources = [], sourceKeys = new Set();
    for (const source of members.flatMap(item => Array.isArray(item.sources) ? item.sources : [])) {
      const key = `${String(source.url || "").toLowerCase()}|${String(source.name || "").toLowerCase()}`;
      if (!sourceKeys.has(key)) { sourceKeys.add(key); sources.push(source); }
    }
    const affectedRegions = [...new Set(members.flatMap(item => [item.city, item.region]).filter(Boolean))];
    return { ...members[0], sources, source_count: sources.length, cluster_count: members.length, affected_regions: affectedRegions, related_events: members.map(item => ({ id: item.id, title: item.title, summary: item.summary, city: item.city, region: item.region, country: item.country, published_at: item.published_at, canonical_url: item.canonical_url })) };
  });
}
function visibleLiveEvents() { return collapseLiveEvents(liveState.events).slice(0, 12); }

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
  label.textContent = `${translateText(online ? "Zuletzt aktualisiert" : "Letzter Lageabgleich")} ${relativeTime(stamp)}`;
}

function storeLiveCache() {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
      events: liveState.events, sources: liveState.sources, lastSyncAt: liveState.lastSyncAt,
      receivedAt: liveState.receivedAt, scope: liveState.scope, filter: liveState.filter, language: getLanguage(),
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
  const requestedLanguage = getLanguage();
  if (liveRequest) {
    if (liveRequestLanguage === requestedLanguage) return liveRequest;
    return liveRequest.finally(() => requestLiveLage(true));
  }
  const received = liveState.receivedAt ? new Date(liveState.receivedAt).getTime() : 0;
  if (!force && received && Date.now() - received < 30_000) return;
  liveState.status = liveState.events.length ? "refreshing" : "loading";
  const params = new URLSearchParams({ scope: liveState.scope, filter: liveState.filter, limit: "30", country: "Deutschland", language: requestedLanguage });
  if (state.household.state) params.set("region", state.household.state);
  if (state.household.district) params.set("district", state.household.district.replace(/^Landkreis\s+/i, ""));
  if (/freiburg/i.test(state.household.city || "")) { params.set("lat", "53.823008"); params.set("lon", "9.285572"); }
  liveRequestLanguage = requestedLanguage;
  liveRequest = fetch(`/api/live-lage?${params}`, { cache: "no-store", headers: { accept: "application/json", "accept-language": requestedLanguage } })
    .then(async response => {
      if (!response.ok) throw new Error("Live-Lage API unavailable");
      const payload = await response.json();
      if (getLanguage() !== requestedLanguage) return;
      liveState.events = Array.isArray(payload.events) ? payload.events : [];
      liveState.sources = Array.isArray(payload.sources) ? payload.sources : [];
      liveState.lastSyncAt = payload.lastSyncAt || null;
      liveState.receivedAt = payload.generatedAt || new Date().toISOString();
      liveState.status = "live";
      liveState.error = null;
      storeLiveCache();
      const regionTerms = [state.household.city, state.household.district, state.household.state].filter(Boolean).map(value => value.replace(/^Landkreis\s+/i, "").toLowerCase());
      const regionalWarnings = liveState.events.filter(event => ["official_warning","storm","heavy_rain","flood","severe_weather","extreme_heat"].includes(event.category) && regionTerms.some(term => `${event.region || ""} ${event.city || ""}`.toLowerCase().includes(term)));
      warningState = { status: "ok", warnings: regionalWarnings.map(event => ({ headline: event.title, regionName: event.region || event.city || state.household.state })), checkedAt: liveState.receivedAt, fallback: false };
    })
    .catch(() => {
      liveState.status = liveState.events.length ? "offline" : "error";
      liveState.error = "Die Live-Lage konnte nicht aktualisiert werden.";
      warningState = { status: "error", warnings: [], checkedAt: liveState.lastSyncAt, fallback: false };
    })
    .finally(() => {
      liveRequest = null;
      liveRequestLanguage = null;
      clearTimeout(liveRefreshTimer);
      liveRefreshTimer = setTimeout(() => requestLiveLage(true), LIVE_REFRESH_MS);
      if (state.authenticated && ["home","warnschutz"].includes(hashRoute())) render();
    });
  return liveRequest;
}

function liveEventCard(event) {
  const severity = String(event.severity || "info");
  const verification = liveVerificationLabels[event.verification_status] || liveVerificationLabels.unknown;
  const regions = Array.isArray(event.affected_regions) ? event.affected_regions : [];
  const location = Number(event.cluster_count) > 1 ? `${regions.slice(0, 2).join(", ")}${regions.length > 2 ? ` +${regions.length - 2}` : ""} · ${event.country || ""}` : [event.city, event.region, event.country].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ") || "Ort nicht ermittelt";
  const sources = Array.isArray(event.sources) ? event.sources : [];
  const sourceNames = [...new Set(sources.map(source => source.name).filter(Boolean))].slice(0, 2).join(", ") || "Quelle nicht benannt";
  const distance = event.relevance?.distance_km;
  const ageMs = Date.now() - Date.parse(event.published_at || 0);
  const breaking = event.category === "international_security" && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 2 * 60 * 60 * 1000;
  return `<article class="live-event tone-${esc(severity)}">
    <div class="live-event-top">${icon(liveEventIcon(event.category), "live-event-icon")}<span>${esc(liveCategoryLabels[event.category] || event.category || "Lage")}</span>${breaking ? `<em class="breaking-badge">BREAKING</em>` : ""}<b>${esc(liveSeverityLabels[severity] || "HINWEIS")}</b><time>${relativeTime(event.published_at)}</time></div>
    <h3>${esc(event.title)}</h3><p>${esc(event.summary || "Für diese strukturierte Meldung liegt keine weitere Kurzbeschreibung vor.")}</p>
    <div class="live-meta"><span>⌖ ${esc(location)}</span><span>Quelle: ${esc(sourceNames)}</span></div>
    <div class="live-evidence"><em class="verify-${esc(event.verification_status || "unknown")}">${esc(verification)}</em>${Number(event.cluster_count) > 1 ? `<span class="cluster-badge">${Number(event.cluster_count)} regionale Meldungen gebündelt</span>` : Number(event.source_count) > 1 ? `<span>Bestätigt durch ${Number(event.source_count)} Quellen</span>` : ""}</div>
    <div class="live-relevance"><span>Relevanz für dich: <b>${esc(liveSeverityLabels[event.relevance?.level] || "GERING")}</b>${Number.isFinite(distance) ? ` · ${Math.round(distance)} km entfernt` : ""}</span><button data-live-detail="${esc(event.id)}">Details öffnen →</button></div>
  </article>`;
}

function liveLagePanel() {
  const isLive = liveConnectionIsFresh();
  const stateTitle = isLive ? "LIVE-LAGE" : "OFFLINE";
  const events = visibleLiveEvents();
  const hiddenDuplicates = Math.max(0, liveState.events.length - events.length);
  return `<aside class="live-lage-panel" aria-label="Aktuelle Sicherheits- und Krisenlage">
    <header><div><span class="live-dot ${isLive ? "live" : "offline"}"></span><h2>${stateTitle}</h2></div><button data-live-refresh aria-label="Live-Lage aktualisieren">↻</button><small id="live-age">${isLive ? "Zuletzt aktualisiert" : "Letzter Lageabgleich"} ${relativeTime(isLive ? liveState.receivedAt : (liveState.lastSyncAt || liveState.receivedAt))}</small></header>
    <div class="live-scope">${Object.entries(liveScopeLabels).map(([key,label]) => `<button data-live-scope="${key}" class="${liveState.scope===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-filters">${Object.entries(liveFilterLabels).map(([key,label]) => `<button data-live-filter="${key}" class="${liveState.filter===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-list ${liveState.status}">${events.length ? events.map(liveEventCard).join("") : `<div class="live-empty">${icon("radio","big-icon")}<h3>${liveState.status === "loading" ? "Lageabgleich läuft …" : liveState.status === "error" ? "Lage-Dienst nicht erreichbar" : "Keine aktiven Meldungen in dieser Auswahl"}</h3><p>${liveState.status === "error" ? "Gespeicherte Meldungen würden hier offline weiter angezeigt. Bitte später erneut versuchen." : "Das ist kein Entwarnungssignal. Im Ereignisfall gelten amtliche Warnungen und Anweisungen."}</p></div>`}</div>
    <footer><span>${liveState.sources.length} strukturierte Quellen aktiv${hiddenDuplicates ? ` · ${hiddenDuplicates} Wiederholungen gebündelt` : ""}</span><small>Keine Boulevard- oder allgemeinen Politikmeldungen.</small></footer>
  </aside>`;
}
function nextTask() { return relevantTasks().find(task => !state.taskStatus[task.id]) || null; }
function renderHome() {
  const value = score();
  const householdTasks = relevantTasks();
  const open = householdTasks.filter(task => !state.taskStatus[task.id]).length;
  const next = nextTask();
  const water = state.supplies.water;
  const dailyWater = Math.max(1, householdPeople()) * 2;
  const waterDays = water === null ? null : Math.floor(water / dailyWater);
  const statusTone = warningState.status === "ok" && !warningState.warnings.length ? "safe" : ["loading", "fallback"].includes(warningState.status) ? "neutral" : "danger";
  const heroPhoto = sceneStyle("dashboard", "--hero-photo");
  const content = `<div class="home-live-layout"><div class="home-core"><section class="dashboard-hero" ${heroPhoto}>
    <div class="dashboard-copy"><h1>Heute vorsorgen.<br><em>Morgen sicherer.</em></h1><p>Krisen kommen oft unerwartet.<br>Sei vorbereitet – für deine Familie,<br>dein Zuhause und deine Zukunft.</p><blockquote>„Sicherheit ist planbar – Schritt für Schritt.“</blockquote></div>
    <div class="dashboard-score">${scoreRing(value, value !== null && value < 50)}<div class="score-message"><strong>${value === null ? "Noch nicht bewertet." : value >= 70 ? "Gut vorbereitet." : "Es gibt wichtige Lücken."}</strong><p>${value === null ? `Beantworte zuerst alle ${relevantAssessmentQuestions().length} Fragen. Wir zeigen niemals einen erfundenen Beispielwert.` : "Der Wert basiert ausschließlich auf deinen Antworten."}</p><button class="${value !== null && value < 50 ? "red" : "green"}" data-open-assessment>${value === null ? "Jetzt ehrlich prüfen" : "Angaben aktualisieren"} →</button></div></div>
  </section>
  <section class="status-grid">
    <button class="status-card ${statusTone}" data-route="warnschutz">${icon("weather-warning", "status-icon")}${warningSummary(true)}<b>›</b></button>
    <button class="status-card blue" data-route="supplies">${icon("water", "status-icon")}<span><b>${waterDays === null ? "Trinkwasser nicht erfasst" : `Trinkwasser für ${waterDays} Tage`}</b><small>10-Tage-Ziel: ${fmt(dailyWater * 10)} Liter für deinen Haushalt</small></span><b>›</b></button>
    <button class="status-card amber" data-route="plan">${icon("plan", "status-icon")}<span><b>${open} Aufgaben offen</b><small>Nur selbst bestätigte Aufgaben zählen.</small></span><b>›</b></button>
    <button class="status-card safe" data-route="map">${icon("home", "status-icon")}<span><b>Verifizierte Orte</b><small>Keine bestätigten Schutzraumdaten im Datensatz.</small></span><b>›</b></button>
  </section>
  <section class="next-step"><div class="section-title"><div><h2>Dein nächster Schritt</h2><p>Eine kleine Maßnahme – große Wirkung.</p></div><button data-route="plan">Alle Aufgaben anzeigen →</button></div>
    ${next ? `<article class="next-task">${icon(next.icon, "task-image")}<div><span>${next.priority.toUpperCase()} · BBK-ORIENTIERT</span><h3>${next.title}</h3><p>${next.description}</p></div><button class="green" data-task-done="${next.id}">Als erledigt markieren →</button></article>` : `<article class="all-done">Alle Aufgaben wurden von dir bestätigt.</article>`}
  </section>
  <section class="feature-row">${[
    ["pantry.png","Vorräte","Bestände selbst erfassen.","supplies"],
    ["shelter.png","SafePlaces","Verifizierte Anlaufstellen.","map"],
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
function packItems() {
  return emergencyPackItems.filter(item => !item.petsOnly || petCount() > 0);
}
function packProgress() {
  const items = packItems();
  const checked = items.filter(item => state.packlist[item.id]).length;
  return { items, checked, total: items.length, percent: items.length ? Math.round(checked / items.length * 100) : 0 };
}
function packItemCard(item) {
  const checked = Boolean(state.packlist[item.id]);
  return `<article class="pack-item ${checked ? "checked" : ""}"><button class="pack-check" data-pack-item="${item.id}" aria-label="${checked ? "Als nicht vorhanden markieren" : "Als vorhanden markieren"}" aria-pressed="${checked}">${checked ? "✓" : ""}</button>${icon(item.icon, "pack-item-icon")}<div class="pack-item-copy"><div class="pack-item-heading"><h3>${item.label}</h3><span class="pack-priority ${item.priority}">${item.priority}</span></div><p>${item.detail}</p><small>${item.quantity}</small></div></article>`;
}
function renderPlan() {
  const filters = ["Alle", "Vorräte", "Zuhause", "Unterwegs", "Familie"];
  const householdTasks = relevantTasks();
  const shown = householdTasks.filter(task => state.ui.planFilter === "Alle" || task.category === state.ui.planFilter);
  const done = householdTasks.filter(task => state.taskStatus[task.id]).length;
  const content = `<section class="subhero compact"><div><h1>Mein Plan</h1><h2>Schritt für Schritt mehr Sicherheit.</h2><p>Dein Fortschritt enthält nur Aufgaben, die du selbst bestätigt hast.</p></div></section>
    <div class="content-wrap"><article class="packlist-promo"><div class="packlist-promo-icon">${icon("backpack", "pack-bag-icon")}</div><div><small>INTERAKTIVE CHECKLISTE</small><h2>Notfallrucksack packen</h2><p>Prüfe Schritt für Schritt, was im persönlichen Rucksack bereits vorhanden ist.</p></div><button class="green" data-route="packliste">Packliste öffnen →</button></article><div class="two-column"><aside class="side-card"><small>DEIN FORTSCHRITT</small><strong>${done} / ${householdTasks.length}</strong><div class="bar"><i style="width:${done/householdTasks.length*100}%"></i></div><p>${done ? "Bestätigte Maßnahmen" : "Noch nichts als erledigt markiert"}</p></aside><section>
      <div class="filter-row">${filters.map(f => `<button data-plan-filter="${f}" class="${f===state.ui.planFilter?"active":""}">${f}</button>`).join("")}</div>
      <div class="task-list">${shown.map(taskRow).join("")}</div>
    </section></div></div>`;
  app.innerHTML = loggedShell("plan", content, "plan-page");
}

function renderPacklist() {
  const { items, checked, total, percent } = packProgress();
  const categories = ["Alle", ...new Set(items.map(item => item.category))];
  const query = String(state.ui.packSearch || "").trim().toLowerCase();
  const shown = items.filter(item => (state.ui.packFilter === "Alle" || item.category === state.ui.packFilter) && (!query || `${item.label} ${item.detail} ${item.category}`.toLowerCase().includes(query)));
  const readyText = percent === 100 ? "Dein Rucksack ist vollständig geprüft." : `${total - checked} ${total - checked === 1 ? "Punkt fehlt" : "Punkte fehlen noch"}.`;
  const content = `<section class="subhero compact packlist-hero"><div><small>BBK-ORIENTIERT · PERSÖNLICH</small><h1>Notfallrucksack</h1><h2>Alles Wichtige griffbereit.</h2><p>Packe nur, was du selbst tragen kannst. Hake ab, was bereits vorhanden und einsatzbereit ist.</p><a href="${sources.bbkBag}" target="_blank" rel="noreferrer">Offizielle BBK-Empfehlungen öffnen →</a></div></section>
    <div class="content-wrap packlist-layout"><aside class="packlist-visual"><div class="pack-visual-art">${icon("backpack", "pack-bag-icon")}</div><div class="pack-ring" style="--pack-progress:${percent * 3.6}deg"><strong>${percent}%</strong><small>geprüft</small></div><h2>${checked} von ${total} bereit</h2><p>${readyText}</p><div class="bar"><i style="width:${percent}%"></i></div><small class="packlist-note">Die Liste wird lokal gespeichert und mit deinem Konto synchronisiert. Sie ersetzt keine individuelle Beratung.</small></aside><section class="packlist-content"><div class="packlist-toolbar"><form data-pack-search><label><span>Packliste durchsuchen</span><input name="query" value="${esc(state.ui.packSearch)}" placeholder="z. B. Medikamente"></label><button class="outline">Suchen</button></form><div class="filter-row pack-filters">${categories.map(category => `<button data-pack-filter="${category}" class="${category===state.ui.packFilter?"active":""}">${category}</button>`).join("")}</div></div><div class="packlist-summary"><span>${shown.length} ${shown.length === 1 ? "Eintrag" : "Einträge"}</span><span>${checked} abgehakt · ${total - checked} offen</span></div><div class="pack-items">${shown.length ? shown.map(packItemCard).join("") : `<div class="no-data">${icon("backpack", "big-icon")}<h3>Keine Einträge gefunden</h3><p>Ändere die Suche oder wähle eine andere Kategorie.</p></div>`}</div></section></div>`;
  app.innerHTML = loggedShell("packliste", content, "packlist-page");
}

function renderSupplies() {
  const percent = supplyPercent();
  const customSupplies = normalizeCustomSupplies(state.customSupplies);
  const filters = ["Alle", "Versorgung", "Gesundheit", "Haushalt", ...(customSupplies.some(item => item.category === "Sonstiges") ? ["Sonstiges"] : [])];
  const relevantGroups = supplyGroups.filter(group => group.id !== "pet" || petCount() > 0);
  const shownGroups = relevantGroups.filter(group => state.ui.supplyFilter === "Alle" || group.category === state.ui.supplyFilter);
  const shownCustomSupplies = customSupplies.filter(item => state.ui.supplyFilter === "Alle" || item.category === state.ui.supplyFilter);
  const content = `<section class="image-hero pantry-hero" ${sceneStyle("supplies")}><div><h1>Vorräte</h1><h2>Heute vorsorgen. Morgen sicher.</h2><p>Ein alltagstauglicher Vorrat schafft Handlungsspielraum, wenn Versorgung oder Strom ausfallen.</p><a href="${sources.bbkGuide}" target="_blank" rel="noreferrer">Empfehlungen des BBK öffnen →</a></div></section>
    <div class="content-wrap supplies-layout"><aside class="side-card supply-progress-card"><small>VORRATSFORTSCHRITT</small><strong>${percent === null ? "Noch nicht erfasst" : `${percent} %`}</strong><div class="bar"><i style="width:${percent === null ? 0 : percent}%"></i></div><p>${percent === null ? "Trage deine tatsächlichen Bestände ein." : "Aus deinen selbst eingetragenen Beständen berechnet."}</p><button class="outline" data-open-supply="water">Jetzt erfassen</button></aside>
    <section><article class="household-card">${icon("profile","big-icon")}<div><small>HAUSHALT</small><h2>${esc(householdSummary())}</h2><p>Empfohlener Betrachtungszeitraum: <b>10 Tage</b> · <button data-edit-household>Angaben ändern</button></p></div></article>
      <div class="supply-toolbar"><div class="filter-row">${filters.map(f => `<button data-supply-filter="${f}" class="${f===state.ui.supplyFilter?"active":""}">${f}</button>`).join("")}</div><button class="green add-supply-button" data-add-custom-supply>+ Eigenen Vorrat hinzufügen</button></div>
      <div class="supply-table"><div class="table-head"><span>Bereich</span><span>BBK-orientiertes Ziel</span><span>Dein Bestand</span><span></span></div>
        ${shownGroups.map(group => { const val = state.supplies[group.id]; const complete = val !== null && val >= supplyTarget(group); return `<article><div>${icon(group.icon,"row-icon")}<span><b>${group.label}</b><small>${supplyNote(group)}</small></span></div><strong>${supplyTargetLabel(group)}</strong><span class="${complete?"complete":val===null?"unknown":"partial"}">${supplyValueLabel(group,val)}</span><button data-open-supply="${group.id}">Bearbeiten</button></article>`; }).join("")}
        ${shownCustomSupplies.map(item => `<article class="custom-supply-row"><div>${icon(customSupplyIcon(item.category),"row-icon")}<span><b>${esc(item.label)}</b><small>${esc(item.note || item.category)}</small></span></div><strong><span class="custom-supply-badge">Eigener Eintrag</span></strong><span class="complete">${fmt(item.quantity)} ${esc(item.unit)}</span><button data-edit-custom-supply="${esc(item.id)}">Bearbeiten</button></article>`).join("")}
        ${!shownGroups.length && !shownCustomSupplies.length ? `<div class="supply-empty"><p>In dieser Kategorie gibt es noch keine Einträge.</p><button class="outline" data-add-custom-supply>Eigenen Vorrat hinzufügen</button></div>` : ""}</div>
      <p class="source-note">Ziele sind Orientierung, kein amtliches Prüfsiegel. Medikamente und Sonderbedarf individuell abstimmen. Eigene Einträge ergänzen deine persönliche Liste, verändern aber keine BBK-orientierten Ziele und fließen nicht in den RedScore ein.</p>
    </section></div>`;
  app.innerHTML = loggedShell("supplies", content, "supplies-page");
}

function mapLocationKey() {
  return [state.household.postalCode, state.household.city, state.household.state].filter(Boolean).join("|").toLowerCase();
}
function storePlacesCache() {
  try { localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify({ key: placesState.key, center: placesState.center, places: placesState.places, fetchedAt: placesState.fetchedAt })); }
  catch { /* The online map remains usable without a local cache. */ }
}
async function requestNearbyPlaces(force = false) {
  const key = mapLocationKey();
  if (!state.authenticated || !state.household.city || !state.household.postalCode || placesRequest) return placesRequest;
  if (!navigator.onLine) { placesState.status = placesState.places.length && placesState.key === key ? "offline" : "error"; return; }
  if (!force && placesState.key === key && placesState.places.length && Date.now() - Date.parse(placesState.fetchedAt || 0) < 6 * 60 * 60_000) return;
  placesState.status = placesState.places.length && placesState.key === key ? "refreshing" : "loading";
  const params = new URLSearchParams({ postalCode: state.household.postalCode, city: state.household.city, state: state.household.state || "" });
  placesRequest = fetch(`/api/places?${params}`, { cache: "no-store", headers: { accept: "application/json" } })
    .then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Ortsdaten nicht verfügbar");
      placesState = { status: "live", key, center: payload.center, places: Array.isArray(payload.places) ? payload.places : [], fetchedAt: payload.generatedAt || new Date().toISOString(), error: null };
      storePlacesCache();
    })
    .catch(error => { placesState.status = placesState.places.length && placesState.key === key ? "offline" : "error"; placesState.error = error instanceof Error ? error.message : "Ortsdaten nicht verfügbar"; })
    .finally(() => { placesRequest = null; if (state.authenticated && hashRoute() === "map") renderMap(); });
  return placesRequest;
}
function placeIcon(category) {
  return ({ Behörden: "profile", Versorgung: "supplies", Gesundheit: "medical", Schutzräume: "home", Hilfe: "weather-warning" })[category] || "map";
}
function osmEmbed(center, destination = null) {
  if (!center || !navigator.onLine) return "";
  const lat = Number(center.lat), lon = Number(center.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
  const targetLat = Number(destination?.lat), targetLon = Number(destination?.lon);
  const hasDestination = Number.isFinite(targetLat) && Number.isFinite(targetLon);
  const minLat = hasDestination ? Math.min(lat, targetLat) : lat;
  const maxLat = hasDestination ? Math.max(lat, targetLat) : lat;
  const minLon = hasDestination ? Math.min(lon, targetLon) : lon;
  const maxLon = hasDestination ? Math.max(lon, targetLon) : lon;
  const latPadding = Math.max(.012, (maxLat - minLat) * .35);
  const lonPadding = Math.max(.02, (maxLon - minLon) * .35);
  const bbox = [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding].map(value => value.toFixed(6)).join(",");
  const markerLat = hasDestination ? targetLat : lat;
  const markerLon = hasDestination ? targetLon : lon;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${markerLat.toFixed(6)}%2C${markerLon.toFixed(6)}`;
}

function routeDistance(meters) {
  return meters < 1000 ? `${Math.max(50, Math.round(meters / 50) * 50)} m` : `${fmt(meters / 1000)} km`;
}
function routeDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `ca. ${minutes} Min.`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `ca. ${hours} Std.${rest ? ` ${rest} Min.` : ""}`;
}
async function requestPlaceRoute(placeId) {
  const place = placesState.places.find(item => item.id === placeId);
  const center = placesState.center;
  if (!place || !center) return toast("Start oder Routenziel ist nicht verfügbar.");
  if (!navigator.onLine) {
    mapRouteState = { status: "error", placeId, route: null, error: "Die Routenberechnung benötigt eine Internetverbindung." };
    return renderMap();
  }
  mapRouteState = { status: "loading", placeId, route: null, error: null };
  renderMap();
  try {
    const response = await fetch("/api/route", {
      method: "POST",
      cache: "no-store",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ fromLat: center.lat, fromLon: center.lon, toLat: place.lat, toLon: place.lon }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Route nicht verfügbar");
    if (mapRouteState.placeId !== placeId) return;
    mapRouteState = { status: "ready", placeId, route: payload, error: null };
  } catch (error) {
    if (mapRouteState.placeId !== placeId) return;
    mapRouteState = { status: "error", placeId, route: null, error: error instanceof Error ? error.message : "Route nicht verfügbar" };
  }
  renderMap();
  document.querySelector(".route-overview")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function renderMap() {
  const categories = ["Alle", "Behörden", "Versorgung", "Gesundheit", "Hilfe", "Schutzräume"];
  const currentKey = mapLocationKey();
  const hasCurrentData = placesState.key === currentKey;
  const allPlaces = hasCurrentData ? placesState.places : [];
  const shown = allPlaces.filter(place => state.ui.mapFilter === "Alle" || place.category === state.ui.mapFilter);
  const location = state.household.location || state.household.city || "Standort nicht eingerichtet";
  const selectedPlace = allPlaces.find(place => place.id === mapRouteState.placeId) || null;
  const embed = hasCurrentData ? osmEmbed(placesState.center, selectedPlace) : "";
  const mapStatus = placesState.status === "loading" ? "Orte werden geladen …" : placesState.status === "refreshing" ? "Ortsdaten werden aktualisiert …" : placesState.status === "offline" ? `Offline-Stand ${relativeTime(placesState.fetchedAt)}` : placesState.status === "error" ? (placesState.error || "Ortsdaten nicht verfügbar") : `OpenStreetMap-Daten · ${relativeTime(placesState.fetchedAt)}`;
  const routeOverview = selectedPlace ? `<article class="route-overview ${mapRouteState.status}">
    <div>${icon(placeIcon(selectedPlace.category), "route-place-icon")}<span><small>ROUTENZIEL</small><b>${esc(selectedPlace.name)}</b><em>${esc(selectedPlace.address || selectedPlace.distanceLabel)}</em></span></div>
    ${mapRouteState.status === "loading" ? `<p><i></i> Fahrtroute wird innerhalb von RedScore berechnet …</p>` : mapRouteState.status === "ready" ? `<p><strong>${routeDistance(mapRouteState.route.distanceMeters)}</strong><strong>${routeDuration(mapRouteState.route.durationSeconds)}</strong><small>PKW-Route · ${esc(mapRouteState.route.source)}</small></p>` : `<p class="route-error">${esc(mapRouteState.error || "Route nicht verfügbar")}</p>`}
    <button data-map-route-close aria-label="Routenansicht schließen">×</button>
  </article>` : "";
  const content = `<section class="image-hero shelter-hero"><div><h1>SafePlaces</h1><h2>Schutz in deiner Nähe auf einer echten Karte.</h2><p>RedScore zeigt nachvollziehbare Infrastruktur aus OpenStreetMap. Als Schutzraum gilt ein Ort nur, wenn er dort ausdrücklich so gekennzeichnet ist.</p></div></section>
    <div class="map-controls"><div>⌖ <b>${esc(location)}</b><small>${esc(mapStatus)}</small></div><button data-edit-household>Standort ändern</button><button data-map-refresh>Neu laden</button><button data-save-offline>${state.settings.offlinePlacesSaved ? "Offline-Liste aktualisieren" : "Offline-Liste speichern"}</button></div>
    <div class="filter-row wide">${categories.map(f => `<button data-map-filter="${f}" class="${f===state.ui.mapFilter?"active":""}">${f}</button>`).join("")}</div>
    <div class="map-layout"><section class="place-list"><h2>Orte (${shown.length})</h2>${placesState.status === "loading" && !shown.length ? `<div class="no-data map-loading"><span></span><h3>Karte wird vorbereitet</h3><p>Standort und relevante Infrastruktur werden sicher serverseitig abgefragt.</p></div>` : shown.length ? shown.map(place => `<article class="${place.id === mapRouteState.placeId ? "route-selected" : ""}">${icon(placeIcon(place.category),"place-icon")}<div><b>${esc(place.name)}</b><small>${esc(place.address || place.distanceLabel)}</small><em>${esc(place.category)} · ${esc(place.distanceLabel)} · OpenStreetMap</em></div><button data-map-route="${esc(place.id)}" aria-label="Route zu ${esc(place.name)} innerhalb von RedScore anzeigen">${place.id === mapRouteState.placeId ? "Ausgewählt" : "Route"} →</button></article>`).join("") : `<div class="no-data">${icon("home","big-icon")}<h3>${state.household.city ? "Keine passenden Orte gefunden" : "Standort noch nicht eingerichtet"}</h3><p>${state.household.city ? "Wechsle den Filter oder aktualisiere die Suche. Behördlich ausgewiesene Schutzräume sind in Deutschland nur lückenhaft erfasst." : "Ergänze Postleitzahl und Ort in deinen Haushaltsangaben."}</p></div>`}</section>
      <section class="real-map ${embed ? "online-map" : "offline-map"} ${selectedPlace ? "has-route" : ""}" aria-label="${selectedPlace ? `Route zu ${esc(selectedPlace.name)}` : "Karte wichtiger Anlaufstellen"}">${routeOverview}${embed ? `<iframe src="${embed}" title="${selectedPlace ? `OpenStreetMap mit Routenziel ${esc(selectedPlace.name)}` : `OpenStreetMap rund um ${esc(location)}`}" loading="lazy" referrerpolicy="no-referrer"></iframe><span>© OpenStreetMap-Mitwirkende</span>` : `<div class="map-unavailable">${icon("map","big-icon")}<h3>${navigator.onLine ? "Karte wird geladen" : "Karte offline"}</h3><p>${navigator.onLine ? "Die Kartenansicht erscheint nach dem Ortsabgleich." : "Deine zuletzt gespeicherte Ortsliste bleibt verfügbar. Kartenkacheln benötigen eine Internetverbindung."}</p></div>`}</section>
    </div><p class="map-source-note">OpenStreetMap-Einträge sind Gemeinschaftsdaten und keine amtliche Bestätigung der Eignung im Katastrophenfall. Prüfe Öffnungszeiten und behördliche Hinweise.</p><div class="emergency-bar">⚠ <b>Im Ernstfall:</b> Aktuelle Warnmeldungen und behördliche Anweisungen haben Vorrang. <button data-route="warnschutz">Warnstatus prüfen →</button></div>`;
  app.innerHTML = loggedShell("map", content, "map-page");
  requestNearbyPlaces();
}

function renderWarnschutz() {
  const checked = warningState.checkedAt ? new Date(warningState.checkedAt).toLocaleTimeString(getLanguage() === "en" ? "en-GB" : "de-DE",{hour:"2-digit",minute:"2-digit"}) : "–";
  const content = `<section class="image-hero warning-hero"><div><h1>Früh informiert.<br><em>Besser vorbereitet.</em></h1><p>Amtliche Wetterwarnungen und belastbare Warnwege für ${esc(state.household.city || "deinen Standort")}.</p></div></section>
    <div class="warning-layout"><section><article class="current-warning ${warningState.status==="ok"&&!warningState.warnings.length?"safe":warningState.status==="fallback"?"neutral":""}">${icon(warningState.warnings.length?"weather-warning":"health","warning-large")}${warningSummary()}<span>Live-Prüfung: ${checked}</span><a href="${sources.dwd}" target="_blank" rel="noreferrer">Beim DWD öffnen ↗</a></article>
      <div class="warning-cards"><article>${icon("bell","big-icon")}<h3>Cell Broadcast</h3><p>Warnungen werden auf kompatiblen, eingeschalteten Mobiltelefonen ohne App ausgesendet.</p></article><article>${icon("weather-warning","big-icon")}<h3>NINA</h3><p>Die offizielle Warn-App des BBK bündelt Zivil-, Polizei-, Wetter- und Hochwasserwarnungen.</p><a href="${sources.nina}" target="_blank">NINA beim BBK ↗</a></article><article>${icon("radio","big-icon")}<h3>Radio</h3><p>Ein Batterie-, Solar- oder Kurbelradio bleibt bei Strom- und Internetausfall wichtig.</p></article></div>
    </section><aside><h3>Benachrichtigungen</h3><p>RedScore kann den Browserzugriff anfragen. Eine Freigabe ersetzt keine Warn-App.</p><button class="green" data-notifications>${"Notification" in window && Notification.permission === "granted" ? "Browser-Mitteilungen erlaubt" : "Berechtigung prüfen"}</button><h3>Verhalten bei Unwetter</h3><ul><li>Amtliche Meldungen verfolgen</li><li>Fenster und Türen schließen</li><li>Lose Gegenstände sichern</li><li>Überflutete Bereiche meiden</li></ul></aside></div>`;
  app.innerHTML = loggedShell("warnschutz", content, "warn-page");
  requestWarnings();
}

function renderKnowledge() {
  const query = state.ui.knowledgeSearch.toLowerCase();
  const shown = knowledgeArticles.filter(a => !query || `${a.title} ${a.summary} ${translateText(a.title)} ${translateText(a.summary)}`.toLowerCase().includes(query));
  const content = `<section class="image-hero knowledge-hero" ${sceneStyle("knowledge")}><div><h1>Wissen <em>schützt.</em></h1><h2>Verstehen. Vorbereiten. Handeln.</h2><p>Verständliche Hinweise und offizielle Quellen für mehr Sicherheit in allen Lebenslagen.</p><form data-knowledge-search><input name="query" value="${esc(state.ui.knowledgeSearch)}" placeholder="Thema suchen …"><button>⌕</button></form></div><span class="sign-copy">WISSEN<br>VON HEUTE.<br>SICHERHEIT<br>VON MORGEN.</span></section>
    <div class="content-wrap knowledge-content"><section><h2>Empfehlungen für dich</h2><div class="article-grid">${shown.map(article => `<article><div class="article-visual">${icon(article.icon,"article-icon")}</div><small>${article.category} · ${article.minutes} Min.</small><h3>${article.title}</h3><p>${article.summary}</p><button data-article="${article.id}">Ansehen →</button></article>`).join("")}</div></section>
      <aside class="knowledge-side"><h3>Offizielle Ressourcen</h3><a href="${sources.bbkGuide}" target="_blank">BBK-Ratgeber ↗</a><a href="${sources.bbkBag}" target="_blank">Notgepäck ↗</a><a href="${sources.bbkDocuments}" target="_blank">Dokumente sichern ↗</a><a href="${sources.nina}" target="_blank">Warn-App NINA ↗</a></aside></div>`;
  app.innerHTML = loggedShell("knowledge", content, "knowledge-page");
}

function renderProfile() {
  const petSummary = (state.household.pets || []).map(pet => `${pet.count}× ${pet.label || petLabel(pet.type)}`).join(", ") || "Keine Haustiere";
  const content = `<div class="content-wrap profile-layout"><section><h1>Profil</h1><article class="profile-card"><div class="avatar large">${esc(state.profile.initials)}</div><div><h2>${esc(state.profile.name)}</h2><p>${esc(householdSummary())}</p><small>${esc([state.household.location, state.household.state].filter(Boolean).join(" · "))}</small></div></article>
    <div class="settings-list"><article>${icon("map","row-icon")}<span><b>Standort</b><small>${esc([state.household.location, state.household.district, state.household.state].filter(Boolean).join(" · "))}</small></span></article><article>${icon("profile","row-icon")}<span><b>Haushalt</b><small>${esc(householdSummary())} · ${esc(petSummary)}</small></span></article><article>${icon("settings","row-icon")}<span><b>Datenschutz</b><small>Vorsorgedaten werden kontogebunden gespeichert und bleiben auf diesem Gerät offline verfügbar. RedScore lädt keine privaten Fotos hoch und führt keine Gesichtsanalyse durch.</small></span></article></div>
  </section><aside class="profile-actions"><button class="outline" data-edit-household>Haushalt bearbeiten</button><button class="outline" data-open-assessment>Vorsorgestand neu prüfen</button><button class="red" data-logout>Abmelden</button></aside></div>`;
  app.innerHTML = loggedShell("profile", content, "profile-page");
}

function modal() {
  if (!state.ui.modal) return "";
  if (state.ui.modal.startsWith("legal:")) {
    const page = state.ui.modal.slice(6);
    const contents = {
      about: ["Über RedScore", `<p>RedScore ist ein bürgerfreundliches Katastrophenvorbereitungssystem. Es verbindet persönliche Vorsorge, Vorratsplanung, verifizierte Anlaufstellen, Warnwege und eine strukturierte Lageübersicht.</p><p>RedScore ersetzt keine amtliche Warnung oder fachliche Beratung. Im Ereignisfall gelten die Anweisungen der zuständigen Behörden.</p>`],
      privacy: ["Datenschutzhinweise", `<h3>Welche Daten verarbeitet werden</h3><p>Für das Konto werden E-Mail-Adresse, Anzeigename, freiwillige Haushaltsangaben, Standortangaben, Vorsorgeantworten und Bestände verarbeitet. Private Fotos werden weder angefordert noch verarbeitet.</p><h3>Zweck und Speicherung</h3><p>Die Daten dienen ausschließlich der personalisierten Vorsorgeplanung, Synchronisierung und Offline-Nutzung. Kontodaten werden bei Supabase in der EU gespeichert; die Webanwendung wird über Vercel bereitgestellt. Zusätzlich hält das Endgerät eine Offline-Kopie.</p><h3>Deine Rechte</h3><p>Du kannst Auskunft, Berichtigung, Löschung, Einschränkung oder Datenübertragbarkeit anfragen. Kontakt: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p><p>Die Live-Lage speichert keine privaten Profile in externen Feeds. Browser-Mitteilungen werden nur nach ausdrücklicher Freigabe aktiviert.</p>`],
      imprint: ["Impressum", `<h3>Angaben gemäß § 5 DDG</h3><p><b>Nicole Mrozinski</b><br>RedScore – Dein Vorsprung im Ernstfall<br>Geschäftsanschrift:<br>Franz-Rehling-Weg 22<br>21729 Freiburg (Elbe)<br>Deutschland</p><h3>Kontakt</h3><p>E-Mail: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br>Web: <a href="https://www.redscore.de">www.redscore.de</a></p><h3>Gerichtsstand</h3><p>Für Rechtsverhältnisse, bei denen eine Gerichtsstandsvereinbarung gesetzlich zulässig ist, ist die Hansestadt Stade als Gerichtsstand vereinbart. Gesetzlich zwingende Gerichtsstände bleiben unberührt.</p><h3>Verantwortung und Haftung</h3><p>RedScore bereitet öffentlich zugängliche Vorsorgeinformationen auf. Trotz sorgfältiger Prüfung besteht kein Anspruch auf Vollständigkeit oder ständige Aktualität. Amtliche Warnungen und behördliche Anweisungen haben Vorrang.</p>`],
    };
    const [title, content] = contents[page] || contents.about;
    return `<div class="modal-backdrop"><section class="modal legal-modal"><button class="modal-close" data-close-modal>×</button><small>REDSCORE</small><h2>${title}</h2>${content}<small>Stand: 1. Oktober 2026</small></section></div>`;
  }
  if (["login", "register"].includes(state.ui.modal)) {
    const register = state.ui.modal === "register";
    return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal>×</button>${icon("profile","modal-icon")}<small>SICHERES REDSCORE-KONTO</small><h2>${register ? "Kostenlos registrieren" : "Einloggen"}</h2><div class="auth-tabs"><button data-open-auth="login" class="${register ? "" : "active"}">Einloggen</button><button data-open-auth="register" class="${register ? "active" : ""}">Registrieren</button></div><form data-auth-form="${register ? "register" : "login"}">${register ? `<label><span>Name</span><input name="displayName" autocomplete="name" maxlength="80" required></label>` : ""}<label><span>E-Mail</span><input name="email" type="email" autocomplete="email" required></label><label><span>Passwort</span><input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="8" required></label><button class="green full" ${accountBusy ? "disabled" : ""}>${accountBusy ? "Bitte warten …" : register ? "Konto anlegen →" : "Einloggen →"}</button></form><em>${register ? "Nach der Registrierung richtest du deinen Haushalt inklusiv ein. Private Fotos werden nicht benötigt." : "Deine Daten werden zwischen deinen Geräten synchronisiert und bleiben offline verfügbar."}</em></section></div>`;
  }
  if (state.ui.modal === "onboarding") {
    const adults = state.household.adults?.length || 1;
    const petAmount = type => state.household.pets?.find(pet => pet.type === type)?.count || 0;
    return `<div class="modal-backdrop"><section class="modal onboarding-modal"><small>ERSTEINRICHTUNG · DEIN HAUSHALT</small><h2>Damit RedScore wirklich zu euch passt</h2><p>Wir fragen nur die Angaben ab, die Mengen, Aufgaben und das passende Haushaltsmotiv beeinflussen. Beziehungsstatus oder sexuelle Orientierung werden nicht erfasst.</p><form data-onboarding-form><div class="onboarding-grid"><label><span>Dein Anzeigename</span><input name="displayName" value="${esc(state.profile.name)}" maxlength="80" autocomplete="name" required></label><label><span>Erwachsene Personen</span><input name="adultCount" type="number" min="1" max="8" value="${adults}" required></label><div class="adult-identities" data-adult-identities>${Array.from({ length: 8 }, (_, index) => `<label class="adult-identity" data-adult-index="${index}" ${index >= adults ? "hidden" : ""}><span>Person ${index + 1} – freiwillige Selbstbezeichnung</span><select name="adultGender${index}" ${index < adults ? "required" : ""}><option value="unspecified">Keine Angabe</option><option value="woman" ${state.household.adults?.[index]?.gender === "woman" ? "selected" : ""}>Frau</option><option value="man" ${state.household.adults?.[index]?.gender === "man" ? "selected" : ""}>Mann</option><option value="diverse" ${state.household.adults?.[index]?.gender === "diverse" ? "selected" : ""}>Divers / nichtbinär</option></select></label>`).join("")}</div><label><span>Kinder im Haushalt</span><input name="children" type="number" min="0" max="12" value="${state.household.children || 0}" required></label><fieldset class="pet-fields"><legend>Haustiere – Anzahl je Art</legend>${[["dog","Hunde"],["cat","Katzen"],["bird","Vögel"],["small_animal","Kleintiere"],["fish","Fische / Aquarien"],["reptile","Reptilien"],["other","Andere Tiere"]].map(([type,label]) => `<label><span>${label}</span><input name="pet_${type}" type="number" min="0" max="20" value="${petAmount(type)}"></label>`).join("")}</fieldset><label><span>Postleitzahl</span><input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" value="${esc(state.household.postalCode)}" required></label><label><span>Ort</span><input name="city" value="${esc(state.household.city)}" maxlength="80" required></label><label><span>Bundesland</span><input name="state" value="${esc(state.household.state)}" maxlength="80" required></label><label><span>Landkreis / Region (optional)</span><input name="district" value="${esc(state.household.district)}" maxlength="100"></label></div><button class="green full">Haushalt speichern und starten →</button></form></section></div>`;
  }
  if (state.ui.modal === "assessment") {
    const questions = relevantAssessmentQuestions();
    const answered = questions.filter(([id]) => typeof state.assessment.answers[id] === "boolean").length;
    return `<div class="modal-backdrop"><section class="modal assessment-modal"><button class="modal-close" data-close-modal>×</button><small>TRANSPARENTE EIGENE AUSWERTUNG</small><h2>RedScore Vorsorge-Check</h2><p>Beantworte alle Fragen ehrlich. Jede Ja-Antwort zählt gleich; unbeantwortete Fragen erzeugen keinen Score.</p><div class="assessment-progress">${answered} von ${questions.length} beantwortet</div><div class="question-list">${questions.map(([id,q,hint],i) => `<article><b>${i+1}</b><div><strong>${q}</strong><small>${hint}</small></div><div><button data-answer="${id}:true" class="${state.assessment.answers[id]===true?"yes":""}">Ja</button><button data-answer="${id}:false" class="${state.assessment.answers[id]===false?"no":""}">Nein</button></div></article>`).join("")}</div><button class="green full" data-finish-assessment ${answered < questions.length ? "disabled" : ""}>Auswertung berechnen</button><a href="${sources.bbkChecklist}" target="_blank">Grundlage: BBK-Ratgeber und Checkliste ↗</a></section></div>`;
  }
  if (state.ui.modal.startsWith("custom-supply:")) {
    const id = state.ui.modal.slice("custom-supply:".length);
    const item = id === "new" ? null : normalizeCustomSupplies(state.customSupplies).find(entry => entry.id === id);
    if (id !== "new" && !item) return "";
    const selectedCategory = item?.category || (customSupplyCategories.includes(state.ui.supplyFilter) && state.ui.supplyFilter !== "Alle" ? state.ui.supplyFilter : "Versorgung");
    return `<div class="modal-backdrop"><section class="modal supply-modal custom-supply-modal"><button class="modal-close" data-close-modal>×</button>${icon(customSupplyIcon(selectedCategory),"modal-icon")}<small>PERSÖNLICHER VORRAT</small><h2>${item ? "Eigenen Eintrag bearbeiten" : "Eigenen Vorrat hinzufügen"}</h2><p>Ergänze Dinge, die für deinen Haushalt wichtig sind, mit ihrer tatsächlichen Menge.</p><form data-custom-supply-form="${item ? esc(item.id) : "new"}"><label><span>Bezeichnung</span><input name="label" value="${esc(item?.label || "")}" maxlength="80" placeholder="z. B. Babynahrung" required></label><label><span>Kategorie</span><select name="category" required>${customSupplyCategories.map(category => `<option value="${category}" ${category === selectedCategory ? "selected" : ""}>${category}</option>`).join("")}</select></label><div class="custom-supply-quantity"><label><span>Menge</span><input name="quantity" type="number" min="0" max="999999" step="0.1" inputmode="decimal" value="${item ? esc(item.quantity) : ""}" placeholder="0" required></label><label><span>Einheit</span><input name="unit" list="supply-unit-options" value="${esc(item?.unit || "Stück")}" maxlength="30" placeholder="Stück" required><datalist id="supply-unit-options"><option value="Stück"><option value="Liter"><option value="kg"><option value="g"><option value="Packungen"><option value="Dosen"><option value="Flaschen"><option value="Tage"><option value="Sets"></datalist></label></div><label><span>Notiz (optional)</span><input name="note" value="${esc(item?.note || "")}" maxlength="160" placeholder="z. B. kühl und trocken lagern"></label><button class="green full">Eintrag speichern</button>${item ? `<button class="delete-custom-supply" type="button" data-delete-custom-supply="${esc(item.id)}">Eintrag löschen</button>` : ""}</form><em>Eigene Einträge werden offline gespeichert und mit deinem Konto synchronisiert. Sie verändern den RedScore nicht.</em></section></div>`;
  }
  if (state.ui.modal.startsWith("supply:")) {
    const id = state.ui.modal.split(":")[1], group = supplyGroups.find(g => g.id === id), value = state.supplies[id];
    return `<div class="modal-backdrop"><section class="modal supply-modal"><button class="modal-close" data-close-modal>×</button>${icon(group.icon,"modal-icon")}<small>ECHTEN BESTAND EINTRAGEN</small><h2>${group.label}</h2><p>Ziel: ${supplyTargetLabel(group)}<br>${supplyNote(group)}</p><form data-supply-form="${id}">${supplyInput(group,value)}<button class="green full">Speichern</button></form><em>Der Wert wird lokal offline gespeichert und mit deinem RedScore-Konto synchronisiert.</em></section></div>`;
  }
  if (state.ui.modal.startsWith("task:")) {
    const id = state.ui.modal.split(":")[1], task = tasks.find(t => t.id === id);
    return `<div class="modal-backdrop"><section class="modal task-modal"><button class="modal-close" data-close-modal>×</button>${icon(task.icon,"modal-icon")}<small>${task.priority.toUpperCase()} · ${task.category.toUpperCase()}</small><h2>${task.title}</h2><p>${task.description}</p><ul>${task.checklist.map(item => `<li>✓ ${item}</li>`).join("")}</ul>${task.id === "backpack" ? `<button class="outline full" data-open-packlist>Interaktive Packliste öffnen</button>` : ""}<button class="green full" data-task-done="${task.id}">${state.taskStatus[task.id]?"Wieder öffnen":"Als erledigt markieren"}</button></section></div>`;
  }
  if (state.ui.modal.startsWith("article:")) {
    const id = state.ui.modal.split(":")[1], article = knowledgeArticles.find(a => a.id === id);
    return `<div class="modal-backdrop"><section class="modal article-modal"><button class="modal-close" data-close-modal>×</button>${icon(article.icon,"modal-icon")}<small>${article.category}</small><h2>${article.title}</h2><p>${article.summary}</p><ul>${article.bullets.map(item => `<li>${item}</li>`).join("")}</ul><a class="green link-button" href="${sources.bbkGuide}" target="_blank">BBK-Ratgeber öffnen ↗</a></section></div>`;
  }
  if (state.ui.modal.startsWith("live:")) {
    const id = state.ui.modal.slice(5);
    const event = visibleLiveEvents().find(item => item.id === id);
    if (!event) return "";
    const originals = (Array.isArray(event.sources) ? event.sources : []).filter(source => safeExternalUrl(source.url));
    const originalUrl = safeExternalUrl(event.canonical_url);
    const affected = Array.isArray(event.affected_regions) ? event.affected_regions : [];
    const locale = getLanguage() === "en" ? "en-GB" : "de-DE";
    return `<div class="modal-backdrop"><section class="modal live-detail-modal"><button class="modal-close" data-close-modal>×</button>${icon(liveEventIcon(event.category),"modal-icon")}<small>${esc(liveCategoryLabels[event.category] || "LAGEEREIGNIS")} · ${esc(liveVerificationLabels[event.verification_status] || liveVerificationLabels.unknown)}</small><h2>${esc(event.title)}</h2><p>${esc(event.summary)}</p>${Number(event.cluster_count) > 1 ? `<div class="cluster-explanation"><b>${Number(event.cluster_count)} gleichartige Regionalmeldungen zusammengefasst</b><span>RedScore zeigt sie als ein Lageereignis, die einzelnen betroffenen Gebiete bleiben nachvollziehbar.</span></div>` : ""}<dl><div><dt>Veröffentlicht</dt><dd>${new Date(event.published_at).toLocaleString(locale)}</dd></div><div><dt>Von RedScore gefunden</dt><dd>${new Date(event.first_seen_at).toLocaleString(locale)}</dd></div><div><dt>Region</dt><dd>${esc([event.city,event.region,event.country].filter(Boolean).join(" · ") || "nicht ermittelt")}</dd></div><div><dt>Relevanz</dt><dd>${esc(liveSeverityLabels[event.relevance?.level] || "GERING")}</dd></div></dl>${affected.length ? `<h3>Betroffene Gebiete (${affected.length})</h3><div class="live-region-list">${affected.map(region => `<span>${esc(region)}</span>`).join("")}</div>` : ""}<h3>Nachvollziehbare Quellen (${originals.length})</h3><div class="live-source-list">${originals.map(source => `<a href="${safeExternalUrl(source.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(source.name)}</b><small>${esc(source.title || "Originalmeldung")} · ${relativeTime(source.published_at)}</small></a>`).join("") || "<p>Keine veröffentlichte Original-URL verfügbar.</p>"}</div>${originalUrl ? `<a class="green link-button" href="${originalUrl}" target="_blank" rel="noopener noreferrer">Originalmeldung öffnen ↗</a>` : ""}<em>Diese Lageübersicht ersetzt keine amtliche Warnung. Folge im Ereignisfall den Anweisungen der Behörden.</em></section></div>`;
  }
  return "";
}

function render() {
  if (!state.authenticated) renderPublic();
  else {
    const route = hashRoute();
    ({ home: renderHome, plan: renderPlan, packliste: renderPacklist, supplies: renderSupplies, map: renderMap, warnschutz: renderWarnschutz, knowledge: renderKnowledge, profile: renderProfile }[route] || renderHome)();
  }
  applyLanguage(app);
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
  if (button.hasAttribute("data-language-toggle")) { languageMenuOpen = !languageMenuOpen; return render(); }
  if (button.dataset.language) {
    const nextLanguage = button.dataset.language === "en" ? "en" : "de";
    const changed = getLanguage() !== nextLanguage;
    setLanguage(nextLanguage);
    languageMenuOpen = false;
    if (changed) {
      liveState.events = [];
      liveState.sources = [];
      liveState.receivedAt = null;
      liveState.lastSyncAt = null;
      liveState.status = navigator.onLine ? "loading" : "offline";
    }
    render();
    if (changed && state.authenticated) requestLiveLage(true);
    return;
  }
  if (button.dataset.legal) { state.ui.modal = `legal:${button.dataset.legal}`; return render(); }
  if (button.dataset.route) return navigate(button.dataset.route);
  if (button.dataset.packFilter) { state.ui.packFilter = button.dataset.packFilter; save(); return render(); }
  if (button.dataset.packItem) { state.packlist[button.dataset.packItem] = !state.packlist[button.dataset.packItem]; save(); toast(state.packlist[button.dataset.packItem] ? "Für den Notfallrucksack abgehakt." : "Eintrag wieder geöffnet."); return render(); }
  if (button.dataset.supplySuggestion) {
    const input = button.closest("form")?.querySelector('input[name="value"]');
    if (input) { input.value = button.dataset.supplySuggestion; input.focus(); }
    return;
  }
  if (button.dataset.liveScope) { liveState.scope = button.dataset.liveScope; liveState.events = []; render(); return requestLiveLage(true); }
  if (button.dataset.liveFilter) { liveState.filter = button.dataset.liveFilter; liveState.events = []; render(); return requestLiveLage(true); }
  if (button.matches("[data-live-refresh]")) return requestLiveLage(true);
  if (button.dataset.liveDetail) { state.ui.modal = `live:${button.dataset.liveDetail}`; return render(); }
  if (button.dataset.scroll) return document.querySelector("#"+button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
  if (button.dataset.openAuth) { state.ui.modal = button.dataset.openAuth; return render(); }
  if (button.matches("[data-edit-household]")) { state.ui.modal = "onboarding"; return render(); }
  if (button.matches("[data-logout]")) {
    try { if (session?.access_token) await accountRequest("sign_out"); } catch { /* local logout still succeeds */ }
    persistSession(null); state = clone(defaultState); localStorage.removeItem(STORAGE_KEY); location.hash = ""; return render();
  }
  if (button.matches("[data-close-modal]") || event.target.classList.contains("modal-backdrop")) { state.ui.modal = null; return render(); }
  if (button.matches("[data-open-packlist]")) { state.ui.modal = null; return navigate("packliste"); }
  if (button.matches("[data-open-assessment]")) { state.ui.modal = "assessment"; return render(); }
  if (button.dataset.answer) { const [id,val] = button.dataset.answer.split(":"); state.assessment.answers[id] = val === "true"; save(); return render(); }
  if (button.matches("[data-finish-assessment]")) { if (relevantAssessmentQuestions().every(([id]) => typeof state.assessment.answers[id] === "boolean")) { state.assessment.completedAt = new Date().toISOString(); state.ui.modal = null; save(); toast("Dein eigener Vorsorgestand wurde berechnet."); render(); } return; }
  if (button.dataset.taskDone) { state.taskStatus[button.dataset.taskDone] = !state.taskStatus[button.dataset.taskDone]; state.ui.modal = null; save(); toast("Aufgabenstatus gespeichert."); return render(); }
  if (button.dataset.taskDetail) { state.ui.modal = "task:"+button.dataset.taskDetail; return render(); }
  if (button.dataset.planFilter) { state.ui.planFilter = button.dataset.planFilter; save(); return render(); }
  if (button.dataset.supplyFilter) { state.ui.supplyFilter = button.dataset.supplyFilter; save(); return render(); }
  if (button.dataset.openSupply) { state.ui.modal = "supply:"+button.dataset.openSupply; return render(); }
  if (button.matches("[data-add-custom-supply]")) { state.ui.modal = "custom-supply:new"; return render(); }
  if (button.dataset.editCustomSupply) { state.ui.modal = `custom-supply:${button.dataset.editCustomSupply}`; return render(); }
  if (button.dataset.deleteCustomSupply) {
    if (!globalThis.confirm(translateText("Möchtest du diesen eigenen Eintrag wirklich löschen?"))) return;
    state.customSupplies = normalizeCustomSupplies(state.customSupplies).filter(item => item.id !== button.dataset.deleteCustomSupply);
    state.ui.modal = null; save(); toast("Eigener Eintrag wurde gelöscht."); return render();
  }
  if (button.dataset.mapFilter) { state.ui.mapFilter = button.dataset.mapFilter; save(); return render(); }
  if (button.dataset.mapRoute) return requestPlaceRoute(button.dataset.mapRoute);
  if (button.matches("[data-map-route-close]")) { mapRouteState = { status: "idle", placeId: null, route: null, error: null }; return renderMap(); }
  if (button.matches("[data-map-refresh]")) return requestNearbyPlaces(true);
  if (button.dataset.article) { state.ui.modal = "article:"+button.dataset.article; return render(); }
  if (button.matches("[data-save-offline]")) { state.settings.offlinePlacesSaved = true; storePlacesCache(); save(); toast("Die aktuelle Ortsliste ist offline gespeichert. Kartenkacheln benötigen weiterhin Internet."); return render(); }
  if (button.matches("[data-notifications]")) {
    if (!("Notification" in window)) return toast("Dieser Browser unterstützt keine Web-Mitteilungen.");
    const permission = await Notification.requestPermission();
    state.settings.notifications = permission === "granted"; save(); toast(permission === "granted" ? "Browser-Mitteilungen erlaubt." : "Keine Berechtigung erteilt."); return render();
  }
});

app.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.target;
  if (form.dataset.authForm) {
    if (accountBusy) return;
    const formData = new FormData(form);
    accountBusy = true; render();
    try {
      const result = await accountRequest(form.dataset.authForm === "register" ? "sign_up" : "sign_in", { email: formData.get("email"), password: formData.get("password"), displayName: formData.get("displayName") });
      if (result.confirmationRequired) { state.ui.modal = "login"; toast("Bitte bestätige zuerst die E-Mail und melde dich danach an."); return render(); }
      persistSession(result.session);
      await loadAccount();
      state.ui.modal = state.profile.onboardingCompleted ? null : "onboarding";
      location.hash = "#/home"; render();
    } catch (error) { toast(error instanceof Error ? error.message : "Anmeldung nicht möglich."); }
    finally { accountBusy = false; render(); }
    return;
  }
  if (form.matches("[data-onboarding-form]")) {
    const formData = new FormData(form);
    const adultCount = clamp(Number(formData.get("adultCount")) || 1, 1, 8);
    const adults = Array.from({ length: adultCount }, (_, index) => ({ gender: String(formData.get(`adultGender${index}`) || "unspecified") }));
    const petTypes = ["dog", "cat", "bird", "small_animal", "fish", "reptile", "other"];
    const pets = petTypes.map(type => ({ type, count: clamp(Number(formData.get(`pet_${type}`)) || 0, 0, 20), label: "" })).filter(pet => pet.count > 0);
    const children = clamp(Number(formData.get("children")) || 0, 0, 12);
    state.profile.name = String(formData.get("displayName") || "").trim();
    state.profile.initials = initials(state.profile.name);
    state.profile.onboardingCompleted = true;
    state.profile.selectedScene = chooseScene(adults, children);
    state.household = {
      adults, children, pets, postalCode: String(formData.get("postalCode") || "").trim(), city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(), district: String(formData.get("district") || "").trim(),
      location: `${String(formData.get("postalCode") || "").trim()} ${String(formData.get("city") || "").trim()}`.trim(),
    };
    state.ui.modal = null; save();
    try { await syncAccount(); toast("Haushalt gespeichert. Empfehlungen und Motiv wurden angepasst."); }
    catch { toast("Lokal gespeichert. Die Kontosynchronisierung wird bei Verbindung nachgeholt."); }
    return render();
  }
  if (form.dataset.supplyForm) {
    const group = supplyGroups.find(item => item.id === form.dataset.supplyForm);
    const formData = new FormData(form);
    const value = group.inputMode === "packages"
      ? Number(formData.get("containerCount")) * Number(formData.get("containerSize"))
      : Number(formData.get("value"));
    if (!Number.isFinite(value) || value < 0) return;
    state.supplies[form.dataset.supplyForm] = value;
    if (group.inputMode === "packages") state.supplyDetails[group.id] = { containerCount: Number(formData.get("containerCount")), containerSize: Number(formData.get("containerSize")) };
    state.ui.modal = null; save(); toast("Tatsächlicher Bestand gespeichert."); return render();
  }
  if (form.dataset.customSupplyForm) {
    const formData = new FormData(form);
    const label = String(formData.get("label") || "").trim().slice(0, 80);
    const categoryValue = String(formData.get("category") || "");
    const category = customSupplyCategories.includes(categoryValue) ? categoryValue : "Sonstiges";
    const quantity = Number(formData.get("quantity"));
    const unit = String(formData.get("unit") || "").trim().slice(0, 30);
    const note = String(formData.get("note") || "").trim().slice(0, 160);
    if (!label || !unit || !Number.isFinite(quantity) || quantity < 0 || quantity > 999999) return toast("Bitte Bezeichnung, Menge und Einheit vollständig angeben.");
    const items = normalizeCustomSupplies(state.customSupplies);
    const existingIndex = items.findIndex(item => item.id === form.dataset.customSupplyForm);
    const now = new Date().toISOString();
    const entry = { id: existingIndex >= 0 ? items[existingIndex].id : createCustomSupplyId(), label, category, quantity, unit, note, createdAt: existingIndex >= 0 ? items[existingIndex].createdAt : now, updatedAt: now };
    if (existingIndex >= 0) items[existingIndex] = entry; else items.push(entry);
    state.customSupplies = items;
    state.ui.supplyFilter = category;
    state.ui.modal = null; save(); toast("Eigener Vorrat wurde gespeichert."); return render();
  }
  if (form.matches("[data-knowledge-search]")) { state.ui.knowledgeSearch = new FormData(form).get("query").trim(); save(); render(); }
  if (form.matches("[data-pack-search]")) { state.ui.packSearch = String(new FormData(form).get("query") || "").trim(); save(); render(); }
});

app.addEventListener("input", event => {
  if (event.target.matches('input[name="adultCount"]')) {
    const count = clamp(Number(event.target.value) || 1, 1, 8);
    event.target.closest("form")?.querySelectorAll("[data-adult-index]").forEach((label, index) => {
      label.hidden = index >= count;
      const select = label.querySelector("select");
      if (select) select.required = index < count;
    });
  }
  const form = event.target.closest('form[data-supply-form="water"]');
  if (!form) return;
  const count = Number(form.elements.containerCount?.value);
  const size = Number(form.elements.containerSize?.value);
  const output = form.querySelector("[data-supply-total]");
  if (output) output.textContent = translateText(Number.isFinite(count) && Number.isFinite(size) ? `Gesamt: ${fmt(count * size)} Liter` : "Gesamtmenge wird beim Speichern berechnet");
});

app.addEventListener("change", event => {
  if (event.target.matches('select[name="containerSize"]')) event.target.dispatchEvent(new Event("input", { bubbles: true }));
});

window.addEventListener("hashchange", render);
window.addEventListener("offline", () => { liveState.status = "offline"; placesState.status = placesState.places.length ? "offline" : "error"; if (state.authenticated && ["home","map"].includes(hashRoute())) render(); });
window.addEventListener("online", () => { if (state.authenticated) { requestLiveLage(true); if (hashRoute() === "map") requestNearbyPlaces(true); syncAccount().catch(() => {}); } });
liveClockTimer = setInterval(updateLiveClock, 1000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
async function initialize() {
  const authRedirect = consumeAuthRedirect();
  if (session) {
    try { await loadAccount(); if (!state.profile.onboardingCompleted) state.ui.modal = "onboarding"; }
    catch { persistSession(null); state.authenticated = false; }
  }
  if (authRedirect.failed) state.ui.modal = "login";
  else if (authRedirect.confirmed && !state.authenticated) state.ui.modal = "login";
  render();
  if (authRedirect.failed) toast("Der Bestätigungslink ist ungültig oder abgelaufen.");
  else if (authRedirect.confirmed) toast(state.authenticated ? "E-Mail bestätigt. Willkommen bei RedScore." : "E-Mail bestätigt. Du kannst dich jetzt anmelden.");
}
initialize();

if (navigator.modelContext?.registerTool) {
  navigator.modelContext.registerTool({ name: "get_redscore_status", description: "Returns the signed-in household's entered RedScore state without inventing data.", inputSchema: { type: "object", properties: {} }, execute: async () => ({ score: score(), supplies: state.supplies, completedTasks: Object.keys(state.taskStatus).filter(id => state.taskStatus[id]), household: state.household }) });
  navigator.modelContext.registerTool({ name: "open_redscore_assessment", description: "Opens the transparent RedScore assessment.", inputSchema: { type: "object", properties: {} }, execute: async () => { state.ui.modal = "assessment"; render(); return { opened: true }; } });
}
