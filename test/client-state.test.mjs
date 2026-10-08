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
  const app = { innerHTML: "", addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, contains() { return false; } };
  const context = vm.createContext({
    ...data, console, URLSearchParams, URL, AbortSignal, Response, Date, Math, Intl, JSON,
    navigator: { onLine: options.online !== false }, location: { search: "", hash: "#/profile" },
    history: { replaceState() {} },
    document: { hidden: false, activeElement: null, body: { className: "", classList: { toggle() {} } }, querySelector: selector => selector === "#app" ? app : null, addEventListener() {} },
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) },
    setTimeout: (fn,delay) => { const id = Symbol(); timers.set(id,{ fn,delay }); return id; }, clearTimeout: id => timers.delete(id), setInterval: () => 0,
    getLanguage: () => "de", setLanguage() {}, applyLanguage() {}, translateText: value => value,
    fetch: options.fetch || (async () => { throw new Error("unexpected network access"); }),
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run(`state.authenticated=true; state.profile={...state.profile,id:'user-a',name:'QA',onboardingCompleted:true}; session={access_token:'test-access',refresh_token:'test-refresh',expires_at:4000000000,user:{id:'user-a'}};`);
  return { run, storage, timers, context, app };
}

test("pending local supplies survive a cloud load for the same account", async () => {
  const c = client({ fetch: async () => Response.json({ user: { id: "user-a" }, profile: { display_name: "Cloud", onboarding_completed: true }, appState: { supplies: { water: 5 } } }) });
  c.run("state.supplies.water=42.75; state.sync.pending=true; state.sync.revision=3");
  await c.run("loadAccount()");
  assert.equal(c.run("state.supplies.water"), 42.75);
  assert.equal(c.run("state.sync.pending"), true);
  assert.equal(c.run("state.profile.name"), "QA");
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
