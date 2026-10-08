import test from "node:test";
import assert from "node:assert/strict";
import { candidateParams, validCoordinates, feedLimit, selectOverview } from "../supabase/functions/_shared/live-lage/selection.ts";

test("sends scope and categories to the database before its limit", () => {
  const params = candidateParams("world", "conflicts", "2026-10-01T00:00:00Z", "Niedersachsen", "Stade");
  assert.deepEqual(params.p_categories, ["international_security"]);
  assert.equal(params.p_scope, "world");
  assert.equal(params.p_district, "Stade");
  assert.equal(candidateParams("for_you", "all", "now").p_categories, null);
});

test("missing, partial and invalid coordinates never become a location at 0,0", () => {
  for (const [lat, lon] of [[null,null], ["", ""], ["53", null], ["91", "10"], ["53", "181"], ["x", "10"]]) assert.deepEqual(validCoordinates(lat, lon), {});
  assert.deepEqual(validCoordinates("0", "0"), { latitude: 0, longitude: 0 });
  assert.deepEqual(validCoordinates("53.82", "9.28"), { latitude: 53.82, longitude: 9.28 });
  assert.equal(feedLimit("not-a-number"), 12);
  assert.equal(feedLimit("1000"), 30);
});

test("a mixed overview includes wars without replacing its top or nearby critical warning", () => {
  const weather = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, category: "storm", severity: i === 0 ? "critical" : "high", relevance: { score: 150-i, distance_km: i === 0 ? 12 : null } }));
  const wars = [0,1].map(i => ({ id: `c${i}`, category: "international_security", severity: "high", relevance: { score: 84-i } }));
  const chosen = selectOverview([...weather, ...wars], 12, "all");
  assert.equal(chosen.length, 12);
  assert.equal(chosen[0].id, "w0");
  assert.equal(chosen.filter(x => x.category === "international_security").length, 2);
  assert.deepEqual(selectOverview(weather, 12, "weather"), weather.slice(0,12));
});

test("never displaces nearby critical incidents to fill a category quota", () => {
  const nearby = Array.from({length: 12}, (_, i) => ({id: `n${i}`, category: "storm", severity: "critical", relevance: {score: 160, distance_km: 10}}));
  const war = {id:"war", category:"international_security", severity:"high", relevance:{score:84}};
  assert.deepEqual(selectOverview([...nearby, war], 12, "all"), nearby);
});
