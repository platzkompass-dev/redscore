import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../api/places.js";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("rejects incomplete place lookups before contacting external services", async () => {
  globalThis.fetch = () => { throw new Error("must not fetch"); };
  const response = await GET(new Request("https://www.redscore.de/api/places?city=Freiburg"));
  assert.equal(response.status, 400);
});

test("returns normalized nearby infrastructure from OpenStreetMap", async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });
    if (String(url).includes("nominatim")) return Response.json([{ lat: "53.823", lon: "9.285", display_name: "21729 Freiburg (Elbe)" }]);
    return Response.json({ elements: [{
      type: "node", id: 123, lat: 53.824, lon: 9.286,
      tags: { amenity: "fire_station", name: "Ortsfeuerwehr", "addr:street": "Am Hafen", "addr:housenumber": "4", "addr:postcode": "21729", "addr:city": "Freiburg (Elbe)" },
    }] });
  };
  const response = await GET(new Request("https://www.redscore.de/api/places?postalCode=21729&city=Freiburg%20(Elbe)&state=Niedersachsen"));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.equal(payload.places[0].category, "Behörden");
  assert.equal(payload.places[0].name, "Ortsfeuerwehr");
  assert.match(payload.places[0].routeUrl, /^https:\/\/www\.openstreetmap\.org\/directions/);
});
