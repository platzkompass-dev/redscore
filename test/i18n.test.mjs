import assert from "node:assert/strict";
import test from "node:test";

const storage = new Map([["redscore-language-v1", "en"]]);
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const { getLanguage, setLanguage, translateText } = await import("../dist/i18n.js");

test("stores and restores the selected interface language", () => {
  setLanguage("en");
  assert.equal(getLanguage(), "en");
  setLanguage("de");
  assert.equal(getLanguage(), "de");
  setLanguage("en");
});

test("translates fixed and dynamic interface copy", () => {
  assert.equal(translateText("Kostenlos registrieren"), "Register for free");
  assert.equal(translateText("⌂ Start"), "⌂ Home");
  assert.equal(translateText("Jetzt Prüfung starten →"), "Start the check →");
  assert.equal(translateText("3 Aufgaben offen"), "3 open tasks");
  assert.equal(translateText("10-Tage-Ziel: 60 Liter für deinen Haushalt"), "10-day target: 60 liters for your household");
  assert.equal(translateText("Zuletzt aktualisiert vor 26 Sek."), "Last updated 26 sec. ago");
});

test("keeps source-provided reports unchanged", () => {
  const report = "Amtliche WARNUNG vor STURMBÖEN";
  assert.equal(translateText(report), report);
});

test("translates packing-list items, status, search and accessibility labels", () => {
  setLanguage("en");
  assert.equal(translateText("Geladene Powerbank"), "Charged power bank");
  assert.equal(translateText("Warme Kleidung"), "Warm clothing");
  assert.equal(translateText("1 von 13 bereit"), "1 of 13 ready");
  assert.equal(translateText("12 Punkte fehlen noch."), "12 items remain.");
  assert.equal(translateText("1 Punkt fehlt."), "1 item remains.");
  assert.equal(translateText("1 abgehakt · 12 offen"), "1 checked · 12 remaining");
  assert.equal(translateText("Als vorhanden markieren"), "Mark as available");
  assert.equal(translateText("Suchen"), "Search");
});

test("translates every authored knowledge article including its details", async () => {
  const { knowledgeArticles } = await import("../dist/data.js");
  setLanguage("en");
  for (const article of knowledgeArticles) {
    for (const copy of [article.title,article.summary,...article.bullets]) assert.notEqual(translateText(copy), copy);
  }
  assert.equal(translateText("Krisen & Gefahrenlagen · 8 Min."), "Crises & hazards · 8 min.");
});
