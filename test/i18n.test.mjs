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
