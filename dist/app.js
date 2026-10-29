import { assessmentQuestions, defaultState, knowledgeArticles, navItems, sources, supplyGroups, tasks } from "./data.js?v=7";
import { applyLanguage, getLanguage, setLanguage, translateText } from "./i18n.js?v=25";
import { offerCatalog, offerCategories, offersCheckedAt, selectOffers, offerMatchesSearch, offerPreparation, offerNeedHints } from "./offers.js?v=2";
import { newSupplyTwinPlan, supplyTwinModel, supplyTwinMarkup, updateSupplyTwin } from "./supply-twin.js?v=2";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const STORAGE_KEY = "redscore-state-v1";
const SESSION_KEY = "redscore-session-v1";
const CONTACT_EMAIL = "administration@redscore.de";
const clone = value => JSON.parse(JSON.stringify(value));
const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const icon = (name, className = "icon3d") => `<img class="${className}" src="assets/icons-3d/${name}.png" alt="" />`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const fmt = n => new Intl.NumberFormat(getLanguage() === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 3 }).format(n);
const customSupplyCategories = ["Versorgung", "Gesundheit", "Haushalt", "Sonstiges"];
const requestedLanguage = new URLSearchParams(location.search).get("lang");
if (["de", "en"].includes(requestedLanguage)) setLanguage(requestedLanguage);

// Accept decimal comma or point, never empty input, grouping or exponent notation.
function parseQuantity(raw, max, integer = false) {
  const text = String(raw ?? "").trim();
  if (!/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return NaN;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value >= 0 && value <= max && (!integer || Number.isInteger(value)) ? value : NaN;
}

let formError = null;
function updateFormFeedback(form) {
  if (!form) return;
  form.querySelectorAll("[aria-invalid]").forEach(field => { field.removeAttribute("aria-invalid"); field.removeAttribute("aria-errormessage"); });
  const feedback = form.querySelector("[data-form-error]");
  if (!feedback) return;
  const error = formError?.modal === state.ui.modal ? formError : null;
  feedback.textContent = error ? translateText(error.message) : "";
  feedback.hidden = !error;
  if (error?.field) {
    const field = form.elements.namedItem(error.field);
    field?.setAttribute("aria-invalid", "true");
    field?.setAttribute("aria-errormessage", feedback.id);
  }
}
function reportFormError(form, field, message) {
  if (!form) return toast(message);
  formError = { modal: state.ui.modal, field, message };
  updateFormFeedback(form);
  (field ? form.elements.namedItem(field) : form.querySelector("[data-form-error]"))?.focus({ preventScroll: false });
}
function updateAdultIdentities(form) {
  const count = clamp(Math.floor(Number(form.elements.adultCount.value)) || 1, 1, 8);
  form.querySelectorAll("[data-adult-index]").forEach((label, index) => {
    label.hidden = index >= count;
    const select = label.querySelector("select");
    if (select) { select.required = index < count; select.disabled = index >= count; }
  });
}

function normalizeChildDetails(count, details) {
  const length = clamp(Math.floor(Number(count)) || 0, 0, 12);
  return Array.from({ length }, (_, index) => ({
    gender: ["girl", "boy", "unspecified"].includes(details?.[index]?.gender) ? details[index].gender : "unspecified",
  }));
}

function updateChildIdentities(form) {
  const count = clamp(Math.floor(Number(form.elements.children.value)) || 0, 0, 12);
  const group = form.querySelector("[data-child-identities]");
  if (group) group.hidden = count === 0;
  form.querySelectorAll("[data-child-index]").forEach((label, index) => {
    label.hidden = index >= count;
    const select = label.querySelector("select");
    if (select) { select.disabled = index >= count; select.required = index < count; }
  });
}

function childIdentityFields() {
  const count = clamp(Math.floor(Number(state.household.children)) || 0, 0, 12);
  const details = normalizeChildDetails(count, state.household.childDetails);
  return `<fieldset class="child-identities" data-child-identities ${count ? "" : "hidden"}><legend>Angaben zu den Kindern</legend><p>Wähle für jedes Kind weiblich oder männlich. Die Angabe dient nur der Motivauswahl. Keine Namen oder Geburtsdaten erforderlich.</p>${Array.from({ length: 12 }, (_, index) => `<label data-child-index="${index}" ${index < count ? "" : "hidden"}><span>Kind ${index + 1} – Geschlecht</span><select name="childGender${index}" ${index < count ? "required" : "disabled"}><option value="" disabled ${!["girl", "boy"].includes(details[index]?.gender) ? "selected" : ""}>Bitte auswählen</option>${[["girl", "Weiblich"], ["boy", "Männlich"]].map(([value, label]) => `<option value="${value}" ${details[index]?.gender === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>`).join("")}</fieldset>`;
}

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
      household: { ...defaultState.household, ...saved.household, childDetails: normalizeChildDetails(saved.household?.children, saved.household?.childDetails) },
      assessment: { ...defaultState.assessment, ...saved.assessment },
      supplies: { ...defaultState.supplies, ...saved.supplies },
      supplyDetails: { ...defaultState.supplyDetails, ...saved.supplyDetails },
      customSupplies: normalizeCustomSupplies(saved.customSupplies),
      sync: { ...defaultState.sync, ...saved.sync },
      settings: { ...defaultState.settings, ...saved.settings },
      packlist: { ...defaultState.packlist, ...saved.packlist },
      ui: { ...defaultState.ui, ...saved.ui, modal: null },
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
let liveRequestKey = null;
let liveAttempt = { key: null, at: 0 };
let liveRefreshTimer = null;
let liveClockTimer = null;
const placesCache = (() => {
  try { return JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || "null"); }
  catch { return null; }
})();
let placesState = {
  status: navigator.onLine ? (placesCache?.listStatus === "unavailable" ? "partial" : placesCache?.listStatus === "stale" ? "stale" : "idle") : "offline",
  key: placesCache?.key || "",
  center: placesCache?.center || null,
  places: Array.isArray(placesCache?.places) ? placesCache.places : [],
  fetchedAt: placesCache?.fetchedAt || null,
  listStatus: placesCache?.listStatus || "ready",
  error: null,
};
let placesRequest = null;
let placesAttempt = { key: "", at: 0 };
let mapRouteState = { status: "idle", placeId: null, route: null, error: null };
let session = (() => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } })();
let syncTimer = null;
let syncRequest = null;
let syncStatus = "saved";
let localSaveFailed = false;
// Public sandbox only: never persisted or copied into a household's assessment.
const scoreLabSelection = new Set();
let scoreLabEffect = "Wähle einen Schritt. Sieh, was sich verändert.";
const scoreLabSteps = [
  { id: "water", icon: "water", label: "Wasser einplanen", detail: "Trinkwasser für drei Tage", answers: ["water"], supplies: { water: 0.3 }, effect: "Wasser ist eingeplant. Ein erster Baustein für deine Versorgung.", why: "Wasser ist im Ernstfall unverzichtbar: Leitungen können ausfallen oder verunreinigt sein. Ein ausreichender Vorrat hält deinen Haushalt handlungsfähig, bis die Versorgung wieder funktioniert." },
  { id: "food", icon: "food", label: "Vorrat aufbauen", detail: "Haltbare Lebensmittel für drei Tage", answers: ["food"], supplies: { food: 0.3 }, effect: "Ein Vorrat für drei Tage schafft einen ersten Handlungsspielraum.", why: "Haltbare Lebensmittel geben dir Handlungsspielraum, wenn Einkauf, Kühlung oder Zubereitung vorübergehend nicht möglich sind." },
  { id: "energy", icon: "light-bulb", label: "Licht & Energie sichern", detail: "Taschenlampe, Batterien und geladene Powerbank", answers: ["light", "power"], supplies: { power: 1 }, effect: "Licht und eine geladene Powerbank helfen, wenn der Strom ausfällt.", why: "Licht, Batterien und eine geladene Powerbank helfen dir, sicher zu bleiben, Informationen zu empfangen und erreichbar zu bleiben, wenn der Strom ausfällt." },
  { id: "information", icon: "radio", label: "Verbunden bleiben", detail: "Radio, Warnweg, Papierkontakte und Treffpunkt", answers: ["radio", "warnings", "contacts", "meeting"], supplies: {}, effect: "Information und ein Kontaktplan helfen auch ohne Mobilfunk.", why: "Radio, Warnwege und ein Kontaktplan liefern verlässliche Informationen und helfen, Angehörige auch bei Ausfällen zu erreichen." },
  { id: "bag", icon: "backpack", label: "Notgepäck vorbereiten", detail: "Rucksack, Dokumente, Erste Hilfe und Medikamente für drei Tage", answers: ["backpack", "documents", "medicine"], supplies: { medicine: 0.3 }, effect: "Griffbereites Notgepäck erleichtert das geordnete Verlassen deines Zuhauses.", why: "Ein vorbereiteter Rucksack bündelt wichtige Dokumente, Medikamente und Erste Hilfe, damit du im Notfall schnell und geordnet handeln kannst." },
];
let renderedModal = null;
let renderedModalLanguage = null;
let modalReturnFocus = null;
let accountBusy = false;
let authEmailDraft = "";
let resendCooldownUntil = 0;
let confirmationRequested = false;
let passwordResetRequested = false;
let passwordResetCompleted = false;
let recoveryStatus = "idle";
let recoveryContext = readRecoveryContext();
const RECOVERY_ERROR = "Der Rücksetz-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.";

function readRecoveryContext() {
  try {
    const value = JSON.parse(sessionStorage.getItem("redscore-recovery-v1") || "null");
    if (value && /^[A-Za-z0-9._~-]{1,8192}$/.test(value.accessToken) && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now()) return { accessToken: value.accessToken, expiresAt: value.expiresAt };
    sessionStorage.removeItem("redscore-recovery-v1");
  } catch { /* Recovery can still continue in memory when browser storage is blocked. */ }
  return null;
}
function clearRecoveryContext() {
  recoveryContext = null;
  recoveryStatus = "idle";
  try { sessionStorage.removeItem("redscore-recovery-v1"); } catch { /* no persistent context */ }
}
async function validateRecoveryContext() {
  if (!recoveryContext || recoveryContext.expiresAt <= Date.now()) { clearRecoveryContext(); recoveryStatus = "invalid"; return; }
  if (!navigator.onLine) { recoveryStatus = "unavailable"; return; }
  recoveryStatus = "checking";
  const activeContext = recoveryContext;
  try {
    const result = await accountRequest("check_password_reset", {}, activeContext.accessToken);
    if (recoveryContext !== activeContext) return;
    authEmailDraft = result.user?.email || "";
    recoveryStatus = "ready";
  } catch (error) {
    if (recoveryContext !== activeContext) return;
    if ([400,401,403].includes(error.status)) { clearRecoveryContext(); recoveryStatus = "invalid"; }
    else recoveryStatus = "unavailable";
  }
}

function resendSeconds() { return Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000)); }
function updateResendClock() {
  const button = app.querySelector("[data-resend-submit]") || app.querySelector("[data-recovery-submit]");
  if (!button) return;
  const seconds = resendSeconds();
  button.disabled = accountBusy || seconds > 0;
  button.textContent = translateText(accountBusy ? "Bitte warten …" : seconds ? `Erneut anfordern in ${seconds} Sek.` : state.ui.modal === "forgot" ? "Rücksetz-Link anfordern →" : "Bestätigungsmail anfordern →");
}
let languageMenuOpen = false;
let deferredInstallPrompt = null;
const INSTALL_DISMISSED_KEY = "redscore-install-prompt-dismissed-v1";
const isStandaloneApp = () => window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
let installDismissedInMemory = false;
const installPromptDismissed = () => {
  try { return installDismissedInMemory || localStorage.getItem(INSTALL_DISMISSED_KEY) === "1"; }
  catch { return installDismissedInMemory; }
};
function dismissInstallPrompt() {
  installDismissedInMemory = true;
  try { localStorage.setItem(INSTALL_DISMISSED_KEY, "1"); } catch { /* Dismissal still works for this visit. */ }
}
function maybeShowInstallPrompt() {
  if (!state.authenticated && hashRoute() === "home" && deferredInstallPrompt && !isStandaloneApp() && !installPromptDismissed() && !state.ui.modal) {
    state.ui.modal = "install";
    render();
  }
}
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  maybeShowInstallPrompt();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  dismissInstallPrompt();
  if (state.ui.modal === "install") { state.ui.modal = null; render(); }
});
const householdScenes = {
  "solo-woman": "assets/households/solo-woman.png",
  "solo-man": "assets/households/solo-man.png",
  "couple-woman-man": "assets/households/couple-woman-man.png",
  "couple-two-women": "assets/households/couple-two-women.png",
  "couple-two-men": "assets/households/couple-two-men.png",
  "family-woman-man-boy": "assets/households/family-woman-man.png",
  "family-woman-man-girl": "assets/households/family-woman-man-girl.png",
  "family-two-women-boy": "assets/households/family-two-women-boy.png",
  "family-two-women-girl": "assets/households/family-two-women.png",
  "family-two-men-boy": "assets/households/family-two-men.png",
  "family-two-men-girl": "assets/households/family-two-men-girl.png",
  "single-woman-boy": "assets/households/single-parent.png",
  "single-woman-girl": "assets/households/single-woman-girl.png",
  "single-man-boy": "assets/households/single-man-boy.png",
  "single-man-girl": "assets/households/single-man-girl.png",
  "family-woman-man-boy-girl": "assets/households/family-neutral.png",
  "neutral-household": "assets/dashboard-storm.png",
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

// Derive from the current household, never reuse a legacy image that guessed a child's gender.
function selectedScene() { return householdScenes[chooseScene(state.household.adults || [], state.household.children, state.household.childDetails)] || householdScenes["neutral-household"]; }
function sceneStyle(_key, property = "--scene-image") { return `style="${property}:url('${selectedScene()}')"`; }
function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "RS"; }
function householdPeople() { return (state.household.adults?.length || 0) + Number(state.household.children || 0); }
function petCount() { return (state.household.pets || []).reduce((sum, pet) => sum + Number(pet.count || 0), 0); }
function petLabel(type) { return translateText(({ dog: "Hund", cat: "Katze", bird: "Vogel", small_animal: "Kleintier", fish: "Fische", reptile: "Reptil", other: "Tier" })[type] || "Tier"); }
function householdSummary() {
  const adults = state.household.adults?.length || 0, children = Number(state.household.children || 0), pets = petCount();
  return [`${adults} ${adults === 1 ? "erwachsene Person" : "Erwachsene"}`, children ? `${children} ${children === 1 ? "Kind" : "Kinder"}` : null, pets ? `${pets} ${pets === 1 ? "Haustier" : "Haustiere"}` : null].filter(Boolean).join(" · ");
}
function chooseScene(adults, children, childDetails) {
  const genders = adults.map(item => item.gender).sort();
  const details = normalizeChildDetails(children, childDetails);
  if (adults.some(item => !["woman", "man"].includes(item.gender))) return "neutral-household";
  if (details.length) {
    if (details.some(item => !["girl", "boy"].includes(item.gender))) return "neutral-household";
    const childGenders = details.map(item => item.gender).sort().join("|");
    if (details.length === 1) {
      const childGender = details[0].gender;
      if (adults.length === 1) return `single-${genders[0]}-${childGender}`;
      if (adults.length === 2) {
        if (genders.join("|") === "man|woman") return `family-woman-man-${childGender}`;
        if (genders.every(value => value === "woman")) return `family-two-women-${childGender}`;
        if (genders.every(value => value === "man")) return `family-two-men-${childGender}`;
      }
    }
    if (details.length === 2 && childGenders === "boy|girl" && genders.join("|") === "man|woman") return "family-woman-man-boy-girl";
    return "neutral-household";
  }
  if (adults.length > 2) return "neutral-household";
  if (adults.length === 1) return adults[0].gender === "woman" ? "solo-woman" : adults[0].gender === "man" ? "solo-man" : "neutral-household";
  if (adults.length === 2) {
    if (genders.join("|") === "man|woman") return "couple-woman-man";
    if (genders.every(value => value === "woman")) return "couple-two-women";
    if (genders.every(value => value === "man")) return "couple-two-men";
  }
  return "neutral-household";
}
const save = () => {
  if (state.authenticated) state.sync = { ...state.sync, pending: true, revision: (Number(state.sync.revision) || 0) + 1 };
  writeStateLocally();
  updateSyncStatus(navigator.onLine ? "pending" : "offline");
  if (state.authenticated && session?.access_token) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncAccount().catch(() => {}), 900);
  }
};

function writeStateLocally() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localSaveFailed = false;
    return true;
  } catch {
    localSaveFailed = true;
    return false;
  }
}

async function retryStorageAndSync() {
  if (localSaveFailed) writeStateLocally();
  updateSyncStatus();
  return syncAccount();
}

async function accountRequest(action, payload = {}, accessToken = session?.access_token) {
  const response = await fetch("/api/account", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || "Kontodienst nicht erreichbar."); error.status = response.status; throw error; }
  return result;
}

function persistSession(value) {
  session = value;
  try { if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value)); else localStorage.removeItem(SESSION_KEY); }
  catch { toast("Diese Änderung konnte lokal nicht gespeichert werden."); }
}

function consumeAuthRedirect() {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  const confirmed = query.get("auth") === "confirmed";
  const failed = Boolean(query.get("error") || fragment.get("error"));
  const recovery = fragment.get("type") === "recovery" || query.get("auth") === "recovery";
  if (recovery) {
    clearRecoveryContext();
    if (!failed && /^[A-Za-z0-9._~-]{1,8192}$/.test(accessToken || "")) {
      const expiresAt = Number(fragment.get("expires_at")) * 1000;
      const expiresIn = Math.min(3600, Math.max(0, Number(fragment.get("expires_in")) || 3600));
      recoveryContext = { accessToken, expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : Date.now() + expiresIn * 1000 };
      try { sessionStorage.setItem("redscore-recovery-v1", JSON.stringify(recoveryContext)); } catch { /* memory-only fallback */ }
    }
    history.replaceState(null, "", "/#/home");
    return { recovery: true, confirmed: false, failed: failed || !recoveryContext };
  }
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
  try { const result = await accountRequest("refresh", { refreshToken: session.refresh_token }, ""); persistSession({ ...result.session, user: result.session.user || session.user }); return true; }
  catch (error) { if ([400, 401, 403].includes(error.status)) persistSession(null); throw error; }
}

async function loadAccount() {
  if (!(await refreshSessionIfNeeded())) return false;
  const result = await accountRequest("load");
  const pending = state.sync?.pending && state.profile.id === result.user.id ? clone(state) : null;
  persistSession({ ...session, user: result.user });
  const profile = result.profile;
  state.authenticated = true;
  state.profile = {
    id: result.user.id, email: result.user.email || "", name: profile?.display_name || result.user?.user_metadata?.display_name || session.user?.user_metadata?.display_name || "",
    initials: initials(profile?.display_name || result.user?.user_metadata?.display_name || session.user?.user_metadata?.display_name), onboardingCompleted: Boolean(profile?.onboarding_completed),
    selectedScene: profile?.selected_scene || "neutral-household",
  };
  state.household = profile ? {
    adults: Array.isArray(profile.adults) ? profile.adults : [], children: Number(profile.children_count || 0), childDetails: normalizeChildDetails(profile.children_count, profile.children_details), pets: Array.isArray(profile.pets) ? profile.pets : [],
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
  state.sync = clone(defaultState.sync);
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
  if (pending) {
    for (const key of ["profile", "household", "assessment", "taskStatus", "supplies", "supplyDetails", "customSupplies", "settings", "packlist", "sync"]) state[key] = pending[key];
  }
  writeStateLocally();
  updateSyncStatus(state.sync.pending ? "pending" : "saved");
  if (state.sync.pending) { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncAccount().catch(() => {}), 900); }
  return true;
}

async function syncAccount() {
  if (syncRequest) return syncRequest;
  if (!state.authenticated || !state.sync.pending) return;
  if (!navigator.onLine) { updateSyncStatus("offline"); return; }
  if (!session?.access_token) { updateSyncStatus("expired"); return; }
  clearTimeout(syncTimer);
  const owner = state.profile.id, revision = state.sync.revision;
  const payload = clone({
    profile: {
      display_name: state.profile.name, adults: state.household.adults, children_count: state.household.children, children_details: normalizeChildDetails(state.household.children, state.household.childDetails), pets: state.household.pets,
      postal_code: state.household.postalCode, city: state.household.city, state: state.household.state, district: state.household.district,
      onboarding_completed: state.profile.onboardingCompleted, selected_scene: state.profile.selectedScene,
    },
    appState: { assessment: state.assessment, task_status: state.taskStatus, supplies: state.supplies, supply_details: state.supplyDetails, custom_supplies: normalizeCustomSupplies(state.customSupplies), packlist: state.packlist, settings: state.settings },
  });
  updateSyncStatus("saving");
  syncRequest = (async () => {
    try {
      if (!(await refreshSessionIfNeeded())) throw new Error("Bitte erneut anmelden.");
      if (state.profile.id !== owner || session?.user?.id !== owner) return;
      await accountRequest("save", payload);
      if (state.profile.id !== owner) return;
      if (state.sync.revision === revision) {
        state.sync.pending = false;
        state.sync.lastSavedAt = new Date().toISOString();
        writeStateLocally();
      }
      updateSyncStatus(state.sync.pending ? "pending" : "saved");
    } catch (error) {
      if (state.profile.id === owner) updateSyncStatus(!session || [400,401,403].includes(error.status) ? "expired" : navigator.onLine ? "error" : "offline");
      throw error;
    } finally {
      syncRequest = null;
      if (state.authenticated && state.profile.id === owner && state.sync.pending && navigator.onLine && session?.access_token) {
        syncTimer = setTimeout(() => syncAccount().catch(() => {}), syncStatus === "pending" ? 900 : 30_000);
      }
    }
  })();
  return syncRequest;
}

function updateSyncStatus(status = syncStatus) {
  syncStatus = status;
  const labels = { saved: "Mit deinem Konto synchronisiert", pending: "Auf diesem Gerät gespeichert · Synchronisierung ausstehend", saving: "Kontodaten werden gespeichert …", offline: "Offline · Änderungen bleiben auf diesem Gerät", error: "Lokal gespeichert · Kontosynchronisierung fehlgeschlagen", expired: "Lokal gespeichert · bitte erneut anmelden" };
  let label = labels[status];
  if (localSaveFailed) label = !state.sync.pending
    ? "Im Konto gespeichert · Offline-Speicherung auf diesem Gerät nicht verfügbar"
    : status === "saving"
      ? "Kontodaten werden gespeichert … · Offline-Speicherung nicht verfügbar"
      : "Änderungen noch nicht dauerhaft gespeichert · Seite bitte geöffnet lassen";
  const region = document.querySelector("[data-sync-status]");
  if (!region) return;
  region.dataset.status = localSaveFailed ? "storage-error" : status;
  const text = region.querySelector("span");
  if (text) text.textContent = translateText(label);
  const button = region.querySelector("button");
  if (button) { button.hidden = !localSaveFailed && !["error", "expired"].includes(status); button.textContent = translateText(status === "expired" ? "Einloggen" : "Erneut versuchen"); }
}

function canResumeOffline() {
  return Boolean(session?.user?.id && session.user.id === state.profile.id && state.profile.onboardingCompleted);
}
function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = translateText(message);
  toastRegion.append(node);
  setTimeout(() => node.remove(), 3200);
}

async function shareRedScore() {
  const english = getLanguage() === "en";
  const share = {
    title: english ? "RedScore – Are you prepared?" : "RedScore – Bist du vorbereitet?",
    text: english ? "Prepare for emergencies for free with RedScore." : "Mit RedScore kostenlos auf Krisen und Notlagen vorbereiten.",
    url: "https://www.redscore.de/",
  };
  try {
    if (navigator.share) {
      await navigator.share(share);
      toast("Danke fürs Weiterempfehlen.");
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(share.url);
      toast("Link wurde kopiert.");
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") return;
  }
  toast("https://www.redscore.de/");
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
  return combineReadinessScore(preparedness, supplies);
}
function combineReadinessScore(preparedness, supplies) { return Math.round(clamp(preparedness, 0, 100) * 0.7 + clamp(supplies, 0, 100) * 0.3); }

function scoreLabResult(selection = scoreLabSelection) {
  const questions = assessmentQuestions.filter(([id]) => id !== "pet");
  const groups = supplyGroups.filter(group => group.id !== "pet");
  const answers = new Set(), progress = {};
  for (const step of scoreLabSteps) if (selection.has(step.id)) {
    step.answers.forEach(id => answers.add(id));
    Object.assign(progress, step.supplies);
  }
  const preparedness = questions.filter(([id]) => answers.has(id)).length / questions.length * 100;
  const supplies = Math.round(groups.reduce((sum, group) => sum + (progress[group.id] || 0), 0) / groups.length * 100);
  return { value: combineReadinessScore(preparedness, supplies), count: scoreLabSteps.filter(step => selection.has(step.id)).length };
}

function scoreLabGain(stepId) {
  const next = new Set(scoreLabSelection);
  next.add(stepId);
  return scoreLabResult(next).value - scoreLabResult().value;
}

function updateScoreLab(stepId, reset = false) {
  if (reset) scoreLabSelection.clear();
  else if (scoreLabSteps.some(step => step.id === stepId)) {
    if (scoreLabSelection.has(stepId)) scoreLabSelection.delete(stepId);
    else scoreLabSelection.add(stepId);
  } else return;
  const step = scoreLabSteps.find(item => item.id === stepId);
  scoreLabEffect = reset ? "Wähle einen Schritt. Sieh, was sich verändert." : scoreLabSelection.has(stepId) ? step.effect : "Schritt zurückgenommen. Du kannst jederzeit neu kombinieren.";
  const root = app.querySelector("[data-score-lab]");
  if (!root) return;
  const result = scoreLabResult();
  root.style.setProperty("--lab-score", result.value);
  root.querySelector("[data-lab-value]").textContent = result.value;
  root.querySelector("[data-lab-ring]").style.strokeDashoffset = 100 - result.value;
  root.querySelectorAll("[data-score-lab-step]").forEach(button => {
    const selected = scoreLabSelection.has(button.dataset.scoreLabStep);
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector("[data-lab-gain]").textContent = selected ? "✓" : `+${scoreLabGain(button.dataset.scoreLabStep)}`;
  });
  root.querySelectorAll("[data-lab-node]").forEach(node => node.classList.toggle("ready", scoreLabSelection.has(node.dataset.labNode)));
  root.querySelector("[data-score-lab-reset]").disabled = !result.count;
  root.querySelector("[data-lab-effect]").textContent = translateText(scoreLabEffect);
  root.querySelector("[data-lab-announcement]").textContent = getLanguage() === "en"
    ? `Simulation: ${result.value} of 100. ${result.count} of 5 steps selected.`
    : `Simulation: ${result.value} von 100. ${result.count} von 5 Schritten ausgewählt.`;
}

function scoreLab() {
  const result = scoreLabResult();
  return `<section class="score-lab" id="score-lab" data-score-lab style="--lab-score:${result.value}" aria-labelledby="score-lab-title">
    <div class="score-lab-intro"><span class="lab-eyebrow">INTERAKTIVES SCORE-LAB</span><h2 id="score-lab-title">Ein kleiner Schritt.<br><em>Ein sichtbarer Unterschied.</em></h2><p>Was wäre, wenn der Strom für 72 Stunden ausfällt? Wähle deine Vorsorgeschritte und erlebe, wie Vorbereitung deinen Beispiel-Score verändert.</p><span class="lab-scenario">72-Stunden-Szenario · Stromausfall</span><button data-lab-model class="lab-model-link" aria-controls="score-lab-model">So wird die Vorschau berechnet ↓</button></div>
    <div class="score-lab-visual"><div class="lab-radar">
      <div class="lab-grid" aria-hidden="true"></div><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="lab-ring-track" cx="120" cy="120" r="94"/><circle class="lab-ring-value" data-lab-ring cx="120" cy="120" r="94" pathLength="100" stroke-dasharray="100" style="stroke-dashoffset:${100-result.value}"/></svg>
      <div class="lab-number"><small>SIMULATION</small><strong data-lab-value>${result.value}</strong><span>von 100</span></div>
      ${scoreLabSteps.map((step,i) => `<span class="lab-node ${scoreLabSelection.has(step.id) ? "ready" : ""}" data-lab-node="${step.id}" style="--node-angle:${i*72}deg" aria-hidden="true">${icon(step.icon)}</span>`).join("")}
    </div><p data-lab-effect>${esc(scoreLabEffect)}</p><small class="lab-disclaimer">Beispiel-Simulation, nicht dein persönlicher RedScore.</small></div>
    <div class="score-lab-actions"><div class="lab-actions-head"><span><b>Deine Schritte im Szenario</b><small class="lab-gesture-hint">Klicke einen Schritt an · Warum ist das wichtig?</small></span><button data-score-lab-reset ${result.count ? "" : "disabled"}>Zurücksetzen</button></div>
      ${scoreLabSteps.map(step => `<button class="lab-step" data-score-lab-step="${step.id}" aria-label="${step.label} – Klicke für die Vorsorge-Erklärung" aria-pressed="${scoreLabSelection.has(step.id)}">${icon(step.icon)}<span><b>${step.label}</b><small>${step.detail}</small></span><strong data-lab-gain>${scoreLabSelection.has(step.id) ? "✓" : `+${scoreLabGain(step.id)}`}</strong></button>`).join("")}
      <button class="green lab-cta" data-open-auth="register">Jetzt meinen echten Score kostenlos prüfen →</button>
    </div>
    <details class="lab-model" id="score-lab-model"><summary>Beispielannahmen & Berechnung</summary><p>Die Vorschau startet bei null: Beispielhaushalt ohne Haustiere, alle Check-Antworten zunächst „Nein“, keine erfassten Vorräte. Jeder gewählte Schritt setzt die genannten Voraussetzungen im Beispiel auf „Ja“. Wasser, Lebensmittel und Medikamente entsprechen drei von zehn Vorratstagen; Licht und Energie gelten als einsatzbereit. Hygiene bleibt offen.</p><p>Wie im persönlichen RedScore: 70 % vollständig beantworteter Vorsorge-Check + 30 % Vorratsfortschritt. Die fünf Schritte decken nicht die gesamte Vorsorge ab. Der Score ist keine Gefahrenprognose oder Sicherheitsgarantie. Deinen tatsächlichen Stand berechnen wir erst nach deinem vollständigen Check.</p></details>
    <span class="lab-announcement" data-lab-announcement role="status" aria-live="polite" aria-atomic="true"></span>
  </section>`;
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
    const direct = details.mode === "liters" || (value !== null && details.containerCount === undefined);
    return `<fieldset class="quantity-fields"><legend>Trinkwasser erfassen</legend><label><span>Erfassungsart</span><select name="quantityMode"><option value="packages" ${direct ? "" : "selected"}>Gebinde zählen</option><option value="liters" ${direct ? "selected" : ""}>Liter direkt eingeben</option></select></label><div data-water-packages ${direct ? "hidden" : ""}><label><span>Anzahl Gebinde</span><input type="number" name="containerCount" min="0" max="200" step="1" inputmode="numeric" value="${containerCount}" placeholder="z. B. 12" ${direct ? "disabled" : "required"}></label><label><span>Liter je Gebinde</span><select name="containerSize" ${direct ? "disabled" : ""}>${group.packageSizes.map(size => `<option value="${size}" ${size===containerSize?"selected":""}>${fmt(size)} Liter</option>`).join("")}</select></label></div><label data-water-liters ${direct ? "" : "hidden"}><span>Gesamtmenge in Litern</span><input type="text" name="liters" maxlength="20" inputmode="decimal" aria-describedby="quantity-input-hint" value="${value===null?"":value}" ${direct ? "required" : "disabled"}></label><small id="quantity-input-hint" class="quantity-input-hint">Komma oder Punkt als Dezimaltrennzeichen, keine Tausendertrennzeichen. Maximal 1000 Liter.</small><output data-supply-total>${value === null ? "Gesamtmenge wird beim Speichern berechnet" : `Bisher erfasst: ${fmt(value)} Liter`}</output></fieldset>`;
  }
  if (group.inputMode === "level") {
    return `<fieldset class="quantity-fields"><legend>Ausstattungsstand</legend><label><span>Status</span><select name="value" required><option value="" ${value===null?"selected":""} disabled>Bitte auswählen</option><option value="0" ${value===0?"selected":""}>Nicht vorhanden</option><option value="0.5" ${value===0.5?"selected":""}>Teilweise vorhanden</option><option value="1" ${value===1?"selected":""}>Vollständig und einsatzbereit</option></select></label></fieldset>`;
  }
  return `<fieldset class="quantity-fields"><legend>Reichweite in Tagen</legend><label><span>Für wie viele Tage reicht dein Bestand?</span><input type="number" name="value" min="0" max="${group.max}" step="1" inputmode="numeric" value="${value===null?"":value}" placeholder="z. B. 7" required></label><div class="quantity-suggestions" aria-label="Schnellauswahl">${group.suggestions.map(day => `<button type="button" data-supply-suggestion="${day}">${day} Tage</button>`).join("")}</div></fieldset>`;
}
function hashRoute() {
  let route;
  try { route = decodeURIComponent(location.hash.replace(/^#\/?/, "")); } catch { return "home"; }
  return route || "home";
}
function navigate(route) {
  if (!state.authenticated && !["public", "angebote"].includes(route)) {
    state.ui.modal = "login";
    render();
    return;
  }
  location.hash = `#/${route}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const routeLabel = route => ({ home: "Start", plan: "Mein Plan", packliste: "Notfallrucksack", supplies: "Vorräte", map: "SafePlaces", warnschutz: "Warnschutz", knowledge: "Informationen", angebote: "Angebote", profile: "Profil" })[route] || "Start";
function languageControl() {
  const language = getLanguage();
  return `<div class="language-switcher"><button class="language-flag" data-language-toggle aria-label="${language === "de" ? "Sprache auswählen" : "Select language"}" aria-expanded="${languageMenuOpen}"><span class="flag-icon flag-${language}" aria-hidden="true"></span></button><div class="language-menu" ${languageMenuOpen ? "" : "hidden"}><button data-language="de" class="${language === "de" ? "active" : ""}"><span class="flag-icon flag-de" aria-hidden="true"></span> Deutsch</button><button data-language="en" class="${language === "en" ? "active" : ""}"><span class="flag-icon flag-en" aria-hidden="true"></span> English</button></div></div>`;
}
function brand(light = false) {
  return `<button class="wordmark ${light ? "light" : ""}" data-route="${state.authenticated ? "home" : "public"}" aria-label="RedScore Startseite"><img src="assets/redscore-logo.png?v=5" alt="" /><span><em>Red</em>Score</span><small>Weil der Ernstfall nicht fragt, ob du bereit bist.</small></button>`;
}
const publicGuideUrl = () => getLanguage() === "en" ? "/en/guides/index.html" : "/ratgeber/index.html";
function footer(dark = false) {
  return `<footer class="site-footer ${dark ? "dark" : ""}">
    ${brand(false)}
    <nav><button data-legal="about">Über RedScore</button><a href="${publicGuideUrl()}">Ratgeber</a><a href="${sources.bbkChecklist}" target="_blank" rel="noreferrer">BBK-Quellen</a><button data-legal="privacy">Datenschutz</button><button data-legal="imprint">Impressum</button><button data-cookie-settings>${getLanguage()==="en"?"Cookie settings":"Cookie-Einstellungen"}</button></nav>
    <a class="bbk-source-badge" href="${sources.bbkChecklist}" target="_blank" rel="noreferrer" aria-label="Zu den offiziellen Informationen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe"><img class="bbk-source-logo" src="assets/bbk-logo.svg?v=2" alt="Bundesamt für Bevölkerungsschutz und Katastrophenhilfe"><span><small class="bbk-note-wide">Deine Aufgaben beruhen auf den Empfehlungen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe. Es existiert keine behördliche Zusammenarbeit.</small><small class="bbk-note-mobile">Offizielle Informationsquelle · keine behördliche Partnerschaft</small></span></a>
  </footer>`;
}

function publicHeader(active = "home") {
  return `<header class="public-header">${brand(true)}<nav>
    <button data-scroll="top" class="${active === "home" ? "active" : ""}">Start</button><button data-scroll="how">So funktioniert’s</button><a href="${publicGuideUrl()}">Informationen</a><a href="#/angebote" class="${active === "angebote" ? "active" : ""}" ${active === "angebote" ? 'aria-current="page"' : ""}>Angebote</a>
  </nav><div class="public-actions"><a class="search-button" href="${publicGuideUrl()}" aria-label="Wissen durchsuchen">⌕</a><button class="outline" data-open-auth="login">Einloggen</button><button class="green" data-open-auth="register">Kostenlos registrieren</button>${languageControl()}</div></header>`;
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
        <button class="public-share" data-share-redscore aria-label="RedScore kostenlos weiterempfehlen">RedScore weiterempfehlen</button>
      </div>
      <aside class="public-score-card public-score-invite"><small>Vorbereitung wird sichtbar.</small><button class="score-invite-play" data-scroll="score-lab" aria-label="Interaktive Score-Simulation ausprobieren"><span aria-hidden="true">▶</span></button><strong>Was verändert deinen Score?</strong><p>Probiere es aus. Ohne Anmeldung.</p><button class="score-invite-link" data-scroll="score-lab">Score live erleben ↓</button></aside>
      <div class="script-note">Niemand kann es sich leisten,<br>unvorbereitet zu sein.</div>
    </section>
    ${scoreLab()}
    <section class="public-categories">${categories.map(item => categoryCard(...item)).join("")}</section>
    <section class="public-info" id="about">
      <article class="lighthouse-card"><div><small>DEIN REDSCORE</small><h2>Ein Check. Mehr Klarheit.</h2><p>RedScore ordnet persönliche Katastrophenvorbereitung übersichtlich nach offiziellen Empfehlungen. Es gibt keinen Beispielwert: Erst vollständig beantwortete Fragen erzeugen deinen eigenen Stand.</p><ul><li>✓ Individuelle Auswertung</li><li>✓ Konkrete Handlungsschritte</li><li>✓ Orientierung an offiziellen Quellen</li><li>✓ Für Bürgerinnen und Bürger in jeder Lebenslage</li><li>✓ Offline nutzbar und kontogebunden</li></ul><button class="green large" data-open-auth="register">Jetzt kostenlos starten →</button></div></article>
      <article class="why-card"><small>WARUM VORSORGEN?</small><h2>Krisen kommen<br>meist ungeplant.</h2><p>Ob Stromausfall, Unwetter oder eine andere Notlage: Vorbereitung schützt Handlungsspielraum und reduziert Risiken.</p><div class="benefits"><span>🛡️ <b>Mehr Sicherheit</b></span><span>🌱 <b>Weniger Abhängigkeit</b></span><span>🤝 <b>Ruhe und Klarheit</b></span><span>▥ <b>Schritt für Schritt</b></span></div></article>
    </section>
    <section class="how-strip" id="how"><h2>So einfach geht’s</h2><div><article><b>1</b><span><strong>Konto anlegen</strong><small>E-Mail bestätigen und sicher anmelden.</small></span></article><i>›</i><article><b>2</b><span><strong>Haushalt einrichten</strong><small>Personen, Kinder, Haustiere und Standort erfassen.</small></span></article><i>›</i><article><b>3</b><span><strong>Vorsorge starten</strong><small>Passende Mengen, Aufgaben und Lagehinweise erhalten.</small></span></article></div></section>
    <section class="public-guide-section"><h2>Kleine Schritte. Mehr Vorbereitung.</h2><p>Praktische Ratgeber – kostenlos und ohne Anmeldung.</p><div>${[["notvorrat", "emergency-supplies", "Notvorrat anlegen", "Wasser und Lebensmittel für deinen Haushalt planen."], ["notfallrucksack", "emergency-backpack", "Notfallrucksack packen", "Die wichtigsten Dinge vorbereiten und abhaken."], ["stromausfall", "power-outage", "Auf Stromausfall vorbereiten", "Licht, Information und Versorgung im Blick behalten."]].map(([de, en, title, copy]) => `<a href="${getLanguage() === "en" ? `/en/guides/${en}.html` : `/ratgeber/${de}.html`}"><h3>${title}</h3><p>${copy}</p><span>Ratgeber lesen →</span></a>`).join("")}</div></section>
    <section class="public-band"><article>👥<span><b>Für alle Lebenslagen</b><small>Inklusive Haushaltsmodelle ohne Annahmen.</small></span></article><article>🛡️<span><b>Offizielle Grundlagen</b><small>BBK und DWD als Quellen.</small></span></article><article>🔒<span><b>Datensparsam</b><small>Keine privaten Fotos und keine Gesichtsanalyse.</small></span></article><article>🍃<span><b>Mehr Resilienz</b><small>Praktisch statt alarmistisch.</small></span></article></section>
    ${footer()}
  </div>${modal()}`;
}

function appHeader(active) {
  return `<header class="app-header">${brand(true)}<nav aria-label="${getLanguage()==='en'?'Main navigation':'Hauptnavigation'}">${navItems.map(item => `<button data-route="${item.id}" aria-label="${esc(item.label)}" title="${esc(item.label)}" class="${active === item.id ? "active" : ""}" ${active === item.id ? 'aria-current="page"' : ""}><span>${item.label}</span></button>`).join("")}</nav><div class="user-tools">${languageControl()}<button class="search-button" data-route="knowledge" aria-label="Wissen durchsuchen"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button><button class="bell" data-route="warnschutz" aria-label="Warnschutz öffnen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><button class="avatar" data-route="profile" aria-label="Profil öffnen">${esc(state.profile.initials || initials(state.profile.name))}</button><button class="user-name" data-route="profile">${esc((state.profile.name || "Profil").split(" ")[0])}⌄</button></div></header>`;
}
function loggedShell(active, content, pageClass = "") {
  document.body.className = "logged-mode";
  return `<div class="logged-page ${pageClass}">${appHeader(active)}<div class="sync-status" data-sync-status role="status"><span></span><button data-sync-retry hidden>Erneut versuchen</button></div><main>${content}</main>${footer(true)}</div>${modal()}`;
}
function scoreRing(value, red = false) {
  if (value === null) return `<div class="score-ring empty"><div><small>DEIN STAND</small><strong>–</strong><span>nicht berechnet</span></div></div>`;
  return `<div class="score-ring ${red ? "danger" : ""}" style="--score:${value}"><div><small>DEIN STAND</small><strong>${value}</strong><span>von 100</span></div></div>`;
}

// This small editorial catalog ships with the offline shell. No location or
// household information is sent to a vendor, and no live availability is implied.
const offersView = { category: "all", mode: "all", location: null, error: "", query: "", sort: "recommended" };
const offerText = (de, en) => getLanguage() === "en" ? en : de;
function offersLocation() { return state.authenticated ? state.household : (offersView.location || {}); }
function savedLocationCard({ map = false, status = "" } = {}) {
  const { postalCode, city, district, state: region } = state.household;
  const complete = /^\d{5}$/.test(String(postalCode || "")) && Boolean(String(city || "").trim());
  const label = [postalCode, city].filter(Boolean).join(" ");
  const details = [...new Set([district, region].filter(value => value && value !== city))].join(" · ");
  const pin = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg>`;
  return `<section class="saved-location ${map ? "map-location-card" : "offers-profile-location"}" aria-label="${offerText("Gespeicherter Standort", "Saved location")}"><div class="saved-location-pin">${pin}</div><div class="saved-location-copy"><small>${offerText("DEIN GESPEICHERTER STANDORT", "YOUR SAVED LOCATION")}</small><h2>${esc(label || offerText("Standort noch nicht eingerichtet", "Location not set up yet"))}</h2>${details ? `<p>${esc(details)}</p>` : ""}<span>${map ? offerText("Kartenmittelpunkt anhand von PLZ und Ort · keine GPS-Ortung", "Map centre based on postcode and town · no GPS tracking") : offerText("Angebote werden automatisch deiner Profilregion zugeordnet.", "Offers are automatically matched to your profile location.")}</span>${!complete ? `<p class="location-incomplete">${offerText("Bitte vervollständige deinen Standort in den Einstellungen.", "Please complete your location in settings.")}</p>` : ""}</div><div class="saved-location-actions"><button class="outline" data-route="profile">${complete ? offerText("Standort verwalten", "Manage location") : offerText("Standort ergänzen", "Add location")}</button>${map ? `<button class="green" data-map-refresh ${!complete || !navigator.onLine ? "disabled" : ""}>${offerText("Orte aktualisieren", "Refresh places")}</button>` : ""}</div>${map ? `<div class="map-location-status"><span class="map-data-status" role="status">${esc(status)}</span><span>${offerText("Suchradius: 20 km", "Search radius: 20 km")}</span><button data-save-offline ${!complete ? "disabled" : ""}>${state.settings.offlinePlacesSaved ? offerText("Offline-Liste aktualisieren", "Update offline list") : offerText("Offline-Liste speichern", "Save offline list")}</button></div>` : ""}</section>`;
}
function offerCard(item) {
  const category = offerCategories.find(category => category.id === item.category);
  const label = item.mode === "local" ? offerText("Regionaler Anbieter", "Regional provider") : item.mode === "finder" ? offerText("Bundesweiter Finder", "Germany-wide finder") : offerText("Online · standortunabhängig", "Online · any location");
  const host=new URL(item.url).hostname.replace(/^www\./,"");
  const regionalReason=item.mode==="local" ? offerText("Zuordnung über deinen Ort oder Landkreis · keine Entfernungsangabe","Matched by your town or district · no distance estimate") : "";
  return `<article class="offer-card" data-offer-id="${esc(item.id)}"><div class="offer-card-top"><span>${label}</span><span class="offer-topic">${esc(getLanguage()==="en"?category.en:category.de)}</span></div><small>${esc(item.provider)}</small><h3>${esc(getLanguage() === "en" ? item.en : item.de)}</h3><p>${esc(getLanguage() === "en" ? item.descriptionEn : item.descriptionDe)}</p>${item.city ? `<div class="offer-place">${esc(item.address || item.city)}<small>${regionalReason}</small></div>` : ""}<details class="offer-preparation"><summary>${offerText("Vor dem Buchen oder Kaufen prüfen","Before booking or buying")}</summary><ul>${offerPreparation(item,getLanguage()).map(text=>`<li>${esc(text)}</li>`).join("")}</ul></details><a class="outline" href="${esc(safeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${item.mode === "finder" ? offerText("Beim Anbieter suchen", "Search with provider") : offerText("Anbieter ansehen", "View provider")} ↗<small>${esc(host)} · ${offerText("neuer Tab","new tab")}</small></a><small class="offer-check">${offerText("Quelle geprüft", "Source checked")}: <time datetime="${item.checkedAt}">${new Date(`${item.checkedAt}T12:00:00Z`).toLocaleDateString(getLanguage() === "en" ? "en-GB" : "de-DE")}</time></small></article>`;
}
function renderOffers() {
  const location = offersLocation();
  const items = selectOffers({ ...offersView, location });
  const value = state.authenticated ? score() : null;
  const english = getLanguage() === "en";
  const stale = !navigator.onLine || Date.now() - Date.parse(offersCheckedAt) > 90 * 86400000;
  const finderFallback = offersView.mode === "local" || offersView.category === "regional";
  const finders=offerCatalog.filter(item=>item.mode==="finder" && (["all","regional"].includes(offersView.category)||offersView.category===item.category) && offerMatchesSearch(item,offersView.query));
  const needs=state.authenticated?offerNeedHints({people:householdPeople(),water:state.supplies.water,backpack:state.assessment.answers.backpack}):[];
  const categoryButtons = offerCategories.map(category => `<button class="offer-category ${offersView.category === category.id ? "active" : ""}" data-offer-category="${category.id}" aria-pressed="${offersView.category === category.id}"><div class="offer-category-image" style="background-image:url('assets/${category.image}')">${icon(category.icon)}</div><strong>${english ? category.en : category.de}</strong><span>${english ? category.copyEn : category.copyDe}</span><b>${offerText("Entdecken", "Explore")} →</b></button>`).join("");
  const content = `<section class="offers-hero"><div class="offers-hero-copy"><small>${offerText("ANGEBOTE FÜR DEINE VORSORGE", "OFFERS FOR YOUR PREPAREDNESS")}</small><h1>${offerText("Passende Angebote<br>für deinen", "Useful offers<br>for your")} <em>RedScore</em></h1><p>${offerText("Finde Kurse, Ausrüstung und Organisationen, die dir bei deiner persönlichen Vorsorge helfen. Regional, wo ein Angebot belegt ist. Online, wo dein Standort keine Rolle spielt.", "Find courses, equipment and organisations to help you prepare. Regional where a service is documented. Online where location does not matter.")}</p><button class="green link-button" data-offer-discover>${offerText("Angebote entdecken", "Discover offers")} ↓</button><div class="trust-row"><span>✓ ${offerText("Offizielle Anbieter-Seiten", "Official provider websites")}</span><span>✓ ${offerText("Keine Affiliate-Links", "No affiliate links")}</span></div></div><aside class="offers-score">${scoreRing(value)}<h2>${offerText("Deine Vorsorge. Dein nächster Schritt.", "Your preparedness. Your next step.")}</h2><p>${value === null ? offerText("Dein persönlicher Score entsteht nach dem Vorsorge-Check. Du kannst alle Angebote auch ohne Anmeldung entdecken.", "Your personal score is calculated after your preparedness check. Explore all offers without signing in.") : offerText("Das ist derselbe Score wie auf deiner Startseite. Ein Kauf erhöht deinen Score nicht automatisch.", "This is the same score as on your home page. A purchase does not automatically increase it.")}</p>${value === null ? `<button class="outline" ${state.authenticated ? "data-open-assessment" : 'data-open-auth="register"'}>${offerText("Kostenlos Vorsorge prüfen", "Check your preparedness for free")} →</button>` : `<button class="outline" data-route="supplies">${offerText("Eigenen Bedarf prüfen", "Check what you need")} →</button>`}</aside></section>
  <section class="offers-content">${needs.length?`<aside class="offers-needs"><h2>${offerText("Zuerst dein Bedarf","Your needs first")}</h2><p>${offerText("Aus deinen eigenen Angaben. Vorhandenes prüfen, gezielt ergänzen.","Based on your own records. Check what you have before adding more.")}</p><div>${needs.map(hint=>`<button data-route="${hint.route}"><span>${esc(english?hint.en:hint.de)}</span><b>${offerText("Bestand prüfen","Check your supplies")} →</b></button>`).join("")}</div></aside>`:""}<div class="offers-section-title"><div><small>${offerText("KATEGORIEN", "CATEGORIES")}</small><h2>${offerText("Gezielt besser vorbereitet", "Prepare with a purpose")}</h2></div><button class="outline" data-offer-reset>${offerText("Alle Angebote", "All offers")}</button></div><div class="offer-categories">${categoryButtons}</div>
  <section id="offers-results" class="offers-results" aria-label="${offerText("Angebote filtern", "Filter offers")}"><div class="offers-search-area"><form data-offer-search><label for="offer-search">${offerText("Was suchst du?","What are you looking for?")}</label><div><input id="offer-search" name="offerQuery" type="search" maxlength="120" value="${esc(offersView.query)}" placeholder="${offerText("Kurs, Rucksack oder Anbieter …","Course, backpack or provider …")}"><button class="green" data-offer-search-submit>${offerText("Suchen","Search")}</button></div></form><label class="offers-sort">${offerText("Sortieren","Sort")}<select data-offer-sort><option value="recommended" ${offersView.sort==="recommended"?"selected":""}>${offerText("Regionale Einträge zuerst","Regional entries first")}</option><option value="provider" ${offersView.sort==="provider"?"selected":""}>${offerText("Anbieter A–Z","Provider A–Z")}</option></select></label></div>${offersView.query?`<div class="offers-active-query"><span>${offerText("Suchbegriff","Search")}: <b>${esc(offersView.query)}</b></span><button data-offer-clear-query>${offerText("Suche löschen","Clear search")} ×</button></div>`:""}<div class="offers-filter-bar"><div role="group" aria-label="${offerText("Angebotsart", "Offer type")}">${[["all","Alle","All"],["online","Online","Online"],["local","In deiner Nähe","Near you"]].map(([id,de,en]) => `<button data-offer-mode="${id}" aria-pressed="${offersView.mode === id}" class="${offersView.mode === id ? "active" : ""}">${offerText(de,en)}</button>`).join("")}</div><p>${offerText("Katalogstand", "Catalog checked")}: ${new Date(`${offersCheckedAt}T12:00:00Z`).toLocaleDateString(english ? "en-GB" : "de-DE")}</p></div>
  ${state.authenticated ? savedLocationCard() : `<form class="offers-location" data-offers-location><label><span>${offerText("Postleitzahl", "Postcode")}</span><input name="offerPostcode" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="postal-code" value="${esc(location.postalCode || "")}" required></label><label><span>${offerText("Ort in Deutschland", "Town in Germany")}</span><input name="offerCity" maxlength="80" autocomplete="address-level2" value="${esc(location.city || "")}" required></label><button class="green">${offerText("Region anwenden", "Apply location")}</button><small>${offerText("Der Ortsabgleich bleibt auf deinem Gerät. Dein Standort wird nicht an Anbieter übermittelt.", "Location matching stays on your device. Your location is not sent to providers.")}</small><p class="offer-location-error" role="alert" ${offersView.error ? "" : "hidden"}>${esc(offersView.error)}</p></form>`}
  <p class="offers-region-note">${!state.authenticated && location.city ? `${offerText("Ausgewählte Region", "Selected location")}: ${esc([location.postalCode,location.city].filter(Boolean).join(" "))}. ` : ""}${offerText("Regionale Einträge sind derzeit für Stade / Landkreis Stade, Hamburg und Heidelberg erfasst. Keine Entfernungs- oder Verfügbarkeitszusage. Bundesweite Finder decken weitere Orte ab.", "Regional entries currently cover Stade / the Stade district, Hamburg and Heidelberg. No distance or availability guarantee. Germany-wide finders cover other locations.")}</p>
  ${stale ? `<p class="offers-status" role="status">${offerText("Gespeicherter Katalog · keine aktuelle Verfügbarkeitsprüfung. Zum Öffnen der Anbieter-Seiten brauchst du Internet.", "Saved catalog · availability has not been checked live. You need internet to open provider websites.")}</p>` : ""}
  <div class="offers-result-heading"><h2>${offersView.category === "all" ? offerText("Deine Auswahl", "Your selection") : (english ? offerCategories.find(c => c.id === offersView.category)?.en : offerCategories.find(c => c.id === offersView.category)?.de)}</h2><span role="status">${items.length} ${offerText("Einträge", "entries")}</span></div>
  ${items.length ? `<div class="offers-grid">${items.map(offerCard).join("")}</div>` : `<div class="offers-empty">${icon("map")}<h3>${offersView.query?offerText("Keine Treffer für deinen Suchbegriff","No results for your search"):offersView.mode==="local"||offersView.category==="regional"?offerText("Noch keine belegten regionalen Einträge","No documented regional entries yet"):offerText("Keine Angebote in dieser Auswahl","No offers in this selection")}</h3><p>${offersView.query?offerText("Probiere einen kürzeren Begriff oder entferne den Suchfilter.","Try a shorter term or clear your search."):offerText("Unser regionaler Katalog ist noch nicht flächendeckend. Bundesweite Suchportale und Onlineangebote helfen dir weiter.","Our regional catalog does not cover every location yet. Nationwide finders and online offers can help.")}</p>${offersView.query?`<button class="outline" data-offer-clear-query>${offerText("Suche löschen","Clear search")}</button>`:""}<button class="outline" data-offer-reset>${offerText("Alle Angebote", "All offers")}</button></div>`}
  ${finderFallback && finders.length ? `<div class="offers-section-title"><div><h2>${offerText("Weitere Orte selbst finden", "Find services in other locations")}</h2><p>${offerText("Diese Suchportale sind keine bestätigten lokalen Treffer.", "These search portals are not confirmed local results.")}</p></div></div><div class="offers-grid">${finders.map(offerCard).join("")}</div>` : ""}
  </section><details class="offers-method"><summary>${offerText("Wie wir Angebote auswählen", "How we select offers")}</summary><p>${offerText("Wir verlinken nachvollziehbare Angebote auf den offiziellen Seiten etablierter Hilfsorganisationen, Behörden, Händler und Hersteller. Das ist eine redaktionelle Auswahl, kein Produkttest und keine Partnerschaft. Es gibt keine bezahlte Platzierung oder Provision. Preise, Lieferbarkeit, Kurstermine und Eignung bitte beim Anbieter prüfen. Externe Seiten können auf Deutsch sein.", "We link documented services on the official websites of established aid organisations, authorities, retailers and manufacturers. This is an editorial selection, not a product test or a partnership. There are no paid placements or commissions. Check prices, availability, course dates and suitability with the provider. External websites may be in German.")}</p></details></section>`;
  if (state.authenticated) app.innerHTML = loggedShell("angebote", content, "offers-page");
  else { document.body.className = "public-mode"; app.innerHTML = `<div class="public-page offers-page">${publicHeader("angebote")}<main>${content}</main>${footer()}</div>${modal()}`; }
}
function warningSummary(compact = false) {
  const region = state.household.district || state.household.state || state.household.city || "deinen Standort";
  if (!navigator.onLine) return `<span><b>Warnstatus nicht aktuell</b><small>Offline · keine Entwarnung</small></span>`;
  if (warningState.status === "loading") return `<span><b>Regionaler Warnabgleich läuft</b><small>Für ${esc(region)}</small></span>`;
  if (warningState.status === "fallback") return `<span><b>Warnstatus nicht aktuell</b><small>${esc(region)} · gespeicherter Stand · keine Entwarnung</small></span>`;
  if (warningState.status === "error") return `<span><b>Warnstatus nicht verfügbar</b><small>Bitte direkt beim DWD prüfen.</small></span>`;
  if (!warningState.warnings.length) return `<span><b>Keine regionale Warnung in der Lageübersicht</b><small>Keine Entwarnung · amtliche Warnwege prüfen</small></span>`;
  const first = warningState.warnings[0];
  return `<span><b>${esc(first.headline || first.event || "DWD-Wetterwarnung")}</b><small>${esc(first.regionName || region)}</small></span>`;
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
  const synced = liveState.lastSyncAt ? new Date(liveState.lastSyncAt).getTime() : 0;
  const now = Date.now();
  return navigator.onLine && ["live", "refreshing"].includes(liveState.status)
    && received > 0 && synced > 0 && received <= now + 60_000 && synced <= now + 60_000
    && now - received < 150_000 && now - synced < 10 * 60_000;
}

function livePresentation() {
  const isLive = liveConnectionIsFresh();
  const loading = ["idle", "loading", "refreshing"].includes(liveState.status);
  const title = !navigator.onLine ? "OFFLINE" : isLive ? "LIVE-LAGE" : loading ? "LAGEABGLEICH" : liveState.error && !liveState.events.length ? "LAGE UNVERFÜGBAR" : "NICHT AKTUELL";
  const note = !navigator.onLine ? "Gespeicherter Stand · keine Live-Aktualisierung."
    : loading ? "Lageabgleich läuft …"
    : liveState.error ? "Lage-Dienst nicht erreichbar · gespeicherter Stand."
    : !isLive ? "Kein aktueller Lageabgleich · keine Entwarnung."
    : "";
  const age = `${translateText(isLive ? "Zuletzt aktualisiert" : "Letzter Lageabgleich")} ${relativeTime(liveState.lastSyncAt || liveState.receivedAt)}`;
  return { isLive, title, note, age };
}

function updateLiveClock() {
  const presentation = livePresentation();
  const label = document.querySelector("#live-age");
  if (label) label.textContent = presentation.age;
  const title = document.querySelector("[data-live-title]");
  if (title) title.textContent = translateText(presentation.title);
  const dot = document.querySelector("[data-live-dot]");
  if (dot) dot.className = `live-dot ${presentation.isLive ? "live" : "offline"}`;
  const note = document.querySelector("[data-live-note]");
  if (note) { note.textContent = translateText(presentation.note); note.hidden = !presentation.note; }
}

function storeLiveCache() {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
      events: liveState.events, sources: liveState.sources, lastSyncAt: liveState.lastSyncAt,
      receivedAt: liveState.receivedAt, scope: liveState.scope, filter: liveState.filter, language: getLanguage(),
    }));
  } catch { /* The feed remains usable in memory. */ }
}

function liveSelectionKey() { return `${getLanguage()}|${liveState.scope}|${liveState.filter}|${mapLocationKey()}|${state.household.district}`; }
async function requestLiveLage(force = false) {
  if (!state.authenticated) return;
  if (!navigator.onLine) {
    liveState.status = "offline";
    return;
  }
  const requestedLanguage = getLanguage();
  const requestedKey = liveSelectionKey();
  if (liveRequest) {
    if (liveRequestKey === requestedKey) return liveRequest;
    return liveRequest.finally(() => requestLiveLage());
  }
  if (!force && liveAttempt.key === requestedKey && Date.now() - liveAttempt.at < LIVE_REFRESH_MS) return;
  liveAttempt = { key: requestedKey, at: Date.now() };
  liveState.status = liveState.events.length ? "refreshing" : "loading";
  updateLiveClock();
  const params = new URLSearchParams({ scope: liveState.scope, filter: liveState.filter, limit: "12", country: "Deutschland", language: requestedLanguage });
  if (state.household.state) params.set("region", state.household.state);
  if (state.household.district) params.set("district", state.household.district.replace(/^Landkreis\s+/i, ""));
  if (placesState.key === mapLocationKey() && placesState.center) { params.set("lat", String(placesState.center.lat)); params.set("lon", String(placesState.center.lon)); }
  liveRequestKey = requestedKey;
  liveRequest = fetch(`/api/live-lage?${params}`, { cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { accept: "application/json", "accept-language": requestedLanguage } })
    .then(async response => {
      if (!response.ok) throw new Error("Live-Lage API unavailable");
      const payload = await response.json();
      if (!state.authenticated || liveSelectionKey() !== requestedKey) return;
      liveState.events = Array.isArray(payload.events) ? payload.events : [];
      liveState.sources = Array.isArray(payload.sources) ? payload.sources : [];
      liveState.lastSyncAt = payload.lastSyncAt || null;
      liveState.receivedAt = new Date().toISOString();
      liveState.status = "live";
      liveState.error = null;
      storeLiveCache();
    })
    .catch(() => {
      if (liveSelectionKey() !== requestedKey) return;
      liveState.status = navigator.onLine ? "error" : "offline";
      liveState.error = "Die Live-Lage konnte nicht aktualisiert werden.";
    })
    .finally(() => {
      liveRequest = null;
      liveRequestKey = null;
      clearTimeout(liveRefreshTimer);
      if (state.authenticated) liveRefreshTimer = setTimeout(() => { if (!document.hidden) { requestLiveLage(true); requestWarnings(true); } }, LIVE_REFRESH_MS);
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
  const presentation = livePresentation();
  const events = visibleLiveEvents();
  const hiddenDuplicates = Math.max(0, liveState.events.length - events.length);
  return `<aside class="live-lage-panel" aria-label="Aktuelle Sicherheits- und Krisenlage">
    <header><div><span data-live-dot aria-hidden="true" class="live-dot ${presentation.isLive ? "live" : "offline"}"></span><h2 data-live-title>${presentation.title}</h2></div><button data-live-refresh aria-label="Live-Lage aktualisieren">↻</button><small id="live-age">${presentation.age}</small><small data-live-note role="status" ${presentation.note ? "" : "hidden"}>${presentation.note}</small></header>
    <div class="live-scope" role="group" aria-label="Lagebereich">${Object.entries(liveScopeLabels).map(([key,label]) => `<button data-live-scope="${key}" aria-pressed="${liveState.scope===key}" class="${liveState.scope===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-filters" role="group" aria-label="Meldungskategorie">${Object.entries(liveFilterLabels).map(([key,label]) => `<button data-live-filter="${key}" aria-pressed="${liveState.filter===key}" class="${liveState.filter===key?"active":""}">${label}</button>`).join("")}</div>
    <div class="live-list ${liveState.status}">${events.length ? events.map(liveEventCard).join("") : `<div class="live-empty">${icon("radio","big-icon")}<h3>${liveState.status === "loading" ? "Lageabgleich läuft …" : liveState.status === "error" ? "Lage-Dienst nicht erreichbar" : "Keine aktiven Meldungen in dieser Auswahl"}</h3><p>${liveState.status === "error" ? "Gespeicherte Meldungen würden hier offline weiter angezeigt. Bitte später erneut versuchen." : "Das ist kein Entwarnungssignal. Im Ereignisfall gelten amtliche Warnungen und Anweisungen."}</p></div>`}</div>
    <footer><span>${liveState.sources.length} Quellen im Lageabgleich${hiddenDuplicates ? ` · ${hiddenDuplicates} Wiederholungen gebündelt` : ""}</span><small>Keine Boulevard- oder allgemeinen Politikmeldungen.</small></footer>
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
  const statusTone = warningState.warnings.length && warningState.status === "ok" ? "danger" : "neutral";
  const heroPhoto = sceneStyle("dashboard", "--hero-photo");
  const content = `<div class="home-live-layout"><div class="home-core"><section class="dashboard-hero" ${heroPhoto}>
    <div class="dashboard-copy"><h1>Heute vorsorgen.<br><em>Morgen sicherer.</em></h1><p>Krisen kommen oft unerwartet.<br>Sei vorbereitet – für deine Familie,<br>dein Zuhause und deine Zukunft.</p><blockquote>„Sicherheit ist planbar – Schritt für Schritt.“</blockquote></div>
    <div class="dashboard-score">${scoreRing(value, value !== null && value < 50)}<div class="score-message"><strong>${value === null ? "Noch nicht bewertet." : value >= 70 ? "Gut vorbereitet." : "Es gibt wichtige Lücken."}</strong><p>${value === null ? `Beantworte zuerst alle ${relevantAssessmentQuestions().length} Fragen. Wir zeigen niemals einen erfundenen Beispielwert.` : "70 % Vorsorge-Check · 30 % erfasster Vorratsfortschritt"}</p><button class="${value !== null && value < 50 ? "red" : "green"}" data-open-assessment>${value === null ? "Jetzt ehrlich prüfen" : "Angaben aktualisieren"} →</button></div></div>
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
  requestWarnings();
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
  const shown = items.filter(item => (state.ui.packFilter === "Alle" || item.category === state.ui.packFilter) && (!query || `${item.label} ${item.detail} ${item.category} ${translateText(item.label)} ${translateText(item.detail)} ${translateText(item.category)}`.toLowerCase().includes(query)));
  const readyText = percent === 100 ? "Dein Rucksack ist vollständig geprüft." : `${total - checked} ${total - checked === 1 ? "Punkt fehlt" : "Punkte fehlen noch"}.`;
  const content = `<section class="subhero compact packlist-hero"><div><small>BBK-ORIENTIERT · PERSÖNLICH</small><h1>Notfallrucksack</h1><h2>Alles Wichtige griffbereit.</h2><p>Packe nur, was du selbst tragen kannst. Hake ab, was bereits vorhanden und einsatzbereit ist.</p><a href="${sources.bbkBag}" target="_blank" rel="noreferrer">Offizielle BBK-Empfehlungen öffnen →</a></div></section>
    <div class="content-wrap packlist-layout"><aside class="packlist-visual"><div class="pack-visual-art">${icon("backpack", "pack-bag-icon")}</div><div class="pack-ring" style="--pack-progress:${percent * 3.6}deg"><strong>${percent}%</strong><small>geprüft</small></div><h2>${checked} von ${total} bereit</h2><p>${readyText}</p><div class="bar"><i style="width:${percent}%"></i></div><small class="packlist-note">Die Liste wird lokal gespeichert und mit deinem Konto synchronisiert. Sie ersetzt keine individuelle Beratung.</small></aside><section class="packlist-content"><div class="packlist-toolbar"><form data-pack-search><label><span>Packliste durchsuchen</span><input name="query" value="${esc(state.ui.packSearch)}" placeholder="z. B. Medikamente"></label><button class="outline">Suchen</button></form><div class="filter-row pack-filters">${categories.map(category => `<button data-pack-filter="${category}" class="${category===state.ui.packFilter?"active":""}">${category}</button>`).join("")}</div></div><div class="packlist-summary"><span>${shown.length} ${shown.length === 1 ? "Eintrag" : "Einträge"}</span><span>${checked} abgehakt · ${total - checked} offen</span></div><div class="pack-items">${shown.length ? shown.map(packItemCard).join("") : `<div class="no-data">${icon("backpack", "big-icon")}<h3>Keine Einträge gefunden</h3><p>Ändere die Suche oder wähle eine andere Kategorie.</p><button class="outline" data-clear-pack-search>Suche und Filter zurücksetzen</button></div>`}</div></section></div>`;
  app.innerHTML = loggedShell("packliste", content, "packlist-page");
}

let supplyTwinPlan = newSupplyTwinPlan();
let supplyTwinFingerprint = "";
function supplyTwinSnapshot() { return { people:householdPeople(), water:state.supplies.water, food:state.supplies.food }; }
function prepareSupplyTwin() {
  const snapshot=supplyTwinSnapshot(),fingerprint=JSON.stringify([state.profile.id,snapshot]);
  if(fingerprint!==supplyTwinFingerprint){supplyTwinPlan=newSupplyTwinPlan();supplyTwinFingerprint=fingerprint;}
  return snapshot;
}
function refreshSupplyTwin() { updateSupplyTwin(app.querySelector('[data-supply-twin]'),supplyTwinSnapshot(),supplyTwinPlan,getLanguage()); }
function setSupplyTwinField(field,value) {
  if(!['guests','water','food','hour','readyPercent'].includes(field))return;
  const numeric=Number(value);
  if(field==='readyPercent')supplyTwinPlan.readyPercent=value===''?null:[0,25,50,75,100].includes(numeric)?numeric:null;
  else if(Number.isFinite(numeric))supplyTwinPlan[field]=clamp(numeric,0,({guests:6,water:1000,food:100,hour:supplyTwinPlan.target*24})[field]);
  refreshSupplyTwin();
}
function renderSupplies() {
  prepareSupplyTwin();
  const twinEnglish=getLanguage()==='en';
  const percent = supplyPercent();
  const customSupplies = normalizeCustomSupplies(state.customSupplies);
  const filters = ["Alle", "Versorgung", "Gesundheit", "Haushalt", ...(customSupplies.some(item => item.category === "Sonstiges") ? ["Sonstiges"] : [])];
  const relevantGroups = supplyGroups.filter(group => group.id !== "pet" || petCount() > 0);
  const recordedCount = relevantGroups.filter(group => state.supplies[group.id] !== null).length;
  const nextGroup = relevantGroups.find(group => state.supplies[group.id] === null) || relevantGroups[0];
  const progressCopy = getLanguage() === "en" ? `${recordedCount} of ${relevantGroups.length} areas recorded` : `${recordedCount} von ${relevantGroups.length} Bereichen erfasst`;
  const shownGroups = relevantGroups.filter(group => state.ui.supplyFilter === "Alle" || group.category === state.ui.supplyFilter);
  const shownCustomSupplies = customSupplies.filter(item => state.ui.supplyFilter === "Alle" || item.category === state.ui.supplyFilter);
  const content = `<section class="image-hero pantry-hero" ${sceneStyle("supplies")}><div><h1>Vorräte</h1><h2>Heute vorsorgen. Morgen sicher.</h2><p>Ein alltagstauglicher Vorrat schafft Handlungsspielraum, wenn Versorgung oder Strom ausfallen.</p><a href="${sources.bbkGuide}" target="_blank" rel="noreferrer">Empfehlungen des BBK öffnen →</a></div></section>
    <div class="content-wrap"><button class="twin-launch" data-open-supply-twin aria-haspopup="dialog"><span class="twin-launch-orbit" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="23"/><path d="M32 18v15l11 7M8 17l5-6 7 3M56 47l-5 6-7-3"/></svg></span><span class="twin-launch-copy"><small>${twinEnglish?'WHAT IF?':'WAS WÄRE WENN?'}</small><strong>${twinEnglish?'Your supplies. A journey ahead.':'Dein Vorrat. Eine Reise voraus.'}</strong><span>${twinEnglish?'Discover your first shortfall — and how to move it.':'Entdecke deinen ersten Engpass — und wie du ihn verschiebst.'}</span></span><span class="twin-launch-cta">${twinEnglish?'Start time machine':'Zeitmaschine starten'} <b aria-hidden="true">↗</b></span></button></div>
    <div class="content-wrap supplies-layout"><aside class="side-card supply-progress-card"><small>VORRATSFORTSCHRITT</small><strong>${percent === null ? "Noch nicht erfasst" : `${percent} %`}</strong><div class="bar"><i style="width:${percent === null ? 0 : percent}%"></i></div><p>${progressCopy}</p><p>${percent === null ? "Trage deine tatsächlichen Bestände ein." : "Aus deinen selbst eingetragenen Beständen berechnet."}</p><small>Nicht erfasste Bereiche zählen noch nicht als vorbereitet.</small><button class="outline" data-open-supply="${nextGroup.id}">${recordedCount === relevantGroups.length ? "Bestände prüfen" : "Nächsten Bereich erfassen"}</button></aside>
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
  try { localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify({ key: placesState.key, center: placesState.center, places: placesState.places, fetchedAt: placesState.fetchedAt, listStatus: placesState.listStatus })); }
  catch { /* The online map remains usable without a local cache. */ }
}
async function requestNearbyPlaces(force = false) {
  const key = mapLocationKey();
  if (!state.authenticated || !state.household.city || !state.household.postalCode || placesRequest) return placesRequest;
  if (!navigator.onLine) { placesState.status = placesState.places.length && placesState.key === key ? "offline" : "error"; return; }
  if (!force && !["stale", "unavailable"].includes(placesState.listStatus) && placesState.key === key && placesState.fetchedAt && Date.now() - Date.parse(placesState.fetchedAt) < 6 * 60 * 60_000) return;
  if (!force && placesAttempt.key === key && Date.now() - placesAttempt.at < 60_000) return;
  placesAttempt = { key, at: Date.now() };
  placesState.status = placesState.places.length && placesState.key === key ? "refreshing" : "loading";
  const params = new URLSearchParams({ postalCode: state.household.postalCode, city: state.household.city, state: state.household.state || "" });
  placesRequest = fetch(`/api/places?${params}`, { cache: "no-store", headers: { accept: "application/json" } })
    .then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Ortsdaten nicht verfügbar");
      const listStatus = ["ready", "stale", "unavailable"].includes(payload.placesStatus) ? payload.placesStatus : "ready";
      const preserve = listStatus === "unavailable" && placesState.key === key && Boolean(placesState.fetchedAt);
      placesState = {
        status: preserve || listStatus === "stale" ? "stale" : listStatus === "unavailable" ? "partial" : "live",
        key, center: payload.center || (placesState.key === key ? placesState.center : null),
        places: preserve ? placesState.places : Array.isArray(payload.places) ? payload.places : [],
        fetchedAt: preserve ? placesState.fetchedAt : listStatus === "unavailable" ? null : payload.generatedAt || new Date().toISOString(),
        listStatus: preserve ? "stale" : listStatus, error: null,
      };
      storePlacesCache();
    })
    .catch(error => { placesState.status = placesState.places.length && placesState.key === key ? "offline" : "error"; placesState.error = error instanceof Error ? error.message : "Ortsdaten nicht verfügbar"; })
    .finally(() => { placesRequest = null; if (state.authenticated && hashRoute() === "map") render(); });
  return placesRequest;
}
function placeIcon(category) {
  return ({ Behörden: "profile", Versorgung: "supplies", Gesundheit: "medical", Schutzräume: "home", Hilfe: "weather-warning" })[category] || "map";
}
function osmEmbed(center, destination = null) {
  if (!center || !navigator.onLine) return "";
  if ([center.lat, center.lon].some(value => value === null || value === undefined || String(value).trim() === "")) return "";
  const lat = Number(center.lat), lon = Number(center.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return "";
  const targetLat = Number(destination?.lat), targetLon = Number(destination?.lon);
  const hasDestination = destination && [destination.lat, destination.lon].every(value => value !== null && value !== undefined && String(value).trim() !== "") && Number.isFinite(targetLat) && Number.isFinite(targetLon) && Math.abs(targetLat) <= 90 && Math.abs(targetLon) <= 180;
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
    return render();
  }
  mapRouteState = { status: "loading", placeId, route: null, error: null };
  render();
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
  render();
  document.querySelector(".route-overview")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function renderMap() {
  const categories = ["Alle", "Behörden", "Versorgung", "Gesundheit", "Hilfe", "Schutzräume"];
  const currentKey = mapLocationKey();
  const hasCurrentData = placesState.key === currentKey;
  const listAvailable = hasCurrentData && placesState.listStatus !== "unavailable";
  const allPlaces = hasCurrentData ? placesState.places : [];
  const shown = allPlaces.filter(place => state.ui.mapFilter === "Alle" || place.category === state.ui.mapFilter);
  const location = [state.household.postalCode, state.household.city].filter(Boolean).join(" ") || "Standort nicht eingerichtet";
  const locationReady = /^\d{5}$/.test(String(state.household.postalCode || "")) && Boolean(state.household.city);
  const pendingPlaces = locationReady && navigator.onLine && !["error", "partial"].includes(placesState.status) && (!hasCurrentData || placesState.status === "loading");
  const selectedPlace = allPlaces.find(place => place.id === mapRouteState.placeId) || null;
  const embed = hasCurrentData ? osmEmbed(placesState.center, selectedPlace) : "";
  const mapStatus = !locationReady ? "Standort noch nicht eingerichtet" : !navigator.onLine ? (hasCurrentData && placesState.fetchedAt ? `Offline-Stand ${relativeTime(placesState.fetchedAt)}` : "Karte offline") : placesState.status === "error" ? (placesState.error || "Ortsdaten nicht verfügbar") : placesState.status === "partial" ? offerText("Karte verfügbar · Ortsliste vorübergehend nicht erreichbar", "Map available · place list temporarily unavailable") : !hasCurrentData || placesState.status === "loading" ? "Orte werden geladen …" : placesState.status === "refreshing" ? "Ortsdaten werden aktualisiert …" : ["offline", "stale"].includes(placesState.status) ? `${offerText("Gespeicherte Ortsliste", "Saved place list")} · ${relativeTime(placesState.fetchedAt)}` : `OpenStreetMap-Daten · ${relativeTime(placesState.fetchedAt)}`;
  const routeOverview = selectedPlace ? `<article class="route-overview ${mapRouteState.status}">
    <div>${icon(placeIcon(selectedPlace.category), "route-place-icon")}<span><small>ROUTENZIEL</small><b>${esc(selectedPlace.name)}</b><em>${esc(selectedPlace.address || selectedPlace.distanceLabel)}</em><small>Startpunkt: Ortsmittelpunkt deines gespeicherten Standorts</small></span></div>
    ${mapRouteState.status === "loading" ? `<p><i></i> Fahrtroute wird innerhalb von RedScore berechnet …</p>` : mapRouteState.status === "ready" ? `<p><strong>${routeDistance(mapRouteState.route.distanceMeters)}</strong><strong>${routeDuration(mapRouteState.route.durationSeconds)}</strong><small>PKW-Route · ${esc(mapRouteState.route.source)}</small></p>` : `<p class="route-error">${esc(mapRouteState.error || "Route nicht verfügbar")}</p>`}
    <button data-map-route-close aria-label="Routenansicht schließen">×</button>
  </article>` : "";
  const content = `<section class="safeplaces-heading"><div><small>ORIENTIERUNG FÜR DEINEN ALLTAG UND DEN ERNSTFALL</small><h1>SafePlaces<span>Deine Umgebung. Klar im Blick.</span></h1><p>Apotheken, Versorgung und wichtige Anlaufstellen rund um deinen gespeicherten Standort. Als Schutzraum gilt ein Ort nur, wenn er ausdrücklich so gekennzeichnet ist.</p></div><span class="safeplaces-heading-mark" aria-hidden="true">${icon("map")}</span></section>
    <div class="safeplaces-workspace">${savedLocationCard({ map: true, status: mapStatus })}
    <div class="safeplaces-filter"><span>Was suchst du?</span><div class="filter-row wide">${categories.map(f => `<button data-map-filter="${f}" aria-pressed="${f===state.ui.mapFilter}" class="${f===state.ui.mapFilter?"active":""}">${f}</button>`).join("")}</div></div>
    <div class="map-layout"><section class="place-list"><h2>${!listAvailable || pendingPlaces ? offerText("Orte im Umkreis", "Places nearby") : `Orte (${shown.length})`}</h2>${pendingPlaces && !shown.length ? `<div class="no-data map-loading"><span></span><h3>Karte wird vorbereitet</h3><p>Standort und relevante Infrastruktur werden sicher serverseitig abgefragt.</p></div>` : shown.length ? shown.map(place => `<article class="${place.id === mapRouteState.placeId ? "route-selected" : ""}">${icon(placeIcon(place.category),"place-icon")}<div><b>${esc(place.name)}</b><small>${esc(place.address || place.distanceLabel)}</small><em>${esc(place.category)} · ${esc(place.distanceLabel)} · OpenStreetMap</em></div><button data-map-route="${esc(place.id)}" aria-label="Route zu ${esc(place.name)} innerhalb von RedScore anzeigen">${place.id === mapRouteState.placeId ? "Ausgewählt" : "Route"} →</button></article>`).join("") : `<div class="no-data">${icon("home","big-icon")}<h3>${!locationReady ? "Standort noch nicht eingerichtet" : !listAvailable ? "Ortsdaten nicht verfügbar" : "Keine passenden Orte gefunden"}</h3><p>${!locationReady ? "Ergänze Postleitzahl und Ort in deinen Haushaltsangaben." : !listAvailable ? (embed ? "Die Karte bleibt verfügbar. Die Ortsliste kann später erneut geladen werden." : "Bitte versuche es später erneut oder prüfe den hinterlegten Standort.") : "Wechsle den Filter oder aktualisiere die Suche. Behördlich ausgewiesene Schutzräume sind in Deutschland nur lückenhaft erfasst."}</p></div>`}</section>
      <section class="real-map ${embed ? "online-map" : "offline-map"} ${selectedPlace ? "has-route" : ""}" aria-label="${selectedPlace ? `Route zu ${esc(selectedPlace.name)}` : "Karte wichtiger Anlaufstellen"}"><div class="map-canvas-toolbar"><div><b>${offerText("Umgebungskarte", "Area map")}</b><span>${esc(location)}</span></div><button class="outline" data-map-center ${!embed ? "disabled" : ""}>${offerText("Standort zeigen", "Show location")}</button></div><div class="map-canvas">${routeOverview}${embed ? `<iframe src="${embed}" title="${selectedPlace ? `OpenStreetMap mit Routenziel ${esc(selectedPlace.name)}` : `OpenStreetMap rund um ${esc(location)}`}" loading="lazy" referrerpolicy="no-referrer"></iframe><span class="map-marker-legend"><i></i>${selectedPlace ? offerText("Markierung: Routenziel", "Marker: destination") : offerText("Markierung: Ortsmittelpunkt", "Marker: town centre")}</span>` : `<div class="map-unavailable">${icon("map","big-icon")}<h3>${!locationReady ? "Standort noch nicht eingerichtet" : !navigator.onLine ? "Karte offline" : placesState.status === "error" ? "Ortsdaten nicht verfügbar" : "Karte wird geladen"}</h3><p>${!locationReady ? "Ergänze Postleitzahl und Ort in deinen Haushaltsangaben." : !navigator.onLine ? "Deine zuletzt gespeicherte Ortsliste bleibt verfügbar. Kartenkacheln benötigen eine Internetverbindung." : placesState.status === "error" ? "Bitte versuche es später erneut oder prüfe den hinterlegten Standort." : "Die Kartenansicht erscheint nach dem Ortsabgleich."}</p></div>`}</div></section>
    </div></div><p class="map-source-note">OpenStreetMap-Einträge sind Gemeinschaftsdaten und keine amtliche Bestätigung der Eignung im Katastrophenfall. Prüfe Öffnungszeiten und behördliche Hinweise.</p><div class="emergency-bar">⚠ <b>Im Ernstfall:</b> Aktuelle Warnmeldungen und behördliche Anweisungen haben Vorrang. <button data-route="warnschutz">Warnstatus prüfen →</button></div>`;
  app.innerHTML = loggedShell("map", content, "map-page");
  requestNearbyPlaces();
}

function renderWarnschutz() {
  const checked = warningState.checkedAt ? new Date(warningState.checkedAt).toLocaleTimeString(getLanguage() === "en" ? "en-GB" : "de-DE",{hour:"2-digit",minute:"2-digit"}) : "–";
  const content = `<section class="image-hero warning-hero"><div><h1>Früh informiert.<br><em>Besser vorbereitet.</em></h1><p>Amtliche Wetterwarnungen und belastbare Warnwege für ${esc(state.household.city || "deinen Standort")}.</p></div></section>
    <div class="warning-layout"><section><article class="current-warning ${warningState.status==="ok"&&warningState.warnings.length?"":"neutral"}">${icon("weather-warning","warning-large")}${warningSummary()}<span>Lageabgleich: ${checked}</span><a href="${sources.dwd}" target="_blank" rel="noreferrer">Beim DWD öffnen ↗</a></article>
      <div class="warning-cards"><article>${icon("bell","big-icon")}<h3>Cell Broadcast</h3><p>Warnungen werden auf kompatiblen, eingeschalteten Mobiltelefonen ohne App ausgesendet.</p></article><article>${icon("weather-warning","big-icon")}<h3>NINA</h3><p>Die offizielle Warn-App des BBK bündelt Zivil-, Polizei-, Wetter- und Hochwasserwarnungen.</p><a href="${sources.nina}" target="_blank">NINA beim BBK ↗</a></article><article>${icon("radio","big-icon")}<h3>Radio</h3><p>Ein Batterie-, Solar- oder Kurbelradio bleibt bei Strom- und Internetausfall wichtig.</p></article></div>
    </section><aside><h3>Benachrichtigungen</h3><p>RedScore kann den Browserzugriff anfragen. Eine Freigabe ersetzt keine Warn-App.</p><button class="green" data-notifications>${"Notification" in window && Notification.permission === "granted" ? "Browser-Mitteilungen erlaubt" : "Berechtigung prüfen"}</button><h3>Verhalten bei Unwetter</h3><ul><li>Amtliche Meldungen verfolgen</li><li>Fenster und Türen schließen</li><li>Lose Gegenstände sichern</li><li>Überflutete Bereiche meiden</li></ul></aside></div>`;
  app.innerHTML = loggedShell("warnschutz", content, "warn-page");
  requestWarnings();
}

function renderKnowledge() {
  const query = state.ui.knowledgeSearch.toLowerCase();
  const shown = knowledgeArticles.filter(a => !query || `${a.title} ${a.summary} ${translateText(a.title)} ${translateText(a.summary)}`.toLowerCase().includes(query));
  const content = `<section class="image-hero knowledge-hero" ${sceneStyle("knowledge")}><div><h1>Wissen <em>schützt.</em></h1><h2>Verstehen. Vorbereiten. Handeln.</h2><p>Verständliche Hinweise und offizielle Quellen für mehr Sicherheit in allen Lebenslagen.</p><form data-knowledge-search><input name="query" value="${esc(state.ui.knowledgeSearch)}" placeholder="Thema suchen …"><button>⌕</button></form></div><span class="sign-copy">WISSEN<br>VON HEUTE.<br>SICHERHEIT<br>VON MORGEN.</span></section>
    <div class="content-wrap knowledge-content"><section><h2>Empfehlungen für dich</h2><div class="article-grid">${shown.map(article => `<article><div class="article-visual">${icon(article.icon,"article-icon")}</div><small>${article.category} · ${article.minutes} Min.</small><h3>${article.title}</h3><p>${article.summary}</p><button data-article="${article.id}">Ansehen →</button></article>`).join("") || `<div class="no-data"><h3>Keine passenden Artikel gefunden</h3><p>Versuche einen anderen Suchbegriff.</p><button class="outline" data-clear-knowledge-search>Suche zurücksetzen</button></div>`}</div></section>
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
  if (state.ui.modal === "supply-twin" && state.authenticated) {
    const snapshot=prepareSupplyTwin(),english=getLanguage()==='en';
    return `<div class="modal-backdrop twin-backdrop"><section class="modal supply-twin-modal"><div class="twin-dialog-bar"><span>${english?'YOUR PERSONAL SUPPLY LAB':'DEIN PERSÖNLICHES VORRATSLABOR'}</span><button class="modal-close" data-close-modal aria-label="${english?'Close':'Schließen'}">×</button></div>${supplyTwinMarkup(snapshot,supplyTwinPlan,getLanguage())}</section></div>`;
  }
  if (state.ui.modal === "install") {
    const english = getLanguage() === "en";
    return `<div class="modal-backdrop install-backdrop"><section class="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><button class="modal-close" data-install-dismiss aria-label="${english ? "Close" : "Schließen"}">×</button><img class="install-logo" src="assets/app-icon-192.png?v=5" alt=""><small>${english ? "REDScore DESKTOP-APP" : "REDSCORE DESKTOP-APP"}</small><h2 id="install-title">${english ? "RedScore always at hand" : "RedScore immer griffbereit"}</h2><p>${english ? "Install RedScore as a desktop app for fast access to your preparedness status, supplies and live situation updates." : "Installiere RedScore als Desktop-App und erreiche Vorsorgestand, Vorräte und Live-Lage schneller."}</p><button class="green full" data-install-app>${english ? "Download and install" : "Download & installieren"} →</button><button class="install-later" data-install-dismiss>${english ? "Maybe later" : "Später"}</button></section></div>`;
  }
  if (state.ui.modal.startsWith("scorelab:")) {
    const step = scoreLabSteps.find(item => item.id === state.ui.modal.slice("scorelab:".length));
    if (!step) return "";
    const selected = scoreLabSelection.has(step.id);
    const result = scoreLabResult();
    const status = selected ? "In der Simulation eingeplant" : "Aus der Simulation entfernt";
    return `<div class="modal-backdrop"><section class="modal scorelab-why-modal" role="dialog" aria-modal="true" aria-labelledby="scorelab-why-title"><button class="modal-close" data-close-modal aria-label="${getLanguage() === "en" ? "Close" : "Schließen"}">×</button>${icon(step.icon,"modal-icon")}<h2 id="scorelab-why-title">${esc(translateText(step.label))}</h2><p>${esc(translateText(step.why))}</p><div class="scorelab-result"><span>${translateText(status)}</span><strong>${result.value}<small>${translateText("von 100")}</small></strong></div><button class="green full" data-close-modal>${translateText("Verstanden")} →</button></section></div>`;
  }
  if (state.ui.modal.startsWith("legal:")) {
    const page = state.ui.modal.slice(6);
    const contents = {
      about: ["Über RedScore", `<p>RedScore ist ein bürgerfreundliches Katastrophenvorbereitungssystem. Es verbindet persönliche Vorsorge, Vorratsplanung, verifizierte Anlaufstellen, Warnwege und eine strukturierte Lageübersicht.</p><p>RedScore ersetzt keine amtliche Warnung oder fachliche Beratung. Im Ereignisfall gelten die Anweisungen der zuständigen Behörden.</p>`],
      privacy: ["Datenschutzhinweise", `<h3>Welche Daten verarbeitet werden</h3><p>Für das Konto werden E-Mail-Adresse, Anzeigename, freiwillige Haushaltsangaben, Standortangaben, Vorsorgeantworten und Bestände verarbeitet. Private Fotos werden weder angefordert noch verarbeitet.</p><h3>Zweck und Speicherung</h3><p>Die Daten dienen ausschließlich der personalisierten Vorsorgeplanung, Synchronisierung und Offline-Nutzung. Kontodaten werden bei Supabase in der EU gespeichert; die Webanwendung wird über Vercel bereitgestellt. Zusätzlich hält das Endgerät eine Offline-Kopie.</p><h3>Umgebungskarte und Ortsdaten</h3><p>Für die Umgebungssuche werden Postleitzahl und Ort über unseren Server an Nominatim/OpenStreetMap übermittelt. Die Ortsdaten-Abfrage sendet den Ortsmittelpunkt an Overpass oder ersatzweise Photon (komoot). Dabei werden keine Kontodaten, Haushaltsangaben oder genauen Wohnadressen übermittelt. Beim Laden der eingebetteten Karte stellt dein Browser eine Verbindung zu OpenStreetMap her; dabei wird deine IP-Adresse technisch übertragen.</p><h3>${getLanguage()==="en"?"Cookies, local storage and optional statistics":"Cookies, lokaler Speicher und optionale Statistik"}</h3><p>${getLanguage()==="en"?"We store your account session, language, preparedness records and offline cache locally for the functions you use. Your privacy choice is saved on this device for 180 days. Only after your consent, RedScore counts public page views and daily visits in our Supabase database. A random session-storage identifier applies to this browser tab and expires after 30 minutes of inactivity. The server stores daily changing identifier hashes for at most three days and daily totals for 400 days. Names, email addresses, IP addresses, household data and URL query parameters are not stored in the statistics. IP addresses are technically processed by the server; short-lived request rate limits operate in memory. No advertising pixels are used. Visits are not unique people; signed-in views are not counted. You can withdraw consent at any time using Cookie settings in the footer; further statistics events are then blocked.":"Für die genutzten Funktionen speichern wir Kontositzung, Sprache, Vorsorgedaten und Offline-Cache lokal. Deine Datenschutz-Auswahl bleibt für 180 Tage auf diesem Gerät gespeichert. Nur nach deiner Zustimmung zählt RedScore öffentliche Seitenaufrufe und tägliche Besuche in unserer Supabase-Datenbank. Eine zufällige Kennung im Sitzungsspeicher gilt für diesen Browser-Tab und läuft nach 30 Minuten Inaktivität ab. Serverseitig speichern wir täglich wechselnde Kennungs-Hashes für höchstens drei Tage, Tageszahlen für 400 Tage. Namen, E-Mail-Adressen, IP-Adressen, Haushaltsdaten und URL-Suchparameter werden nicht in der Statistik gespeichert. IP-Adressen werden beim Serveraufruf technisch verarbeitet; eine kurzzeitige Begrenzung der Anfragerate erfolgt im Arbeitsspeicher. Es gibt keine Werbepixel. Besuche sind keine eindeutigen Personen; eingeloggte Ansichten werden nicht gezählt. Du kannst deine Einwilligung jederzeit über Cookie-Einstellungen im Footer widerrufen; weitere Statistikereignisse werden dann blockiert."}</p><h3>Deine Rechte</h3><p>Du kannst Auskunft, Berichtigung, Löschung, Einschränkung oder Datenübertragbarkeit anfragen. Kontakt: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p><p>Die Live-Lage speichert keine privaten Profile in externen Feeds. Browser-Mitteilungen werden nur nach ausdrücklicher Freigabe aktiviert.</p>`],
      imprint: ["Impressum", `<h3>Angaben gemäß § 5 DDG</h3><p><b>commit&amp;push Venture Builder</b><br>RedScore – Weil der Ernstfall nicht fragt, ob du bereit bist.</p><h3>Kontakt</h3><p>E-Mail: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br>Web: <a href="https://www.redscore.de">www.redscore.de</a></p><h3>Gerichtsstand</h3><p>Für Rechtsverhältnisse, bei denen eine Gerichtsstandsvereinbarung gesetzlich zulässig ist, ist die Hansestadt Stade als Gerichtsstand vereinbart. Gesetzlich zwingende Gerichtsstände bleiben unberührt.</p><h3>Verantwortung und Haftung</h3><p>RedScore bereitet öffentlich zugängliche Vorsorgeinformationen auf. Trotz sorgfältiger Prüfung besteht kein Anspruch auf Vollständigkeit oder ständige Aktualität. Amtliche Warnungen und behördliche Anweisungen haben Vorrang.</p>`],
    };
    const [title, content] = contents[page] || contents.about;
    return `<div class="modal-backdrop"><section class="modal legal-modal"><button class="modal-close" data-close-modal>×</button><small>REDSCORE</small><h2>${title}</h2>${content}<small>Stand: 1. Oktober 2026</small></section></div>`;
  }
  if (["login", "register"].includes(state.ui.modal)) {
    const register = state.ui.modal === "register";
    return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal>×</button>${icon("profile","modal-icon")}<small>SICHERES REDSCORE-KONTO</small><h2>${register ? "Kostenlos registrieren" : "Einloggen"}</h2><div class="auth-tabs"><button data-open-auth="login" class="${register ? "" : "active"}">Einloggen</button><button data-open-auth="register" class="${register ? "active" : ""}">Registrieren</button></div><form data-auth-form="${register ? "register" : "login"}">${register ? `<label><span>Name</span><input name="displayName" autocomplete="name" maxlength="80" required></label>` : ""}<label><span>E-Mail</span><input name="email" type="email" autocomplete="email" value="${esc(authEmailDraft)}" maxlength="254" required></label><label><span>Passwort</span><input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="8" required></label><button class="green full" ${accountBusy ? "disabled" : ""}>${accountBusy ? "Bitte warten …" : register ? "Konto anlegen →" : "Einloggen →"}</button></form>${passwordResetCompleted && !register ? `<p class="auth-notice" role="status">Dein Passwort wurde geändert. Bitte melde dich mit dem neuen Passwort an.</p>` : ""}<button type="button" class="auth-help" data-open-auth="forgot">Passwort vergessen?</button><button type="button" class="auth-help" data-open-auth="resend">Bestätigungsmail fehlt?</button><em>${register ? "Nach der Registrierung richtest du deinen Haushalt inklusiv ein. Private Fotos werden nicht benötigt." : "Deine Daten werden zwischen deinen Geräten synchronisiert und bleiben offline verfügbar."}</em></section></div>`;
  }
  if (state.ui.modal === "forgot") {
    return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal>×</button><small>SICHERES REDSCORE-KONTO</small><h2>Passwort vergessen?</h2><p>Wir helfen dir, wieder Zugang zu deinem Konto zu erhalten. Fordere einen sicheren Rücksetz-Link per E-Mail an.</p><form data-password-request-form><label><span>E-Mail</span><input name="email" type="email" maxlength="254" autocomplete="email" value="${esc(authEmailDraft)}" required></label><button class="green full" data-recovery-submit ${accountBusy || resendSeconds() ? "disabled" : ""}>${accountBusy ? "Bitte warten …" : resendSeconds() ? `Erneut anfordern in ${resendSeconds()} Sek.` : "Rücksetz-Link anfordern →"}</button></form>${passwordResetRequested ? `<p class="auth-notice" role="status">Falls für diese Adresse ein Konto vorliegt, erhältst du einen RedScore-Rücksetz-Link. Bitte prüfe auch den Spamordner.</p>` : ""}<p class="auth-mail-hint">Öffne den neuesten Link aus deiner E-Mail. Gib dein Passwort niemals per E-Mail weiter.</p><button type="button" class="auth-help" data-open-auth="login">Zurück zum Einloggen</button></section></div>`;
  }
  if (state.ui.modal === "reset-password") {
    const ready = recoveryStatus === "ready";
    return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal ${accountBusy ? "disabled" : ""}>×</button><small>SICHERES REDSCORE-KONTO</small><h2>Neues Passwort festlegen</h2>${ready ? `<p>Wähle ein neues Passwort mit 8 bis 128 Zeichen. Verwende ein Passwort, das du nicht für andere Dienste nutzt.</p><form data-password-update-form><label><span>Neues Passwort</span><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><label><span>Neues Passwort wiederholen</span><input name="passwordRepeat" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><button class="green full" ${accountBusy ? "disabled" : ""}>${accountBusy ? "Bitte warten …" : "Neues Passwort speichern →"}</button></form>` : recoveryStatus === "checking" ? `<p role="status">Rücksetz-Link wird geprüft …</p>` : recoveryStatus === "unavailable" ? `<p class="auth-notice" role="status">Der Link kann gerade nicht geprüft werden. Prüfe deine Internetverbindung und versuche es erneut.</p><button class="green full" data-recovery-retry>Erneut prüfen</button>` : `<p class="auth-notice" role="alert">${RECOVERY_ERROR}</p><button class="green full" data-open-auth="forgot">Neuen Rücksetz-Link anfordern</button>`}<button type="button" class="auth-help" data-open-auth="login" ${accountBusy ? "disabled" : ""}>Zurück zum Einloggen</button></section></div>`;
  }
  if (state.ui.modal === "resend") {
    return `<div class="modal-backdrop"><section class="modal login-modal"><button class="modal-close" data-close-modal>×</button>${icon("profile","modal-icon")}<small>SICHERES REDSCORE-KONTO</small><h2>Bestätigungsmail fehlt?</h2><p>Fordere eine neue Bestätigung für deine Registrierung an. Du benötigst dafür kein Passwort.</p><form data-resend-form><label><span>E-Mail</span><input name="email" type="email" autocomplete="email" value="${esc(authEmailDraft)}" maxlength="254" required></label><button class="green full" data-resend-submit ${accountBusy || resendSeconds() ? "disabled" : ""}>${accountBusy ? "Bitte warten …" : resendSeconds() ? `Erneut anfordern in ${resendSeconds()} Sek.` : "Bestätigungsmail anfordern →"}</button></form>${confirmationRequested ? `<p class="auth-notice" role="status">Falls für diese Adresse eine unbestätigte Registrierung vorliegt, erhältst du eine RedScore-Bestätigungsmail. Bitte prüfe auch den Spamordner. Bereits bestätigt? Du kannst dich direkt einloggen.</p>` : ""}<p class="auth-mail-hint">Achte auf den Absender RedScore mit administration@redscore.de. Die Bestätigung erfolgt ausschließlich über den Link in der E-Mail.</p><button type="button" class="auth-help" data-open-auth="login">Zurück zum Einloggen</button></section></div>`;
  }
  if (state.ui.modal === "onboarding") {
    const adults = state.household.adults?.length || 1;
    const petAmount = type => state.household.pets?.find(pet => pet.type === type)?.count || 0;
    return `<div class="modal-backdrop"><section class="modal onboarding-modal"><small>ERSTEINRICHTUNG · DEIN HAUSHALT</small><h2>Damit RedScore wirklich zu euch passt</h2><p>Wir fragen nur die Angaben ab, die Mengen, Aufgaben und das passende Haushaltsmotiv beeinflussen. Beziehungsstatus oder sexuelle Orientierung werden nicht erfasst.</p><form data-onboarding-form><div class="onboarding-grid"><label><span>Dein Anzeigename</span><input name="displayName" value="${esc(state.profile.name)}" maxlength="80" autocomplete="name" required></label><label><span>Erwachsene Personen</span><input name="adultCount" type="number" min="1" max="8" value="${adults}" required></label><div class="adult-identities" data-adult-identities>${Array.from({ length: 8 }, (_, index) => `<label class="adult-identity" data-adult-index="${index}" ${index >= adults ? "hidden" : ""}><span>Person ${index + 1} – freiwillige Selbstbezeichnung</span><select name="adultGender${index}" ${index < adults ? "required" : ""}><option value="unspecified">Keine Angabe</option><option value="woman" ${state.household.adults?.[index]?.gender === "woman" ? "selected" : ""}>Frau</option><option value="man" ${state.household.adults?.[index]?.gender === "man" ? "selected" : ""}>Mann</option><option value="diverse" ${state.household.adults?.[index]?.gender === "diverse" ? "selected" : ""}>Divers / nichtbinär</option></select></label>`).join("")}</div><label><span>Kinder im Haushalt</span><input name="children" type="number" min="0" max="12" value="${state.household.children || 0}" required></label>${childIdentityFields()}<fieldset class="pet-fields"><legend>Haustiere – Anzahl je Art</legend>${[["dog","Hunde"],["cat","Katzen"],["bird","Vögel"],["small_animal","Kleintiere"],["fish","Fische / Aquarien"],["reptile","Reptilien"],["other","Andere Tiere"]].map(([type,label]) => `<label><span>${label}</span><input name="pet_${type}" type="number" min="0" max="20" value="${petAmount(type)}"></label>`).join("")}</fieldset><label><span>Postleitzahl</span><input name="postalCode" inputmode="numeric" pattern="[0-9]{5}" value="${esc(state.household.postalCode)}" required></label><label><span>Ort</span><input name="city" value="${esc(state.household.city)}" maxlength="80" required></label><label><span>Bundesland</span><input name="state" value="${esc(state.household.state)}" maxlength="80" required></label><label><span>Landkreis / Region (optional)</span><input name="district" value="${esc(state.household.district)}" maxlength="100"></label></div><button class="green full">Haushalt speichern und starten →</button></form></section></div>`;
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
    return `<div class="modal-backdrop"><section class="modal supply-modal custom-supply-modal"><button class="modal-close" data-close-modal>×</button>${icon(customSupplyIcon(selectedCategory),"modal-icon")}<small>PERSÖNLICHER VORRAT</small><h2>${item ? "Eigenen Eintrag bearbeiten" : "Eigenen Vorrat hinzufügen"}</h2><p>Ergänze Dinge, die für deinen Haushalt wichtig sind, mit ihrer tatsächlichen Menge.</p><form data-custom-supply-form="${item ? esc(item.id) : "new"}"><label><span>Bezeichnung</span><input name="label" value="${esc(item?.label || "")}" maxlength="80" placeholder="z. B. Babynahrung" required></label><label><span>Kategorie</span><select name="category" required>${customSupplyCategories.map(category => `<option value="${category}" ${category === selectedCategory ? "selected" : ""}>${category}</option>`).join("")}</select></label><div class="custom-supply-quantity"><label><span>Menge</span><input name="quantity" type="text" maxlength="20" inputmode="decimal" aria-describedby="quantity-input-hint" value="${item ? esc(item.quantity) : ""}" placeholder="0" required></label><label><span>Einheit</span><input name="unit" list="supply-unit-options" value="${esc(item?.unit || "Stück")}" maxlength="30" placeholder="Stück" required><datalist id="supply-unit-options"><option value="Stück"><option value="Liter"><option value="kg"><option value="g"><option value="Packungen"><option value="Dosen"><option value="Flaschen"><option value="Tage"><option value="Sets"></datalist></label></div><small id="quantity-input-hint" class="quantity-input-hint">Komma oder Punkt als Dezimaltrennzeichen, keine Tausendertrennzeichen. Maximal 999999.</small><label><span>Notiz (optional)</span><input name="note" value="${esc(item?.note || "")}" maxlength="160" placeholder="z. B. kühl und trocken lagern"></label><button class="green full">Eintrag speichern</button>${item ? `<button class="delete-custom-supply" type="button" data-delete-custom-supply="${esc(item.id)}">Eintrag löschen</button>` : ""}</form><em>Eigene Einträge werden offline gespeichert und mit deinem Konto synchronisiert. Sie verändern den RedScore nicht.</em></section></div>`;
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
  const oldDialog = app.querySelector(".modal");
  const active = document.activeElement;
  const sameDialog = oldDialog && renderedModal === state.ui.modal && renderedModalLanguage === getLanguage();
  if (formError?.modal !== state.ui.modal) formError = null;
  const fields = sameDialog ? [...oldDialog.querySelectorAll("input,select,textarea")].filter(field=>field.name).map(field => ({ name: field.name, value: field.value, checked: field.checked })) : [];
  const oldScroll = oldDialog?.scrollTop || 0;
  const focusName = sameDialog && oldDialog.contains(active) ? active.name : null;
  const focusAttributes = active && app.contains(active) ? [...active.attributes].filter(attribute => attribute.name.startsWith("data-")).map(attribute => [attribute.name, attribute.value]) : [];
  if (!renderedModal && state.ui.modal && active && app.contains(active)) modalReturnFocus = focusAttributes;
  if (hashRoute() === "angebote") renderOffers();
  else if (!state.authenticated) renderPublic();
  else {
    const route = hashRoute();
    ({ home: renderHome, plan: renderPlan, packliste: renderPacklist, supplies: renderSupplies, map: renderMap, warnschutz: renderWarnschutz, knowledge: renderKnowledge, profile: renderProfile }[route] || renderHome)();
  }
  const dialog = app.querySelector(".modal");
  if (dialog) {
    dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.tabIndex = -1;
    const title = dialog.querySelector("h2");
    if (title) { if(!title.id)title.id = "dialog-title"; dialog.setAttribute("aria-labelledby", title.id); }
    dialog.querySelector(".modal-close")?.setAttribute("aria-label", "Schließen");
    if (state.ui.modal === "onboarding" && state.profile.onboardingCompleted) {
      const close = document.createElement("button"); close.className = "modal-close"; close.dataset.closeModal = ""; close.setAttribute("aria-label", "Schließen"); close.textContent = "×"; dialog.prepend(close);
    }
    for (const field of fields) {
      const element = [...dialog.querySelectorAll("input,select,textarea")].find(input => input.name === field.name);
      if (element) { element.value = field.value; if (["checkbox", "radio"].includes(element.type)) element.checked = field.checked; }
    }
    if (sameDialog) dialog.scrollTop = oldScroll;
    if (state.ui.modal === "onboarding") {
      updateAdultIdentities(dialog.querySelector("form"));
      updateChildIdentities(dialog.querySelector("form"));
    }
    const waterForm = dialog.querySelector('form[data-supply-form="water"]');
    if (waterForm) updateWaterMode(waterForm);
    const dialogForm = dialog.querySelector("form");
    if (dialogForm) {
      const feedback = document.createElement("p");
      feedback.id = "dialog-form-error"; feedback.className = "form-error"; feedback.dataset.formError = "";
      feedback.setAttribute("role", "alert"); feedback.tabIndex = -1; feedback.hidden = true;
      dialogForm.prepend(feedback);
    }
  }
  app.querySelector(".public-page,.logged-page")?.toggleAttribute("inert", Boolean(dialog));
  document.body.classList.toggle("modal-open", Boolean(dialog));
  applyLanguage(app);
  updateFormFeedback(dialog?.querySelector("form"));
  updateSyncStatus();
  const findControl = attributes => [...app.querySelectorAll("button,a,input,select,textarea")].find(element => attributes.length && attributes.every(([name,value]) => element.getAttribute(name) === value));
  let nextFocus = focusName ? [...(dialog?.querySelectorAll("input,select,textarea") || [])].find(input => input.name === focusName) : findControl(focusAttributes);
  if (dialog && !sameDialog) nextFocus = dialog.querySelector("input:not([type=hidden]),select,button") || dialog;
  if (!dialog && renderedModal) { nextFocus = findControl(modalReturnFocus || []); modalReturnFocus = null; }
  nextFocus?.focus({ preventScroll: true });
  renderedModal = state.ui.modal; renderedModalLanguage = getLanguage();
}

async function requestWarnings(force = false) {
  if (!state.authenticated || warningRequested) return;
  const key = `${mapLocationKey()}|${state.household.district}|${getLanguage()}`;
  if (!force && warningState.key === key && Date.now() - (warningState.attemptedAt || 0) < LIVE_REFRESH_MS) return;
  if (!navigator.onLine) { warningState.status = "fallback"; return; }
  warningRequested = true;
  warningState.key = key;
  warningState.attemptedAt = Date.now();
  const params = new URLSearchParams({ scope: "germany", filter: "weather", limit: "30", country: "Deutschland", language: getLanguage(), region: state.household.state || "", district: state.household.district || "" });
  try {
    const response = await fetch(`/api/live-lage?${params}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("Warnings unavailable");
    const payload = await response.json();
    if (key !== `${mapLocationKey()}|${state.household.district}|${getLanguage()}`) return;
    const regionTerms = [state.household.city, state.household.district].filter(Boolean).map(value => value.replace(/^Landkreis\s+/i, "").toLowerCase());
    if (!regionTerms.length && state.household.state) regionTerms.push(state.household.state.toLowerCase());
    const matchesRegion = event => regionTerms.some(term => [event.region,event.city,...(event.affected_regions || [])].join(" ").toLowerCase().includes(term));
    const warnings = (Array.isArray(payload.events) ? payload.events : []).filter(event => event.verification_status === "official" && matchesRegion(event));
    const weatherSource = (Array.isArray(payload.sources) ? payload.sources : []).find(source => /Wetterdienst|\bDWD\b|German Weather Service/i.test(source.name || ""));
    const sourceSyncAt = weatherSource?.last_successful_fetch;
    const sourceAge = Date.now() - Date.parse(sourceSyncAt || "");
    const fresh = Number.isFinite(sourceAge) && sourceAge >= -60_000 && sourceAge < 15 * 60_000 && !weatherSource.last_error;
    warningState = { status: fresh ? "ok" : "fallback", key, attemptedAt: Date.now(), checkedAt: sourceSyncAt || null, warnings: warnings.map(event => {
      const localReport = (Array.isArray(event.related_events) ? event.related_events : []).find(matchesRegion);
      const localRegion = (Array.isArray(event.affected_regions) ? event.affected_regions : []).find(region => regionTerms.some(term => String(region).toLowerCase().includes(term)));
      return { headline: localReport?.title || event.title, regionName: localReport?.region || localReport?.city || localRegion || event.region || event.city || state.household.state };
    }) };
  } catch { warningState = { ...warningState, status: warningState.checkedAt ? "fallback" : "error", key }; }
  finally {
    warningRequested = false;
    if (state.authenticated && ["home", "warnschutz"].includes(hashRoute())) render();
  }
}

app.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) {
    if (state.ui.modal === "reset-password" && event.target.classList.contains("modal-backdrop")) {
      if (accountBusy) return;
      clearRecoveryContext(); state.ui.modal = "login"; return render();
    }
    if (event.target.classList.contains("modal-backdrop") && !(state.ui.modal === "onboarding" && !state.profile.onboardingCompleted)) { state.ui.modal = null; render(); }
    return;
  }
  if (button.hasAttribute("data-language-toggle")) { languageMenuOpen = !languageMenuOpen; return render(); }
  if(button.hasAttribute('data-open-supply-twin') && state.authenticated){state.ui.modal='supply-twin';return render();}
  if(button.dataset.twinScenario){supplyTwinPlan.scenario=button.dataset.twinScenario==='no-cook'?'no-cook':'shopping';return refreshSupplyTwin();}
  if(button.dataset.twinTarget){const target=Number(button.dataset.twinTarget);if([3,7,10].includes(target)){supplyTwinPlan.target=target;supplyTwinPlan.hour=Math.min(supplyTwinPlan.hour,target*24);}return refreshSupplyTwin();}
  if(button.dataset.twinAction){
    const model=supplyTwinModel(supplyTwinSnapshot(),supplyTwinPlan);
    if(button.dataset.twinAction==='reset')supplyTwinPlan=newSupplyTwinPlan();
    else if(model.complete){
      if(button.dataset.twinAction==='water')supplyTwinPlan.water=Math.min(1000,supplyTwinPlan.water+6);
      if(button.dataset.twinAction==='food')supplyTwinPlan.food=Math.min(100,supplyTwinPlan.food+1);
      if(button.dataset.twinAction==='balance'){supplyTwinPlan.water=model.toGoal.water;supplyTwinPlan.food=model.toGoal.food;}
    }
    return refreshSupplyTwin();
  }
  if (button.hasAttribute("data-offer-discover")) { document.querySelector("#offers-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (button.dataset.scroll) {
    const target = button.dataset.scroll;
    if (hashRoute() === "angebote") { history.pushState(null, "", "#/public"); render(); }
    document.querySelector(`#${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (button.dataset.offerCategory) { offersView.category = button.dataset.offerCategory; offersView.mode = button.dataset.offerCategory === "regional" ? "local" : "all"; render(); document.querySelector("#offers-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (button.dataset.offerMode) { offersView.mode = button.dataset.offerMode; if (offersView.mode === "online" && offersView.category === "regional") offersView.category = "all"; return render(); }
  if (button.hasAttribute("data-offer-reset")) { offersView.category = "all"; offersView.mode = "all"; offersView.query = ""; offersView.sort = "recommended"; return render(); }
  if(button.hasAttribute("data-offer-clear-query")){offersView.query="";return render();}
  if (button.dataset.scoreLabStep) {
    updateScoreLab(button.dataset.scoreLabStep);
    state.ui.modal = `scorelab:${button.dataset.scoreLabStep}`;
    return render();
  }
  if (button.hasAttribute("data-score-lab-reset")) return updateScoreLab(null, true);
  if (button.hasAttribute("data-lab-model")) {
    const model = app.querySelector("#score-lab-model");
    if (model) {
      model.open = true;
      model.scrollIntoView({ behavior: "smooth", block: "center" });
      model.querySelector("summary")?.focus({ preventScroll: true });
    }
    return;
  }
  if (button.hasAttribute("data-clear-pack-search")) { state.ui.packSearch = ""; state.ui.packFilter = "Alle"; save(); return render(); }
  if (button.matches("[data-sync-retry]")) { if (syncStatus === "expired") { state.ui.modal = "login"; return render(); } return retryStorageAndSync().catch(() => toast("Kontosynchronisierung fehlgeschlagen. Bitte Speicherstatus beachten.")); }
  if (button.matches("[data-clear-knowledge-search]")) { state.ui.knowledgeSearch = ""; return render(); }
  if (button.matches("[data-install-app]")) {
    if (!deferredInstallPrompt) { state.ui.modal = null; return render(); }
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    try { await prompt.prompt(); await prompt.userChoice; } catch { /* the browser may cancel the native prompt */ }
    dismissInstallPrompt();
    state.ui.modal = null;
    return render();
  }
  if (button.matches("[data-install-dismiss]")) {
    dismissInstallPrompt();
    state.ui.modal = null;
    return render();
  }
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
  if (button.matches("[data-share-redscore]")) return shareRedScore();
  if (button.dataset.legal) { state.ui.modal = `legal:${button.dataset.legal}`; return render(); }
  if (button.dataset.route) return navigate(button.dataset.route);
  if (button.dataset.packFilter) { state.ui.packFilter = button.dataset.packFilter; save(); return render(); }
  if (button.dataset.packItem) { state.packlist[button.dataset.packItem] = !state.packlist[button.dataset.packItem]; save(); toast(state.packlist[button.dataset.packItem] ? "Für den Notfallrucksack abgehakt." : "Eintrag wieder geöffnet."); return render(); }
  if (button.dataset.supplySuggestion) {
    const input = button.closest("form")?.querySelector('input[name="value"]');
    if (input) { input.value = button.dataset.supplySuggestion; input.focus(); }
    return;
  }
  if (button.dataset.liveScope || button.dataset.liveFilter) {
    if (!navigator.onLine) return toast("Filterwechsel benötigt eine Internetverbindung. Gespeicherte Meldungen bleiben sichtbar.");
    if (button.dataset.liveScope) liveState.scope = button.dataset.liveScope;
    if (button.dataset.liveFilter) liveState.filter = button.dataset.liveFilter;
    liveState.events = []; liveState.status = "loading"; liveState.receivedAt = null; render(); return requestLiveLage(true);
  }
  if (button.matches("[data-live-refresh]")) return requestLiveLage(true);
  if (button.dataset.liveDetail) { state.ui.modal = `live:${button.dataset.liveDetail}`; return render(); }
  if (button.dataset.openAuth) {
    if (accountBusy) return;
    if (state.ui.modal === "reset-password") clearRecoveryContext();
    const email = app.querySelector('.modal input[name="email"]');
    if (email) authEmailDraft = email.value;
    state.ui.modal = button.dataset.openAuth;
    return render();
  }
  if (button.matches("[data-edit-household]")) { state.ui.modal = "onboarding"; return render(); }
  if (button.matches("[data-logout]")) {
    if (state.sync.pending && !globalThis.confirm(translateText("Es gibt noch nicht synchronisierte Änderungen auf diesem Gerät. Beim Abmelden werden sie entfernt. Trotzdem abmelden?"))) return;
    clearTimeout(syncTimer); clearTimeout(liveRefreshTimer);
    try { if (session?.access_token) await accountRequest("sign_out"); } catch { /* local logout still succeeds */ }
    persistSession(null); state = clone(defaultState); syncStatus = "saved"; localSaveFailed = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch { toast("Lokale Kontodaten konnten nicht entfernt werden. Bitte Browserspeicher prüfen."); }
    location.hash = ""; return render();
  }
  if (button.matches("[data-recovery-retry]")) { if (recoveryStatus === "checking") return; const checking = validateRecoveryContext(); render(); await checking; return render(); }
  if (button.matches("[data-close-modal]") || event.target.classList.contains("modal-backdrop")) { if (state.ui.modal === "onboarding" && !state.profile.onboardingCompleted) return; if (state.ui.modal === "reset-password") { if (accountBusy) return; clearRecoveryContext(); state.ui.modal = "login"; } else state.ui.modal = null; return render(); }
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
  if (button.hasAttribute("data-map-center")) { mapRouteState = { status: "idle", placeId: null, route: null, error: null }; render(); document.querySelector(".map-canvas")?.scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
  if (button.dataset.mapRoute) return requestPlaceRoute(button.dataset.mapRoute);
  if (button.matches("[data-map-route-close]")) { mapRouteState = { status: "idle", placeId: null, route: null, error: null }; return render(); }
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
  if(form.matches('[data-offer-search]')){offersView.query=String(new FormData(form).get('offerQuery')||'').trim().slice(0,120);return render();}
  if (form.matches("[data-offers-location]")) {
    if (state.authenticated) return;
    const input = new FormData(form);
    const postalCode = String(input.get("offerPostcode") || "").trim();
    const city = String(input.get("offerCity") || "").trim();
    if (!/^\d{5}$/.test(postalCode) || !city || city.length > 80) { offersView.error = offerText("Bitte eine deutsche Postleitzahl und einen Ort eingeben.", "Please enter a German postcode and town."); return render(); }
    offersView.location = { postalCode, city, country: "DE" };
    offersView.mode = "local"; offersView.error = "";
    return render();
  }
  formError = null;
  updateFormFeedback(form);
  if (form.matches("[data-password-update-form]")) {
    if (accountBusy) return;
    if (!recoveryContext || recoveryContext.expiresAt <= Date.now() || recoveryStatus !== "ready") { clearRecoveryContext(); recoveryStatus = "invalid"; return render(); }
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    if (password.length < 8 || password.length > 128) return reportFormError(form, "password", "Bitte ein neues Passwort mit 8 bis 128 Zeichen eingeben.");
    if (password !== formData.get("passwordRepeat")) return reportFormError(form, "passwordRepeat", "Die beiden Passwörter stimmen nicht überein.");
    if (!navigator.onLine) return reportFormError(form, null, "Du bist offline. Zum Ändern des Passworts brauchst du eine Internetverbindung.");
    const accessToken = recoveryContext.accessToken;
    accountBusy = true; render();
    try {
      await accountRequest("update_password", { password }, accessToken);
      clearRecoveryContext(); passwordResetCompleted = true; state.ui.modal = "login";
    } catch (error) {
      if ([401,403].includes(error.status)) { clearRecoveryContext(); recoveryStatus = "invalid"; }
      else reportFormError(app.querySelector("[data-password-update-form]"), null, error instanceof Error ? error.message : "Das Passwort konnte nicht geändert werden.");
    } finally { accountBusy = false; render(); }
    return;
  }
  if (form.matches("[data-resend-form]") || form.matches("[data-password-request-form]")) {
    if (accountBusy || resendSeconds()) return;
    const reset = form.matches("[data-password-request-form]");
    authEmailDraft = String(new FormData(form).get("email") || "").trim();
    if (!navigator.onLine) return reportFormError(form, null, "Du bist offline. Zum Anfordern der Bestätigung brauchst du eine Internetverbindung.");
    if (reset) passwordResetRequested = false; else confirmationRequested = false;
    accountBusy = true;
    resendCooldownUntil = Date.now() + 60_000;
    render();
    try {
      await accountRequest(reset ? "request_password_reset" : "resend_confirmation", { email: authEmailDraft }, "");
      if (reset) passwordResetRequested = true; else confirmationRequested = true;
    } catch (error) {
      reportFormError(app.querySelector(reset ? "[data-password-request-form]" : "[data-resend-form]"), null, error instanceof Error ? error.message : "Die Bestätigung kann gerade nicht angefordert werden. Bitte versuche es später erneut.");
    } finally { accountBusy = false; render(); }
    return;
  }
  if (form.dataset.authForm) {
    if (accountBusy) return;
    const formData = new FormData(form);
    authEmailDraft = String(formData.get("email") || "").trim();
    accountBusy = true; render();
    try {
      const result = await accountRequest(form.dataset.authForm === "register" ? "sign_up" : "sign_in", { email: formData.get("email"), password: formData.get("password"), displayName: formData.get("displayName") });
      if (result.confirmationRequired) { state.ui.modal = "resend"; confirmationRequested = true; resendCooldownUntil = Date.now() + 60_000; return render(); }
      persistSession(result.session);
      await loadAccount();
      state.ui.modal = state.profile.onboardingCompleted ? null : "onboarding";
      location.hash = "#/home"; render();
    } catch (error) { reportFormError(app.querySelector(".modal form"), null, error instanceof Error ? error.message : "Anmeldung nicht möglich."); }
    finally { accountBusy = false; render(); }
    return;
  }
  if (form.matches("[data-onboarding-form]")) {
    const formData = new FormData(form);
    const adultCount = clamp(Math.floor(Number(formData.get("adultCount"))) || 1, 1, 8);
    const adults = Array.from({ length: adultCount }, (_, index) => ({ gender: String(formData.get(`adultGender${index}`) || "unspecified") }));
    const petTypes = ["dog", "cat", "bird", "small_animal", "fish", "reptile", "other"];
    const pets = petTypes.map(type => ({ type, count: clamp(Math.floor(Number(formData.get(`pet_${type}`))) || 0, 0, 20), label: "" })).filter(pet => pet.count > 0);
    const children = clamp(Math.floor(Number(formData.get("children"))) || 0, 0, 12);
    const childDetails = normalizeChildDetails(children, Array.from({ length: children }, (_, index) => ({ gender: String(formData.get(`childGender${index}`) || "unspecified") })));
    const missingChild = childDetails.findIndex(child => !["girl", "boy"].includes(child.gender));
    if (missingChild !== -1) return reportFormError(form, `childGender${missingChild}`, "Bitte für jedes Kind weiblich oder männlich auswählen.");
    state.profile.name = String(formData.get("displayName") || "").trim();
    state.profile.initials = initials(state.profile.name);
    state.profile.onboardingCompleted = true;
    state.profile.selectedScene = chooseScene(adults, children, childDetails);
    state.household = {
      adults, children, childDetails, pets, postalCode: String(formData.get("postalCode") || "").trim(), city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim(), district: String(formData.get("district") || "").trim(),
      location: `${String(formData.get("postalCode") || "").trim()} ${String(formData.get("city") || "").trim()}`.trim(),
    };
    warningState = { status: "loading", warnings: [], checkedAt: null };
    mapRouteState = { status: "idle", placeId: null, route: null, error: null };
    state.ui.modal = null; save();
    try { await syncAccount(); toast("Haushalt gespeichert. Empfehlungen und Motiv wurden angepasst."); }
    catch { toast("Lokal gespeichert. Die Kontosynchronisierung wird bei Verbindung nachgeholt."); }
    return render();
  }
  if (form.dataset.supplyForm) {
    const group = supplyGroups.find(item => item.id === form.dataset.supplyForm);
    if (!group) return;
    const formData = new FormData(form);
    const direct = formData.get("quantityMode") === "liters";
    const field = group.inputMode === "packages" ? direct ? "liters" : "containerCount" : "value";
    const count = parseQuantity(formData.get("containerCount"), 200, true);
    const size = Number(formData.get("containerSize"));
    const value = group.inputMode === "packages"
      ? direct ? parseQuantity(formData.get("liters"), group.max) : group.packageSizes.includes(size) ? count * size : NaN
      : parseQuantity(formData.get("value"), group.max || 1, group.inputMode === "days");
    if (!Number.isFinite(value) || value > (group.max || 1)) return reportFormError(form, field, group.inputMode === "days" || (group.inputMode === "packages" && !direct) ? "Bitte eine ganze Zahl innerhalb des angegebenen Bereichs eingeben." : "Bitte eine gültige Menge innerhalb des angegebenen Bereichs eingeben.");
    if (group.inputMode === "level" && ![0, 0.5, 1].includes(value)) return reportFormError(form, "value", "Bitte einen Ausstattungsstand auswählen.");
    state.supplies[form.dataset.supplyForm] = value;
    if (group.inputMode === "packages") state.supplyDetails[group.id] = formData.get("quantityMode") === "liters" ? { mode: "liters" } : { mode: "packages", containerCount: Number(formData.get("containerCount")), containerSize: Number(formData.get("containerSize")) };
    state.ui.modal = null; save(); toast("Tatsächlicher Bestand gespeichert."); return render();
  }
  if (form.dataset.customSupplyForm) {
    const formData = new FormData(form);
    const label = String(formData.get("label") || "").trim().slice(0, 80);
    const categoryValue = String(formData.get("category") || "");
    const category = customSupplyCategories.includes(categoryValue) ? categoryValue : "Sonstiges";
    const quantity = parseQuantity(formData.get("quantity"), 999999);
    const unit = String(formData.get("unit") || "").trim().slice(0, 30);
    const note = String(formData.get("note") || "").trim().slice(0, 160);
    if (!label || !unit) return reportFormError(form, !label ? "label" : "unit", "Bitte Bezeichnung und Einheit vollständig angeben.");
    if (!Number.isFinite(quantity)) return reportFormError(form, "quantity", "Bitte eine Menge von 0 bis 999999 eingeben, z. B. 1,5. Keine Tausendertrennzeichen verwenden.");
    const items = normalizeCustomSupplies(state.customSupplies);
    const existingIndex = items.findIndex(item => item.id === form.dataset.customSupplyForm);
    if (existingIndex < 0 && items.length >= 100) return reportFormError(form, null, "Du kannst bis zu 100 eigene Vorräte speichern.");
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
  if(event.target.dataset.twinField){setSupplyTwinField(event.target.dataset.twinField,event.target.value);return;}
  if (formError && event.target.name === formError.field) { formError = null; updateFormFeedback(event.target.closest("form")); }
  if (event.target.matches('input[name="adultCount"]')) {
    updateAdultIdentities(event.target.closest("form"));
  }
  if (event.target.matches('input[name="children"]')) {
    updateChildIdentities(event.target.closest("form"));
  }
  const form = event.target.closest('form[data-supply-form="water"]');
  if (!form) return;
  const count = parseQuantity(form.elements.containerCount?.value, 200, true);
  const size = Number(form.elements.containerSize?.value);
  const output = form.querySelector("[data-supply-total]");
  const raw = form.elements.quantityMode?.value === "liters" ? form.elements.liters?.value : form.elements.containerCount?.value;
  const total = form.elements.quantityMode?.value === "liters" ? parseQuantity(raw, 1000) : count * size;
  if (output) output.textContent = translateText(raw !== "" && Number.isFinite(total) ? `Gesamt: ${fmt(total)} Liter` : "Gesamtmenge wird beim Speichern berechnet");
});

function updateWaterMode(form) {
  const direct = form.elements.quantityMode.value === "liters";
  form.querySelector("[data-water-packages]").hidden = direct; form.querySelector("[data-water-liters]").hidden = !direct;
  form.elements.containerCount.disabled = direct; form.elements.containerCount.required = !direct; form.elements.containerSize.disabled = direct;
  form.elements.liters.disabled = !direct; form.elements.liters.required = direct;
}
app.addEventListener("change", event => {
  if(event.target.hasAttribute('data-offer-sort')){offersView.sort=event.target.value==='provider'?'provider':'recommended';return render();}
  if(event.target.dataset.twinField){setSupplyTwinField(event.target.dataset.twinField,event.target.value);return;}
  if (event.target.matches('select[name="quantityMode"]')) {
    updateWaterMode(event.target.closest("form"));
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (event.target.matches('select[name="containerSize"]')) event.target.dispatchEvent(new Event("input", { bubbles: true }));
});

window.addEventListener("hashchange", render);
window.addEventListener("beforeunload", event => {
  if (localSaveFailed && state.sync.pending) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("offline", () => { liveState.status = "offline"; warningState.status = "fallback"; updateSyncStatus("offline"); placesState.status = placesState.places.length ? "offline" : "error"; if (state.authenticated || hashRoute() === "angebote") render(); });
window.addEventListener("online", () => { if (hashRoute() === "angebote") render(); if (state.authenticated) { updateSyncStatus(state.sync.pending ? "pending" : "saved"); requestLiveLage(true); requestWarnings(true); if (hashRoute() === "map") requestNearbyPlaces(true); syncAccount().catch(() => {}); } });
document.addEventListener("visibilitychange", () => { if (!document.hidden && state.authenticated) { requestLiveLage(); requestWarnings(); if (state.sync.pending) syncAccount().catch(() => {}); } });
document.addEventListener("keydown", event => {
  const dialog = app.querySelector(".modal");
  if (event.key === "Escape") {
    if (languageMenuOpen) { languageMenuOpen = false; render(); return; }
    if (!dialog || (state.ui.modal === "onboarding" && !state.profile.onboardingCompleted)) return;
    if (state.ui.modal === "reset-password") { if (accountBusy) return; clearRecoveryContext(); state.ui.modal = "login"; } else state.ui.modal = null; render(); return;
  }
  if (event.key !== "Tab" || !dialog) return;
  const controls = [...dialog.querySelectorAll("button,a[href],input,select,textarea,[tabindex='0']")].filter(element => !element.disabled && !element.hidden && element.getClientRects().length);
  if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
});
liveClockTimer = setInterval(() => { updateLiveClock(); updateResendClock(); }, 1000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
async function initialize() {
  const authRedirect = consumeAuthRedirect();
  if (authRedirect.recovery || recoveryContext) {
    state.authenticated = false;
    state.ui.modal = "reset-password";
    recoveryStatus = "checking";
    render();
    await validateRecoveryContext();
    render();
    return;
  }
  if (session) {
    try {
      if (!navigator.onLine && canResumeOffline()) { state.authenticated = true; updateSyncStatus("offline"); }
      else { await loadAccount(); if (!state.profile.onboardingCompleted) state.ui.modal = "onboarding"; }
    }
    catch (error) {
      if (canResumeOffline() && ![400,401,403].includes(error.status)) { state.authenticated = true; updateSyncStatus(navigator.onLine ? "error" : "offline"); }
      else { if ([400,401,403].includes(error.status)) persistSession(null); state.authenticated = false; }
    }
  }
  if (authRedirect.failed) state.ui.modal = "login";
  else if (authRedirect.confirmed && !state.authenticated) state.ui.modal = "login";
  else if (["impressum", "datenschutz"].includes(hashRoute())) state.ui.modal = hashRoute() === "impressum" ? "legal:imprint" : "legal:privacy";
  else if (hashRoute() === "register" && !state.authenticated) state.ui.modal = "register";
  else if (!state.authenticated && deferredInstallPrompt && !installPromptDismissed() && !isStandaloneApp()) state.ui.modal = "install";
  render();
  if (authRedirect.failed) toast("Der Bestätigungslink ist ungültig oder abgelaufen.");
  else if (authRedirect.confirmed) toast(state.authenticated ? "E-Mail bestätigt. Willkommen bei RedScore." : "E-Mail bestätigt. Du kannst dich jetzt anmelden.");
}
initialize();

if (navigator.modelContext?.registerTool) {
  navigator.modelContext.registerTool({ name: "get_redscore_status", description: "Returns the signed-in household's entered RedScore state without inventing data.", inputSchema: { type: "object", properties: {} }, execute: async () => ({ score: score(), supplies: state.supplies, completedTasks: Object.keys(state.taskStatus).filter(id => state.taskStatus[id]), household: state.household }) });
  navigator.modelContext.registerTool({ name: "open_redscore_assessment", description: "Opens the transparent RedScore assessment.", inputSchema: { type: "object", properties: {} }, execute: async () => { state.ui.modal = "assessment"; render(); return { opened: true }; } });
}
