import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../api/route.js";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("rejects invalid route coordinates before contacting the routing service", async () => {
  globalThis.fetch = () => { throw new Error("must not fetch"); };
  const response = await POST(new Request("https://www.redscore.de/api/route", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ fromLat: 53.8, fromLon: 9.2, toLat: "invalid", toLon: 9.3 }),
  }));
  assert.equal(response.status, 400);
});

test("rejects route destinations outside the supported regional range", async () => {
  globalThis.fetch = () => { throw new Error("must not fetch"); };
  const response = await POST(new Request("https://www.redscore.de/api/route", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ fromLat: 53.8, fromLon: 9.2, toLat: 48.1, toLon: 11.5 }),
  }));
  assert.equal(response.status, 400);
});

test("returns a normalized OSRM route without exposing the upstream page", async () => {
  let requestedUrl = "";
  globalThis.fetch = async url => {
    requestedUrl = String(url);
    return Response.json({ code: "Ok", routes: [{ distance: 4312.4, duration: 602.6 }] });
  };
  const response = await POST(new Request("https://www.redscore.de/api/route", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ fromLat: 53.823, fromLon: 9.285, toLat: 53.842, toLon: 9.311 }),
  }));
  assert.equal(response.status, 200);
  assert.match(requestedUrl, /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//);
  const payload = await response.json();
  assert.deepEqual(payload, {
    distanceMeters: 4312,
    durationSeconds: 603,
    profile: "driving",
    source: "OSRM · OpenStreetMap-Mitwirkende",
    calculatedAt: payload.calculatedAt,
  });
  assert.match(payload.calculatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
