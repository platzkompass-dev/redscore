import test from "node:test";
import assert from "node:assert/strict";
import { eonetAdapter } from "../supabase/functions/_shared/live-lage/adapters/eonet.ts";
import { nwsAdapter } from "../supabase/functions/_shared/live-lage/adapters/nws.ts";
import { usgsAdapter } from "../supabase/functions/_shared/live-lage/adapters/usgs.ts";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("imports current open NASA natural events", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ events: [{
    id: "EONET_1",
    title: "Major Wildfire - Test Region",
    description: "An active wildfire",
    categories: [{ id: "wildfires" }],
    sources: [{ id: "NASA" }],
    geometry: [{ date: "2026-10-03T09:00:00Z", type: "Point", coordinates: [12.3, 45.6] }],
  }] }), { headers: { "content-type": "application/json" } });
  const events = await eonetAdapter.fetch({
    id: "1", slug: "nasa-eonet", name: "NASA EONET", source_type: "rest_api", adapter_key: "eonet",
    trust_level: "official", polling_interval_seconds: 300, allowed_hosts: ["eonet.gsfc.nasa.gov"],
    config: { endpoint: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open", canonical_url: "https://eonet.gsfc.nasa.gov/" },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "wildfire");
  assert.equal(events[0].severity, "critical");
  assert.equal(events[0].latitude, 45.6);
  assert.equal(events[0].verificationStatus, "official");
});

test("imports only official severe NWS alerts with expiry", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ features: [{
    id: "https://api.weather.gov/alerts/urn:oid:test",
    properties: {
      id: "urn:oid:test", event: "Tornado Warning", headline: "Tornado Warning issued for Test County",
      severity: "Extreme", urgency: "Immediate", certainty: "Observed", areaDesc: "Test County",
      sent: "2026-10-03T09:00:00Z", expires: "2026-10-03T11:00:00Z",
      description: "A confirmed tornado is moving through the warned area.", senderName: "NWS Test",
    },
  }] }), { headers: { "content-type": "application/geo+json" } });
  const events = await nwsAdapter.fetch({
    id: "2", slug: "nws-severe-alerts", name: "NOAA/NWS", source_type: "rest_api", adapter_key: "nws",
    trust_level: "official", polling_interval_seconds: 60, allowed_hosts: ["api.weather.gov"],
    config: { endpoint: "https://api.weather.gov/alerts/active?severity=Extreme%2CSevere", canonical_url: "https://api.weather.gov/alerts/active" },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "storm");
  assert.equal(events[0].severity, "critical");
  assert.equal(events[0].country, "United States");
  assert.equal(events[0].expiresAt, "2026-10-03T11:00:00.000Z");
});

test("imports significant USGS earthquakes with impact severity", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ features: [{
    id: "us-test", geometry: { coordinates: [142.1, 38.2, 20] },
    properties: {
      title: "M 7.6 - 100 km E of Test, Japan", place: "100 km E of Test, Japan", mag: 7.6,
      time: Date.parse("2026-10-03T08:30:00Z"), sig: 1100, alert: "red", tsunami: 1,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us-test",
    },
  }] }), { headers: { "content-type": "application/json" } });
  const events = await usgsAdapter.fetch({
    id: "3", slug: "usgs-significant-earthquakes", name: "USGS", source_type: "rest_api", adapter_key: "usgs",
    trust_level: "official", polling_interval_seconds: 60, allowed_hosts: ["earthquake.usgs.gov"],
    config: { endpoint: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson", canonical_url: "https://earthquake.usgs.gov/earthquakes/map/" },
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "earthquake");
  assert.equal(events[0].severity, "critical");
  assert.equal(events[0].country, "Japan");
  assert.ok(events[0].tags.includes("Tsunami-Hinweis"));
});
