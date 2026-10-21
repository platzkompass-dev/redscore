const english = document.documentElement.lang === "en";
import { waterPlan } from "./guide-calculator.js?v=1";

function renderWaterPlan(form) {
  const result = waterPlan(Number(form.elements.people.value), Number(form.elements.days.value), form.elements.stock.value, Number(form.elements.bottleSize.value));
  const output = document.querySelector("[data-water-result]");
  const shopping = document.querySelector("[data-water-shopping]");
  if (!result) {
    output.textContent = english ? "Please enter valid quantities. Use a decimal comma or point, without thousands separators." : "Bitte gültige Mengen eingeben. Dezimalmengen mit Komma oder Punkt, ohne Tausendertrennzeichen.";
    shopping.textContent = "";
    return;
  }
  const number = value => new Intl.NumberFormat(english ? "en-GB" : "de-DE", { maximumFractionDigits: 3 }).format(value);
  output.textContent = english ? `Your target: ${number(result.target)} litres · Still needed: ${number(result.missing)} litres` : `Dein Richtwert: ${number(result.target)} Liter · Noch offen: ${number(result.missing)} Liter`;
  shopping.textContent = result.missing ? english ? `Shopping aid: ${result.bottles} bottles of ${number(result.bottleSize)} litres each. Rounded up to whole bottles.` : `Einkaufshilfe: ${result.bottles} Gebinde à ${number(result.bottleSize)} Liter. Auf ganze Gebinde aufgerundet.` : english ? "Your entered stock covers this calculated water guideline. Check shelf life and individual extra needs as well." : "Dein eingetragener Bestand deckt diesen berechneten Wasserrichtwert ab. Prüfe auch Haltbarkeit und individuellen Mehrbedarf.";
}

document.querySelector("[data-water-calculator]")?.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  renderWaterPlan(form);
});

document.querySelector("[data-water-calculator]")?.addEventListener("input", () => {
  document.querySelector("[data-water-result]").textContent = english ? "Inputs changed. Calculate again to update your shopping aid." : "Angaben geändert. Berechne die Einkaufshilfe erneut.";
  document.querySelector("[data-water-shopping]").textContent = "";
});

document.querySelector("[data-print-water]")?.addEventListener("click", () => {
  const form = document.querySelector("[data-water-calculator]");
  if (!form.reportValidity()) return;
  renderWaterPlan(form);
  if (waterPlan(Number(form.elements.people.value), Number(form.elements.days.value), form.elements.stock.value, Number(form.elements.bottleSize.value))) window.print();
});
document.querySelector("[data-print]")?.addEventListener("click", () => window.print());
document.querySelector("[data-share]")?.addEventListener("click", async () => {
  const status = document.querySelector("[data-share-status]");
  const url = document.querySelector('link[rel="canonical"]').href;
  try {
    if (navigator.share) await navigator.share({ title: document.title, url });
    else { await navigator.clipboard.writeText(url); status.textContent = english ? "Link copied." : "Link wurde kopiert."; }
  } catch (error) { if (error.name !== "AbortError") status.textContent = url; }
});
document.querySelectorAll("[data-start-register]").forEach(link => link.addEventListener("click", () => {
  try { localStorage.setItem("redscore-language-v1", english ? "en" : "de"); } catch { /* navigation still works */ }
}));
