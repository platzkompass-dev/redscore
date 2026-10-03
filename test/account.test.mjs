import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../api/account.js";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_ANON_KEY;
const originalSiteUrl = process.env.PUBLIC_SITE_URL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = originalKey;
  if (originalSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL; else process.env.PUBLIC_SITE_URL = originalSiteUrl;
});

test("rejects invalid registration before contacting Supabase", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  globalThis.fetch = () => { throw new Error("must not fetch"); };
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign_up", email: "nope", password: "short" }),
  }));
  assert.equal(response.status, 400);
});

test("proxies password sign-in only to the configured Supabase auth endpoint", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  let calledUrl = "";
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    assert.equal(options.method, "POST");
    assert.equal(options.headers.apikey, "publishable-test-key");
    return Response.json({ access_token: "access", refresh_token: "refresh", expires_at: 4_000_000_000, user: { id: "user-id", email: "person@example.org" } });
  };
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign_in", email: "person@example.org", password: "valid-password" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(calledUrl, "https://example.supabase.co/auth/v1/token?grant_type=password");
  assert.equal((await response.json()).session.access_token, "access");
});

test("sends new account confirmations to the configured public RedScore URL", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  process.env.PUBLIC_SITE_URL = "https://www.redscore.de";
  let calledUrl = "";
  let calledBody;
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url);
    calledBody = JSON.parse(options.body);
    return Response.json({ id: "new-user", email: "new@example.org" });
  };
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign_up", email: "new@example.org", password: "valid-password", displayName: "New User" }),
  }));
  assert.equal(response.status, 200);
  const upstreamUrl = new URL(calledUrl);
  assert.equal(upstreamUrl.pathname, "/auth/v1/signup");
  assert.equal(upstreamUrl.searchParams.get("redirect_to"), "https://www.redscore.de/?auth=confirmed");
  assert.deepEqual(calledBody, { email: "new@example.org", password: "valid-password", data: { display_name: "New User" } });
  assert.equal((await response.json()).confirmationRequired, true);
});

test("requires a valid user token before profile data is loaded", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  globalThis.fetch = async () => new Response("{}", { status: 401, headers: { "content-type": "application/json" } });
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer syntactically-valid-token" }, body: JSON.stringify({ action: "load" }),
  }));
  assert.equal(response.status, 401);
});

test("validates custom supplies before synchronizing them", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  let storedState;
  globalThis.fetch = async (url, options) => {
    const pathname = new URL(url).pathname;
    if (pathname === "/auth/v1/user") return Response.json({ id: "user-id", email: "person@example.org" });
    if (pathname === "/rest/v1/user_app_state") storedState = JSON.parse(options.body);
    return Response.json({}, { status: 200 });
  };
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer syntactically-valid-token" },
    body: JSON.stringify({
      action: "save",
      profile: {},
      appState: {
        custom_supplies: [
          { id: "custom-valid-1234", label: "  Babynahrung  ", category: "Versorgung", quantity: 4.5, unit: "Gläser", note: "  trocken  " },
          { id: "not-valid", label: "Soll nicht gespeichert werden", category: "Sonstiges", quantity: 1, unit: "Stück" },
        ],
      },
    }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(storedState.custom_supplies, [{
    id: "custom-valid-1234", label: "Babynahrung", category: "Versorgung", quantity: 4.5, unit: "Gläser", note: "trocken", createdAt: "", updatedAt: "",
  }]);
});
