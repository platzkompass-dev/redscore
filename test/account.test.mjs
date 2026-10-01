import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../api/account.js";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_ANON_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = originalKey;
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

test("requires a valid user token before profile data is loaded", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "publishable-test-key";
  globalThis.fetch = async () => new Response("{}", { status: 401, headers: { "content-type": "application/json" } });
  const response = await POST(new Request("https://www.redscore.de/api/account", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer syntactically-valid-token" }, body: JSON.stringify({ action: "load" }),
  }));
  assert.equal(response.status, 401);
});
