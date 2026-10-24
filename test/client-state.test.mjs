import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import * as data from "../dist/data.js";

const source = (await readFile(new URL("../dist/app.js", import.meta.url), "utf8"))
  .replace(/^import .*;\r?$/gm, "").replace(/^initialize\(\);\r?$/m, "");

function client(options = {}) {
  const storage = new Map(Object.entries(options.storage || {}));
  const timers = new Map();
  const windowEvents = new Map();
  const appEvents = new Map();
  const syncText = { textContent: "" }, syncButton = { hidden: true, textContent: "" };
  const syncRegion = { dataset: {}, querySelector: selector => selector === "span" ? syncText : syncButton };
  const liveElements = Object.fromEntries(["#live-age", "[data-live-title]", "[data-live-dot]", "[data-live-note]"].map(key => [key, { textContent: "", className: "", hidden: false }]));
  const app = { innerHTML: "", addEventListener(type, handler) { appEvents.set(type, handler); }, querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; } };
  const context = vm.createContext({
    ...data, console, URLSearchParams, URL, AbortSignal, Response, Date, Math, Intl, JSON,
    navigator: { onLine: options.online !== false }, location: { search: "", hash: "#/profile" },
    history: { replaceState() {} },
    document: { hidden: false, activeElement: null, body: { className: "", classList: { toggle() {} } }, querySelector: selector => selector === "#app" ? app : selector === "[data-sync-status]" ? syncRegion : liveElements[selector] || null, addEventListener() {} },
    window: { addEventListener: (type, handler) => windowEvents.set(type, handler), matchMedia: () => ({ matches: false }) },
    localStorage: { getItem: key => { if (options.blockStorage) throw new Error("SecurityError"); return storage.get(key) || null; }, setItem: (key,value) => { if (options.blockStorage || options.failWrites) throw new Error("QuotaExceededError"); storage.set(key,value); }, removeItem: key => storage.delete(key) },
    setTimeout: (fn,delay) => { const id = Symbol(); timers.set(id,{ fn,delay }); return id; }, clearTimeout: id => timers.delete(id), setInterval: () => 0,
    getLanguage: () => "de", setLanguage() {}, applyLanguage() {}, translateText: value => value,
    fetch: options.fetch || (async () => { throw new Error("unexpected network access"); }),
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`state.authenticated=true; state.profile={...state.profile,id:'user-a',name:'QA',onboardingCompleted:true}; session={access_token:'test-access',refresh_token:'test-refresh',expires_at:4000000000,user:{id:'user-a'}};`);
  return { run, storage, timers, context, app, syncText, syncButton, syncRegion, liveElements, windowEvents, appEvents };
}

test("child controls offer only female and male, without inferring missing values", () => {
  const c = client();
  c.run("state.household.children=1; state.household.childDetails=[]");
  const html = c.run("childIdentityFields()");
  assert.match(html, /value="girl"[^>]*>Weiblich/);
  assert.match(html, /value="boy"[^>]*>Männlich/);
  assert.match(html, /value="" disabled selected>Bitte auswählen/);
  assert.doesNotMatch(html, /diverse|nichtbinär|Keine Angabe|value="unspecified"/);
  assert.match(html, /name="childGender0" required/);
  assert.match(html, /name="childGender1" disabled/);
});

test("changing the child count toggles required controls without losing selections", () => {
  const c = client();
  const group = { hidden: true };
  const selects = [{ value: "girl" }, { value: "boy" }, { value: "" }];
  const labels = selects.map(select => ({ hidden: false, querySelector: () => select }));
  const form = { elements: { children: { value: "2" } }, querySelector: () => group, querySelectorAll: () => labels };
  c.context.testForm = form;
  c.run("updateChildIdentities(testForm)");
  assert.equal(group.hidden, false);
  assert.equal(selects[0].required, true);
  assert.equal(selects[1].disabled, false);
  assert.equal(selects[2].disabled, true);
  form.elements.children.value = "0";
  c.run("updateChildIdentities(testForm)");
  assert.equal(group.hidden, true);
  assert.equal(selects[0].required, false);
  assert.equal(selects[0].value, "girl");
});

test("one-child images match the specified child for every supported adult composition", () => {
  const c = client();
  for (const [adults, prefix] of [
    [["woman"], "single-woman"], [["man"], "single-man"],
    [["woman", "man"], "family-woman-man"], [["woman", "woman"], "family-two-women"], [["man", "man"], "family-two-men"],
  ]) for (const gender of ["girl", "boy"]) {
    const people = adults.map(gender => ({ gender }));
    assert.equal(c.run(`chooseScene(${JSON.stringify(people)},1,[{gender:'${gender}'}])`), `${prefix}-${gender}`);
  }
});

test("unsupported or legacy households use a person-free image, not a guessed family", () => {
  const c = client();
  c.run("state.profile.selectedScene='family-woman-man';state.household={adults:[{gender:'woman'},{gender:'man'}],children:1,childDetails:[]}");
  assert.equal(c.run("selectedScene()"), "assets/dashboard-storm.png");
  assert.equal(c.run("chooseScene([{gender:'woman'},{gender:'man'}],2,[{gender:'boy'},{gender:'girl'}])"), "family-woman-man-boy-girl");
  for (const details of [[{gender:"girl"},{gender:"girl"}], [{gender:"boy"},{gender:"boy"}], [{gender:"girl"},{gender:"boy"},{gender:"girl"}]]) {
    assert.equal(c.run(`chooseScene([{gender:'woman'},{gender:'man'}],${details.length},${JSON.stringify(details)})`), "neutral-household");
  }
  assert.equal(c.run("chooseScene([{gender:'diverse'}],1,[{gender:'girl'}])"), "neutral-household");
});

test("child metadata is normalized and synchronized without names or dates of birth", async () => {
  let payload;
  const c = client({ fetch: async (_url, options) => { payload = JSON.parse(options.body); return Response.json({ok:true}); } });
  c.run("state.household.children=2; state.household.childDetails=[{gender:'girl',name:'not collected'},{gender:'invalid'}];save()");
  await c.run("syncAccount()");
  assert.deepEqual(payload.profile.children_details, [{gender:"girl"},{gender:"unspecified"}]);
  assert.equal(c.run("normalizeChildDetails(99,[]).length"), 12);
  assert.equal(c.run("normalizeChildDetails(-2,[]).length"), 0);
  c.run("state.assessment.completedAt='2026-10-24T12:00:00Z';state.assessment.answers=Object.fromEntries(relevantAssessmentQuestions().map(([id])=>[id,true]));state.supplies.water=10");
  c.run("state.household.childDetails=[{gender:'girl'}]");
  const originalScore = c.run("score()");
  assert.equal(typeof originalScore, "number");
  c.run("state.household.childDetails=[{gender:'boy'}]");
  assert.equal(c.run("score()"), originalScore);
});

test("every selected household image is an existing PNG asset", async () => {
  const c = client();
  for (const path of c.run("Object.values(householdScenes)")) {
    const bytes = await readFile(new URL(`../dist/${path}`, import.meta.url));
    assert.equal(bytes.subarray(1,4).toString(), "PNG", path);
    assert.ok(bytes.readUInt32BE(16) >= 1000, path);
  }
});

test("failed local storage never claims pending changes are saved, including offline", () => {
  const c = client({ failWrites: true, online: false });
  c.run("state.supplies.water=12.25; save()");
  assert.equal(c.run("state.supplies.water"), 12.25);
  assert.equal(c.run("state.sync.pending"), true);
  assert.equal(c.syncRegion.dataset.status, "storage-error");
  assert.match(c.syncText.textContent, /noch nicht dauerhaft gespeichert/);
  assert.equal(c.syncButton.hidden, false);
  assert.equal(c.storage.has("redscore-state-v1"), false);
});

test("cloud saving still works when offline storage is unavailable", async () => {
  const c = client({ failWrites: true, fetch: async () => Response.json({ ok: true }) });
  c.run("state.supplies.water=18; save()");
  await c.run("syncAccount()");
  assert.equal(c.run("state.sync.pending"), false);
  assert.match(c.syncText.textContent, /Im Konto gespeichert/);
  assert.match(c.syncText.textContent, /Offline-Speicherung.*nicht verfügbar/);
});

test("closing warns only when changes exist solely in memory", () => {
  const c = client({ failWrites: true });
  c.run("save()");
  let warned = false;
  c.windowEvents.get("beforeunload")({ preventDefault() { warned = true; } });
  assert.equal(warned, true);
  c.run("state.sync.pending=false");
  warned = false;
  c.windowEvents.get("beforeunload")({ preventDefault() { warned = true; } });
  assert.equal(warned, false);
});

test("retry restores durable offline saving after storage becomes available", async () => {
  const options = { failWrites: true, online: false };
  const c = client(options);
  c.run("state.supplies.water=23.75; save()");
  options.failWrites = false;
  await c.run("retryStorageAndSync()");
  assert.equal(c.run("localSaveFailed"), false);
  assert.equal(JSON.parse(c.storage.get("redscore-state-v1")).supplies.water, 23.75);
  assert.equal(c.syncRegion.dataset.status, "offline");
  assert.equal(c.syncButton.hidden, true);
});

test("blocked browser storage cannot interrupt installation prompt dismissal", () => {
  const c = client({ blockStorage: true });
  assert.equal(c.run("installPromptDismissed()"), false);
  c.run("dismissInstallPrompt()");
  assert.equal(c.run("installPromptDismissed()"), true);
});

test("loading with a connection is not presented as offline", () => {
  const c = client();
  c.run("liveState.status='loading'");
  assert.equal(c.run("livePresentation().title"), "LAGEABGLEICH");
  assert.doesNotMatch(c.run("liveLagePanel()"), />OFFLINE</);
  assert.match(c.run("liveLagePanel()"), /aria-pressed="true"/);
});

test("freshness expiry updates the title and stops the live pulse without rerendering", () => {
  const c = client();
  c.run("liveState.status='live'; liveState.receivedAt=new Date().toISOString(); liveState.lastSyncAt=new Date().toISOString(); updateLiveClock()");
  assert.equal(c.liveElements["[data-live-title]"].textContent, "LIVE-LAGE");
  c.run("liveState.lastSyncAt=new Date(Date.now()-11*60_000).toISOString(); updateLiveClock()");
  assert.equal(c.liveElements["[data-live-title]"].textContent, "NICHT AKTUELL");
  assert.equal(c.liveElements["[data-live-dot]"].className, "live-dot offline");
  assert.equal(c.liveElements["[data-live-note]"].hidden, false);
});

test("refreshing recent data remains live but a server error does not claim an internet outage", async () => {
  const c = client({ fetch: async () => Response.json({}, { status: 503 }) });
  c.run("liveState.status='refreshing'; liveState.receivedAt=new Date().toISOString(); liveState.lastSyncAt=new Date().toISOString(); liveState.events=[{id:'cached'}]");
  assert.equal(c.run("liveConnectionIsFresh()"), true);
  await c.run("requestLiveLage(true)");
  assert.equal(c.run("livePresentation().title"), "NICHT AKTUELL");
  assert.equal(c.run("liveState.events[0].id"), "cached");
  assert.equal(c.run("liveConnectionIsFresh()"), false);
});

test("missing or implausible source timestamps never produce a live indicator", () => {
  const c = client();
  c.run("liveState.status='live'; liveState.receivedAt=new Date().toISOString(); liveState.lastSyncAt=null");
  assert.equal(c.run("liveConnectionIsFresh()"), false);
  c.run("liveState.lastSyncAt='invalid'");
  assert.equal(c.run("liveConnectionIsFresh()"), false);
  c.run("liveState.lastSyncAt=new Date(Date.now()+60*60_000).toISOString()");
  assert.equal(c.run("liveConnectionIsFresh()"), false);
});

test("the age label shows the source sync age, not the most recent API request", () => {
  const c = client();
  c.run("liveState.status='live'; liveState.receivedAt=new Date().toISOString(); liveState.lastSyncAt=new Date(Date.now()-3*60_000).toISOString()");
  assert.match(c.run("livePresentation().age"), /vor 3 Min\./);
});

test("pending local supplies survive a cloud load for the same account", async () => {
  const c = client({ fetch: async () => Response.json({ user: { id: "user-a" }, profile: { display_name: "Cloud", onboarding_completed: true }, appState: { supplies: { water: 5 } } }) });
  c.run("state.supplies.water=42.75; state.sync.pending=true; state.sync.revision=3");
  await c.run("loadAccount()");
  assert.equal(c.run("state.supplies.water"), 42.75);
  assert.equal(c.run("state.sync.pending"), true);
  assert.equal(c.run("state.profile.name"), "QA");
});

test("public score lab starts at zero and uses the same transparent score weighting", () => {
  const c = client();
  assert.equal(c.run("scoreLabResult().value"), 0);
  assert.equal(c.run("scoreLabResult().count"), 0);
  const water = c.run("scoreLabResult(new Set(['water']))");
  assert.equal(water.count, 1);
  assert.equal(water.value, 8);
  const complete = c.run("scoreLabResult(new Set(scoreLabSteps.map(step => step.id)))");
  assert.equal(complete.count, 5);
  assert.equal(complete.value, 81);
});

test("public score lab changes only its sandbox and exposes selected buttons", () => {
  const c = client();
  c.run("state.assessment.completedAt=null; state.supplies.water=null; updateScoreLab('energy')");
  assert.equal(c.run("scoreLabSelection.has('energy')"), true);
  assert.equal(c.run("state.assessment.completedAt"), null);
  assert.equal(c.run("state.supplies.water"), null);
});

test("public score lab explains why each click matters", () => {
  const c = client();
  const html = c.run("scoreLab()");
  assert.match(html, /Klicke einen Schritt an/);
  assert.match(html, /aria-label="Wasser einplanen – Klicke für die Vorsorge-Erklärung"/);
  assert.match(html, /data-score-lab-step="water"[^>]*aria-pressed="false"/);
  assert.match(html, /Jetzt meinen echten Score kostenlos prüfen/);
});

test("score lab click opens the matching explanation and retains its effect across renders", async () => {
  const c = client();
  c.run("render = () => {}; state.authenticated=false");
  const button = { dataset: { scoreLabStep: "water" }, hasAttribute() { return false; } };
  await c.appEvents.get("click")({ target: { closest: () => button }, detail: 1 });
  assert.equal(c.run("state.ui.modal"), "scorelab:water");
  assert.equal(c.run("scoreLabResult().value"), 8);
  assert.match(c.run("modal()"), /In der Simulation eingeplant/);
  c.run("state.ui.modal=null");
  assert.match(c.run("scoreLab()"), /data-lab-effect>Wasser ist eingeplant/);
  await c.appEvents.get("click")({ target: { closest: () => button }, detail: 0 });
  assert.equal(c.run("scoreLabResult().value"), 0);
  assert.match(c.run("modal()"), /Aus der Simulation entfernt/);
  assert.match(c.run("scoreLab()"), /data-lab-effect>Schritt zurückgenommen/);
  c.run("updateScoreLab(null,true)");
  assert.match(c.run("scoreLab()"), /data-lab-effect>Wähle einen Schritt/);
  assert.equal(c.storage.has("redscore-state-v1"), false);
});

test("score lab model opens without changing the router or selected steps", async () => {
  const c = client();
  let scrolled = false, focused = false;
  const model = { open: false, scrollIntoView() { scrolled = true; }, querySelector: () => ({ focus() { focused = true; } }) };
  c.app.querySelector = selector => selector === "#score-lab-model" ? model : null;
  c.run("updateScoreLab('water')");
  const button = { dataset: {}, hasAttribute: name => name === "data-lab-model" };
  await c.appEvents.get("click")({ target: { closest: () => button } });
  assert.equal(model.open, true);
  assert.equal(scrolled && focused, true);
  assert.equal(c.run("location.hash"), "#/profile");
  assert.equal(c.run("scoreLabResult().value"), 8);
});

test("supplies show recorded coverage and continue with the next unrecorded area", () => {
  const c = client();
  c.run("state.household.pets=[]; renderSupplies()");
  assert.match(c.app.innerHTML, /0 von 5 Bereichen erfasst/);
  assert.match(c.app.innerHTML, /data-open-supply="water">Nächsten Bereich erfassen/);
  c.run("state.supplies.water=supplyTarget(supplyGroups[0]); renderSupplies()");
  assert.equal(c.run("supplyPercent()"), 20);
  assert.match(c.app.innerHTML, /1 von 5 Bereichen erfasst/);
  assert.match(c.app.innerHTML, /data-open-supply="food">Nächsten Bereich erfassen/);
  c.run("getLanguage=()=> 'en'; renderSupplies()");
  assert.match(c.app.innerHTML, /1 of 5 areas recorded/);
  c.run("for (const group of supplyGroups) state.supplies[group.id]=supplyTarget(group); renderSupplies()");
  assert.match(c.app.innerHTML, /data-open-supply="water">Bestände prüfen/);
});

test("empty packlist search can be cleared without losing packed items", async () => {
  const c = client({ online: false });
  c.run("state.packlist[packItems()[0].id]=true; state.ui.packSearch='no-match-qa'; state.ui.packFilter='Gesundheit'; renderPacklist()");
  const checked = c.run("packProgress().checked");
  assert.match(c.app.innerHTML, /Keine Einträge gefunden/);
  assert.match(c.app.innerHTML, /data-clear-pack-search/);
  c.run("render=renderPacklist");
  const button = { dataset: {}, hasAttribute: name => name === 'data-clear-pack-search' };
  await c.appEvents.get('click')({ target: { closest: () => button } });
  assert.equal(c.run("state.ui.packSearch"), '');
  assert.equal(c.run("state.ui.packFilter"), 'Alle');
  assert.equal(c.run("packProgress().checked"), checked);
  assert.doesNotMatch(c.app.innerHTML, /Keine Einträge gefunden/);
  assert.equal(JSON.parse(c.storage.get('redscore-state-v1')).ui.packSearch, '');
});

test("a different account never inherits another account's pending data", async () => {
  const c = client({ fetch: async () => Response.json({ user: { id: "user-b" }, profile: { display_name: "Other", onboarding_completed: true }, appState: { supplies: { water: 8 } } }) });
  c.run("state.supplies.water=42.75; state.sync.pending=true");
  await c.run("loadAccount()");
  assert.equal(c.run("state.profile.id"), "user-b");
  assert.equal(c.run("state.supplies.water"), 8);
  assert.equal(c.run("state.sync.pending"), false);
});

test("a transient refresh failure preserves the session instead of logging out", async () => {
  const c = client({ fetch: async () => Response.json({ error: "Temporarily unavailable" }, { status: 503 }) });
  c.run("session.expires_at=1");
  await assert.rejects(c.run("refreshSessionIfNeeded()"));
  assert.equal(c.run("session.refresh_token"), "test-refresh");
});

test("a rejected refresh token is not retained", async () => {
  const c = client({ fetch: async () => Response.json({ error: "Expired" }, { status: 401 }) });
  c.run("session.expires_at=1");
  await assert.rejects(c.run("refreshSessionIfNeeded()"));
  assert.equal(c.run("session"), null);
});

test("only one save runs at a time and edits during that save remain pending", async () => {
  let resolveFirst;
  const calls = [];
  const c = client({ fetch: async (_url,options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) return new Promise(resolve => { resolveFirst = resolve; });
    return Response.json({ ok: true });
  } });
  c.run("state.supplies.water=10; state.sync.pending=true; state.sync.revision=1");
  const first = c.run("syncAccount()");
  await new Promise(resolve => setImmediate(resolve));
  c.run("state.supplies.water=20; state.sync.revision=2");
  const second = c.run("syncAccount()");
  assert.equal(calls.length, 1);
  resolveFirst(Response.json({ ok: true }));
  await Promise.all([first,second]);
  assert.equal(c.run("state.sync.pending"), true);
  assert.equal(calls[0].appState.supplies.water, 10);
  await c.run("syncAccount()");
  assert.equal(calls[1].appState.supplies.water, 20);
  assert.equal(c.run("state.sync.pending"), false);
});

test("failed saves retain pending data and schedule a bounded retry", async () => {
  const c = client({ fetch: async () => Response.json({ error: "Unavailable" }, { status: 503 }) });
  c.run("state.sync.pending=true; state.sync.revision=1");
  await assert.rejects(c.run("syncAccount()"));
  assert.equal(c.run("state.sync.pending"), true);
  assert.equal(c.run("syncStatus"), "error");
  assert.ok([...c.timers.values()].some(timer => timer.delay === 30000));
});

test("an offline reload opens only the previously matching cached household", async () => {
  const c = client({ online: false });
  c.run("state.authenticated=false; state.supplies.water=31.5");
  await c.run("initialize()");
  assert.equal(c.run("state.authenticated"), true);
  assert.equal(c.run("state.supplies.water"), 31.5);
  assert.equal(c.run("syncStatus"), "offline");
  c.run("session.user.id='someone-else'");
  assert.equal(c.run("canResumeOffline()"), false);
});

test("the feed filter cannot turn an existing regional warning into an all-clear", async () => {
  const c = client({ fetch: async () => Response.json({ events: [], sources: [], generatedAt: new Date().toISOString() }) });
  c.run("warningState={status:'ok',warnings:[{headline:'Regional storm warning'}]}; liveState.filter='conflicts'");
  await c.run("requestLiveLage(true)");
  assert.equal(c.run("warningState.warnings[0].headline"), "Regional storm warning");
});

test("failed warning requests are throttled rather than retried by every render", async () => {
  let calls = 0;
  const c = client({ fetch: async () => { calls++; return Response.json({}, { status: 503 }); } });
  await c.run("requestWarnings()");
  await c.run("requestWarnings()");
  assert.equal(calls, 1);
  assert.equal(c.run("warningState.status"), "error");
});

test("offline home rendering does not recurse or make network requests", async () => {
  const c = client({ online: false });
  c.run("location.hash='#/home'");
  await c.run("initialize()");
  assert.match(c.app.innerHTML, /OFFLINE/);
  assert.match(c.app.innerHTML, /Offline · keine Entwarnung/);
});

test("failed feed requests are throttled independently of successful response age", async () => {
  let calls = 0;
  const c = client({ fetch: async () => { calls++; return Response.json({}, { status: 503 }); } });
  await c.run("requestLiveLage()");
  await c.run("requestLiveLage()");
  assert.equal(calls, 1);
  assert.equal(c.run("liveState.status"), "error");
});

test("a response from an old feed selection cannot populate the new selection", async () => {
  let release;
  let calls = 0;
  const c = client({ fetch: async () => {
    calls++;
    if (calls === 1) return new Promise(resolve => { release = resolve; });
    return Response.json({ events: [{ id: "new-cyber" }], sources: [] });
  } });
  const previous = c.run("requestLiveLage(true)");
  c.run("liveState.filter='cyber'");
  const current = c.run("requestLiveLage(true)");
  release(Response.json({ events: [{ id: "old-weather" }], sources: [] }));
  await Promise.all([previous,current]);
  assert.equal(calls, 2);
  assert.equal(c.run("liveState.events[0].id"), "new-cyber");
});

test("a recently synced non-weather source cannot make stale DWD data current", async () => {
  const c = client({ fetch: async () => Response.json({ events: [], generatedAt: new Date().toISOString(), lastSyncAt: new Date().toISOString(), sources: [{ name: "Deutscher Wetterdienst", last_successful_fetch: "2020-01-01T00:00:00Z" }] }) });
  await c.run("requestWarnings()");
  assert.equal(c.run("warningState.status"), "fallback");
  assert.equal(c.run("warningState.checkedAt"), "2020-01-01T00:00:00Z");
});

test("current regional warnings use the DWD source timestamp", async () => {
  const checked = new Date().toISOString();
  const c = client({ fetch: async () => Response.json({ events: [{ title: "Test only", region: "Berlin", verification_status: "official" }], sources: [{ name: "Deutscher Wetterdienst", last_successful_fetch: checked, last_error: null }] }) });
  c.run("state.household.city='Berlin'");
  await c.run("requestWarnings()");
  assert.equal(c.run("warningState.status"), "ok");
  assert.equal(c.run("warningState.checkedAt"), checked);
  assert.equal(c.run("warningState.warnings.length"), 1);
});

test("a grouped weather warning names the matching local report, not the representative's town", async () => {
  const c = client({ fetch: async () => Response.json({ events: [{ title: "Wind warning", region: "Flensburg", affected_regions: ["Flensburg","Berlin"], verification_status: "official", related_events: [{ title: "Wind warning for Berlin", region: "Berlin" }] }], sources: [{ name: "Deutscher Wetterdienst", last_successful_fetch: new Date().toISOString() }] }) });
  c.run("state.household.city='Berlin'");
  await c.run("requestWarnings()");
  assert.equal(c.run("warningState.warnings[0].regionName"), "Berlin");
  assert.equal(c.run("warningState.warnings[0].headline"), "Wind warning for Berlin");
});

test("a successful empty SafePlaces response is cached without a request loop", async () => {
  let calls = 0;
  const c = client({ fetch: async () => { calls++; return Response.json({ places: [], center: { lat: 52, lon: 13 }, generatedAt: new Date().toISOString() }); } });
  c.run("state.household.city='Berlin'; state.household.postalCode='10115'");
  await c.run("requestNearbyPlaces()");
  await c.run("requestNearbyPlaces()");
  assert.equal(calls, 1);
});

test("supply progress contributes to the one score without manufacturing an incomplete score", () => {
  const c = client();
  assert.equal(c.run("score()"), null);
  c.run("state.assessment.answers=Object.fromEntries(relevantAssessmentQuestions().map(([id])=>[id,true])); state.assessment.completedAt='2026-10-07'");
  assert.equal(c.run("score()"), 70);
  c.run("for(const group of supplyGroups) state.supplies[group.id]=supplyTarget(group)");
  assert.equal(c.run("score()"), 100);
  c.run("state.supplies.water=0");
  assert.equal(c.run("score()"), 94);
});

test("directly entered liters are reopened without rounding into container counts", () => {
  const c = client();
  c.run("state.supplies.water=12.25; state.supplyDetails.water={mode:'liters'}");
  const html = c.run("supplyInput(supplyGroups[0],state.supplies.water)");
  assert.match(html, /name="liters"[^>]*value="12.25"[^>]*required/);
  assert.match(html, /value="liters" selected/);
  assert.equal(c.run("fmt(12.25)"), "12,25");
  assert.equal(c.run("fmt(0.125)"), "0,125");
});
