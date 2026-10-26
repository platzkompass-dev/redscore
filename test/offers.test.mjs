import test from "node:test";
import assert from "node:assert/strict";
import { offerCatalog, offerCategories, localOfferMatches, selectOffers } from "../dist/offers.js";

test("offers have official HTTPS sources, DE/EN text and an explicit editorial check date", () => {
  assert.equal(new Set(offerCatalog.map(item => item.id)).size, offerCatalog.length);
  for (const item of offerCatalog) {
    const url = new URL(item.url);
    assert.equal(url.protocol, "https:"); assert.equal(url.username, "");
    assert.ok(offerCategories.some(category => category.id === item.category));
    for (const key of ["de", "en", "descriptionDe", "descriptionEn", "provider"]) assert.ok(item[key]?.trim().length > 0);
    assert.match(item.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(![...url.searchParams.keys()].some(key => /affiliate|utm_|ref/i.test(key)));
    assert.equal(item.price, undefined); assert.equal(item.availablePlaces, undefined);
  }
});

test("regional results require an actual match, not just a similar town or postcode prefix", () => {
  const stade = offerCatalog.find(item => item.id === "johanniter-stade");
  assert.equal(localOfferMatches(stade, {city:"Stade",postalCode:"21680"}), true);
  assert.equal(localOfferMatches(stade, {city:"Stade",postalCode:"10115"}), false);
  assert.equal(localOfferMatches(stade, {city:"Berlin",postalCode:"21680"}), false);
  assert.equal(localOfferMatches(stade, {city:"Freiburg (Elbe)",postalCode:"21729",district:"Landkreis Stade"}), true);
  assert.equal(localOfferMatches(stade, {city:"Stade",postalCode:"21680",country:"US"}), false);
  assert.equal(selectOffers({mode:"local",location:{city:"Freiburg",postalCode:"79098"}}).length, 0);
  assert.equal(selectOffers({mode:"local",location:{city:"Berlin",postalCode:"10115"}}).length, 0);
});

test("online offers ignore location, finders are never presented as regional hits", () => {
  const berlin = selectOffers({mode:"online",location:{city:"Berlin",postalCode:"10115"}});
  const stade = selectOffers({mode:"online",location:{city:"Stade",postalCode:"21680"}});
  assert.deepEqual(berlin, stade); assert.ok(berlin.length >= 3);
  assert.ok(berlin.every(item => item.mode === "online"));
  const local = selectOffers({mode:"local",location:{city:"Stade",postalCode:"21680"}});
  assert.equal(local.length, 2); assert.ok(local.every(item => item.mode === "local"));
  assert.equal(selectOffers({category:"regional"}).length, 0);
  assert.ok(selectOffers({category:"first-aid"}).every(item => item.category === "first-aid"));
});
