const english = document.documentElement.lang === "en";
document.querySelector("[data-water-calculator]")?.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const people = Number(form.elements.people.value), days = Number(form.elements.days.value);
  const output = document.querySelector("[data-water-result]");
  output.textContent = english ? `${people} adults × ${days} days × 2 litres = ${people * days * 2} litres` : `${people} Erwachsene × ${days} Tage × 2 Liter = ${people * days * 2} Liter`;
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
