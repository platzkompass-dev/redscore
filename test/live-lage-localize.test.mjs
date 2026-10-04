import test from "node:test";
import assert from "node:assert/strict";
import { liveLanguage, localizedSourceName, localizeLiveEvent } from "../supabase/functions/_shared/live-lage/localize.ts";

const base = {
  id: "event-1",
  title: "Tornado Warning issued for Test County",
  summary: "A confirmed tornado is moving through the warned area.",
  category: "storm",
  severity: "critical",
  country: "United States",
  region: "Test County",
  organizations: ["National Weather Service"],
  tags: ["Tornado Warning"],
  sources: [{ name: "NOAA/NWS", title: "Tornado Warning issued for Test County", url: "https://api.weather.gov/alerts/test" }],
};

test("defaults invalid language values to German", () => {
  assert.equal(liveLanguage(null), "de");
  assert.equal(liveLanguage("fr"), "de");
  assert.equal(liveLanguage("en"), "en");
});

test("localizes descriptive source names while preserving brands", () => {
  assert.equal(localizedSourceName("UN News · Kriege und Konflikte", "en"), "UN News · Wars and conflicts");
  assert.equal(localizedSourceName("Deutscher Wetterdienst", "en"), "Deutscher Wetterdienst");
});

test("localizes English warning content for the German Live-Lage", () => {
  const event = localizeLiveEvent(base, "de");
  assert.match(event.title, /^Sturmwarnung/);
  assert.match(event.summary, /Kategorie „Sturmwarnung“/i);
  assert.equal(event.country, "Vereinigte Staaten");
  assert.equal(event.sources[0].title, "Originalmeldung von NOAA/NWS");
  assert.doesNotMatch(event.summary, /reports|severity|details/i);
});

test("keeps English source copy on the English Live-Lage", () => {
  const event = localizeLiveEvent(base, "en");
  assert.equal(event.title, base.title);
  assert.equal(event.summary, base.summary);
  assert.equal(event.sources[0].title, "Original report by NOAA/NWS");
});

test("creates an English version for a German official warning", () => {
  const event = localizeLiveEvent({
    ...base,
    title: "Amtliche WARNUNG vor STURMBÖEN",
    summary: "Es treten Sturmböen mit Geschwindigkeiten bis 80 km/h auf.",
    country: "Deutschland",
    region: "Kreis Stade",
    sources: [{ name: "Deutscher Wetterdienst", title: "Amtliche WARNUNG vor STURMBÖEN" }],
  }, "en");
  assert.match(event.title, /^Storm warning/);
  assert.match(event.summary, /“Storm warning” category/i);
  assert.equal(event.country, "Germany");
  assert.doesNotMatch(event.summary, /Sturmböen|Geschwindigkeiten/);
});

test("retains earthquake magnitude in the generated German title", () => {
  const event = localizeLiveEvent({ ...base, title: "M 7.6 - 100 km E of Test, Japan", summary: "", category: "earthquake", country: "Japan", region: "100 km E of Test, Japan", tags: ["Magnitude 7.6"] }, "de");
  assert.match(event.title, /Erdbeben der Stärke 7,6/);
  assert.match(event.title, /östlich von Test/);
});

test("does not leak English area prose into a German warning title", () => {
  const event = localizeLiveEvent({ ...base, region: "Pensacola Bay Area including Santa Rosa Sound; Coastal waters from Pensacola", country: "United States" }, "de");
  assert.equal(event.title, "Sturmwarnung – Vereinigte Staaten");
  assert.doesNotMatch(event.summary, /including|coastal waters/i);
});
