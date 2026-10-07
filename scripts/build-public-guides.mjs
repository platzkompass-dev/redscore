import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = "https://www.redscore.de";
const updated = "2026-10-07";
const esc = text => String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const guides = [
  {
    slug: { de: "notvorrat", en: "emergency-supplies" }, icon: "water", tool: "water",
    source: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/Bevorraten/bevorraten.html",
    de: { title: "Notvorrat anlegen: Wasser und Lebensmittel planen", description: "Notvorrat Schritt für Schritt aufbauen: Wasserbedarf berechnen, Lebensmittel sinnvoll lagern und Vorräte kostenlos mit RedScore erfassen.", intro: "Ein Vorrat passt am besten zu eurem Alltag. Beginne mit dem, was ihr ohnehin nutzt, und baue ihn in überschaubaren Schritten auf.", sections: [
      ["Wie viele Tage einplanen?", "Das BBK empfiehlt, sich möglichst zehn Tage selbst versorgen zu können. Schon ein Vorrat für drei Tage hilft. Prüfe zuerst euren Bestand, bevor du zusätzlich einkaufst."],
      ["Wasser als Erstes planen", "Für Erwachsene kannst du mit zwei Litern pro Person und Tag rechnen: 1,5 Liter zum Trinken und 0,5 Liter zum Kochen. Individueller Mehrbedarf und Tierbedarf kommen hinzu. Der Rechner unten verwendet diesen Richtwert."],
      ["Lebensmittel passend auswählen", "Wähle lange haltbare Lebensmittel, die ihr gerne esst. Plane auch Lebensmittel ein, die ohne Kochen genießbar sind. Allergien, Kleinkinder und Haustiere brauchen besondere Aufmerksamkeit."],
      ["Den Vorrat lebendig halten", "Verbrauche Produkte mit kürzerer Haltbarkeit zuerst und ersetze sie im Alltag. Lagere übersichtlich und überprüfe den Bestand regelmäßig."],
      ["Vom Richtwert zum tatsächlichen Bestand", "In RedScore erfasst du vorhandene Wassergebinde und Lebensmittel in Vorratstagen. Eigene Dinge kannst du mit Mengen und Einheiten ergänzen. Haushaltsangaben und Bestände bleiben in deinem Konto verbunden; der öffentliche Rechner speichert keine Eingaben."],
    ], cta: "Vorrat kostenlos planen" },
    en: { title: "Plan emergency supplies: water and food", description: "Build emergency supplies step by step: calculate water needs, rotate food and manage your household supplies for free with RedScore.", intro: "The most useful supplies fit your everyday life. Start with things you already use and build your stock in manageable steps.", sections: [
      ["How many days should you plan for?", "Germany’s BBK recommends being able to support yourself for ten days where possible. Even three days of supplies help. Check what you already have before buying more."],
      ["Plan water first", "For adults, use two litres per person per day as a guide: 1.5 litres for drinking and 0.5 litres for cooking. Add individual extra needs and water for pets. The calculator below uses this guideline."],
      ["Choose suitable food", "Choose long-lasting food your household enjoys. Include food that can be eaten without cooking. Consider allergies, young children and pets."],
      ["Rotate your supplies", "Use items with shorter shelf lives first and replace them during regular shopping. Keep storage organised and check your stock regularly."],
      ["Turn a guideline into your actual stock", "RedScore lets you record water containers and food in days of supply. Add your own items with quantities and units. Your household and stock stay linked to your account; this public calculator does not store your entries."],
    ], cta: "Plan supplies for free" },
  },
  {
    slug: { de: "notfallrucksack", en: "emergency-backpack" }, icon: "backpack", tool: "checklist",
    source: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Notgepaeck/notgepaeck_node.html",
    de: { title: "Notfallrucksack packen: eine persönliche Packliste", description: "Was gehört in einen Notfallrucksack? Kompakte Packliste mit Medikamenten, Dokumenten, Licht und Verpflegung – kostenlos abhaken und drucken.", intro: "Wenn du dein Zuhause kurzfristig verlassen musst, hilft vorbereitetes Notgepäck. Ein Rucksack lässt die Hände frei und sollte für dich tragbar bleiben.", sections: [
      ["Persönlicher Bedarf zuerst", "Plane persönliche Medikamente, Erste-Hilfe-Material, Hygieneartikel und Kleidung ein. Dokumente und wichtige Kopien gehören ebenfalls dazu."],
      ["Information, Licht und Verpflegung", "Das BBK nennt ein batteriebetriebenes Radio, Ersatzbatterien, Taschenlampe, Wasserflasche und Verpflegung für zwei Tage. Ergänze Decke oder Schlafsack und wettergerechte Kleidung."],
      ["Was erst beim Aufbruch dazukommt", "Notiere Dinge, die du täglich brauchst: Ausweis, Gesundheitskarte, Bargeld, Schlüssel und Smartphone. Eine kurze Erinnerung am Rucksack erleichtert den letzten Check."],
      ["Gemeinsam prüfen und tragen", "Berücksichtige Kinder und persönlichen Unterstützungsbedarf. Teste, ob du den gepackten Rucksack selbst tragen kannst. Aktualisiere Inhalt und Dokumente regelmäßig."],
      ["Deine Packliste in RedScore", "Nutze die kurze Liste unten zum Ausprobieren. Für deine dauerhafte Packliste richtest du ein kostenloses Konto ein. In der Plattform kannst du vorhandene Gegenstände abhaken und den Fortschritt wieder aufrufen."],
    ], cta: "Persönliche Packliste kostenlos starten" },
    en: { title: "Pack an emergency backpack: a personal checklist", description: "What belongs in an emergency backpack? Check off medicines, documents, light and food on a free printable packing checklist.", intro: "Prepared emergency luggage helps if you need to leave home at short notice. A backpack keeps your hands free and should remain manageable to carry.", sections: [
      ["Personal needs first", "Include your regular medicines, first-aid supplies, hygiene items and clothing. Add important documents and copies."],
      ["Information, light and food", "The BBK lists a battery-powered radio, spare batteries, a torch, a water bottle and food for two days. Include a blanket or sleeping bag and weather-appropriate clothing."],
      ["Items to add when leaving", "Write down everyday items: ID, health insurance card, cash, keys and your phone. A short reminder attached to the bag makes the final check easier."],
      ["Check and carry it together", "Consider children and personal support needs. Test whether you can carry your packed backpack. Review the contents and documents regularly."],
      ["Your RedScore packing list", "Try the short checklist below. Create a free account to keep your personal packing list. The platform lets you check off items you have and return to your progress."],
    ], cta: "Start your free personal packing list" },
  },
  {
    slug: { de: "stromausfall", en: "power-outage" }, icon: "light-bulb",
    source: "https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/Stromausfall/stromausfall_node.html",
    de: { title: "Stromausfall: Licht, Information und Vorräte vorbereiten", description: "Auf Stromausfall vorbereiten: Taschenlampe, Radio, geladene Powerbank, Wasser und Lebensmittel prüfen. Mit RedScore kostenlos den eigenen Stand erfassen.", intro: "Bei einem längeren Stromausfall können Licht, Heizung, Kühlung und Kommunikation beeinträchtigt sein. Ein paar vorbereitete Dinge erleichtern den Alltag.", sections: [
      ["Licht und Kommunikation", "Halte Taschenlampe, passende Ersatzbatterien und geladene Powerbanks bereit. Ein Batterie- oder Kurbelradio hilft, Informationen der Behörden zu verfolgen. Notiere wichtige Kontakte zusätzlich auf Papier."],
      ["Wärme und Verpflegung", "Plane warme Kleidung und Decken sowie Wasser und haltbare Lebensmittel ein, die ohne elektrische Zubereitung nutzbar sind. Bargeld kann bei ausgefallenen Geldautomaten helfen."],
      ["Sicher handeln", "Verwende einen Grill oder ein Stromaggregat niemals in Wohnräumen: Es besteht Vergiftungsgefahr durch Kohlenmonoxid. Beachte die Anweisungen der Behörden und des Stromversorgers."],
      ["Den nächsten kleinen Schritt wählen", "RedScore verbindet deinen Vorsorge-Check mit dem erfassten Vorrat. So kannst du gezielt mit einer offenen Aufgabe beginnen – etwa Licht prüfen, Wasser erfassen oder deine Packliste ergänzen. Der Wert beruht auf deinen Angaben und ist keine behördliche Zertifizierung."],
    ], cta: "Vorsorgestand kostenlos prüfen" },
    en: { title: "Power outage: prepare light, information and supplies", description: "Prepare for power outages: check your torch, radio, charged power bank, water and food. Record your preparedness for free with RedScore.", intro: "During a longer power outage, lighting, heating, refrigeration and communications may be affected. A few prepared items can make everyday life easier.", sections: [
      ["Light and communication", "Keep a torch, compatible spare batteries and charged power banks ready. A battery-powered or hand-crank radio can help you follow official information. Keep important contacts on paper too."],
      ["Warmth and food", "Plan warm clothing, blankets, water and long-lasting food that does not need electric cooking. Cash may help when ATMs are unavailable."],
      ["Act safely", "Never use a barbecue or generator in living spaces: carbon monoxide can cause poisoning. Follow instructions from authorities and your electricity provider."],
      ["Choose the next small step", "RedScore combines your preparedness check with your recorded supplies. Begin with one open task: check lighting, record water or add to your packing list. Your score is based on your entries and is not an official certification."],
    ], cta: "Check preparedness for free" },
  },
];
const urlFor = (guide, lang) => `${lang === "de" ? "/ratgeber/" : "/en/guides/"}${guide ? guide.slug[lang] : "index"}.html`;
function cards(lang, except) {
  return guides.filter(g => g !== except).map(g => `<a class="guide-card" href="${urlFor(g, lang)}"><img src="/assets/icons-3d/${g.icon}.png" alt="" width="52" height="52"><h3>${esc(g[lang].title)}</h3><p>${esc(g[lang].intro)}</p><span>${lang === "de" ? "Ratgeber lesen" : "Read guide"} →</span></a>`).join("");
}
function interactive(guide, lang) {
  const en = lang === "en";
  if (guide.tool === "water") return `<section class="guide-tool"><h2>${en ? "Calculate your water supply" : "Wasservorrat berechnen"}</h2><form data-water-calculator><label>${en ? "Adults" : "Erwachsene"}<input name="people" type="number" min="1" max="100" value="2" required></label><label>${en ? "Days" : "Tage"}<input name="days" type="number" min="1" max="30" value="10" required></label><button class="guide-button" type="submit">${en ? "Calculate" : "Berechnen"}</button></form><output aria-live="polite" data-water-result>${en ? "2 adults × 10 days × 2 litres = 40 litres" : "2 Erwachsene × 10 Tage × 2 Liter = 40 Liter"}</output><p>${en ? "Adult guideline; add individual extra needs and pet supplies." : "Richtwert für Erwachsene; individuellen Mehrbedarf und Haustiere zusätzlich einplanen."}</p></section>`;
  if (guide.tool === "checklist") {
    const items = en ? ["Personal medicines and first aid", "Documents and contact details", "Radio, batteries and torch", "Water bottle and food", "Clothing, blanket and hygiene items", "Reminder: ID, cash, keys and phone"] : ["Persönliche Medikamente und Erste Hilfe", "Dokumente und Kontaktdaten", "Radio, Batterien und Taschenlampe", "Wasserflasche und Verpflegung", "Kleidung, Decke und Hygieneartikel", "Aufbruch-Erinnerung: Ausweis, Bargeld, Schlüssel und Handy"];
    return `<section class="guide-tool"><h2>${en ? "Quick packing check" : "Dein kurzer Packcheck"}</h2><p>${en ? "Try it here; save your full checklist in your free account." : "Hier ausprobieren; die vollständige Liste speicherst du in deinem kostenlosen Konto."}</p><div class="packing-check">${items.map(label => `<label><input type="checkbox">${esc(label)}</label>`).join("")}</div></section>`;
  }
  return "";
}
function page(guide, lang) {
  const en = lang === "en";
  const copy = guide?.[lang];
  const title = copy?.title || (en ? "Emergency preparedness guides" : "Ratgeber zur Notfallvorsorge");
  const description = copy?.description || (en ? "Free practical guides to emergency supplies, backpacks and power outages. Read without an account and start your preparedness with RedScore." : "Kostenlose Ratgeber zu Notvorrat, Notfallrucksack und Stromausfall. Ohne Anmeldung lesen und mit RedScore die eigene Vorsorge starten.");
  const current = urlFor(guide, lang);
  const schema = {
    "@context": "https://schema.org", "@type": guide ? "Article" : "CollectionPage",
    "@id": `${origin}${current}#content`, url: `${origin}${current}`, ...(guide ? { headline: title, author: { "@type": "Organization", name: "RedScore" }, datePublished: updated, dateModified: updated, citation: guide.source } : { name: title }),
    description, inLanguage: en ? "en" : "de-DE", image: `${origin}/assets/redscore-logo-full.png?v=6`,
    publisher: { "@type": "Organization", name: "RedScore", url: `${origin}/`, logo: { "@type": "ImageObject", url: `${origin}/assets/app-icon-512.png`, width: 512, height: 512 } },
  };
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | RedScore</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#061722"><link rel="canonical" href="${origin}${current}"><link rel="alternate" hreflang="de" href="${origin}${urlFor(guide, "de")}"><link rel="alternate" hreflang="en" href="${origin}${urlFor(guide, "en")}"><link rel="alternate" hreflang="x-default" href="${origin}${urlFor(guide, "de")}"><link rel="icon" type="image/png" sizes="192x192" href="/favicon.png"><link rel="apple-touch-icon" href="/assets/app-icon-180.png?v=5"><link rel="stylesheet" href="/guide.css"><meta property="og:type" content="${guide ? "article" : "website"}"><meta property="og:site_name" content="RedScore"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin}${current}"><meta property="og:locale" content="${en ? "en_GB" : "de_DE"}"><meta property="og:image" content="${origin}/assets/redscore-logo-full.png?v=6"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${origin}/assets/redscore-logo-full.png?v=6"><script type="application/ld+json">${JSON.stringify(schema)}</script><script defer src="/guide.js"></script><script defer src="/analytics.js?v=1"></script></head>
<body><a class="skip-link" href="#content">${en ? "Skip to content" : "Zum Inhalt"}</a><header class="guide-header"><a class="guide-brand" href="/" aria-label="RedScore"><img src="/assets/redscore-logo.png?v=5" alt="" width="48" height="48"><span><b>Red</b>Score</span></a><nav aria-label="Navigation"><a href="${urlFor(null, lang)}">${en ? "Guides" : "Ratgeber"}</a><a href="${urlFor(guide, en ? "de" : "en")}" lang="${en ? "de" : "en"}">${en ? "Deutsch" : "English"}</a><a class="guide-button" href="/${en ? "?lang=en" : "?lang=de"}#/register" data-start-register>${en ? "Start for free" : "Kostenlos starten"}</a></nav></header>
<main id="content"><div class="guide-intro"><p class="eyebrow">REDSCORE · ${en ? "PRACTICAL PREPAREDNESS" : "PRAKTISCHE VORSORGE"}</p><h1>${esc(title)}</h1><p>${esc(copy?.intro || description)}</p>${guide ? `<p class="guide-date">${en ? "Updated: 7 October 2026 · RedScore editorial team" : "Stand: 7. Oktober 2026 · Redaktion RedScore"}</p>` : ""}</div>
${guide ? `<article class="guide-article">${copy.sections.map(([heading, text]) => `<section><h2>${esc(heading)}</h2><p>${esc(text)}</p></section>`).join("")}${interactive(guide, lang)}<section class="guide-source"><h2>${en ? "Official source" : "Offizielle Quelle"}</h2><p><a href="${guide.source}" target="_blank" rel="noopener noreferrer">${en ? "BBK recommendations (German)" : "Empfehlungen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe"} ↗</a></p><p>${en ? "RedScore is an independent service. There is no official partnership. Follow official warnings and instructions in an emergency." : "RedScore ist ein unabhängiges Angebot. Es existiert keine behördliche Zusammenarbeit. Im Ereignisfall gelten amtliche Warnungen und Anweisungen."}</p></section><div class="guide-actions"><button class="guide-secondary" data-print>${en ? "Print checklist" : "Checkliste drucken"}</button><button class="guide-secondary" data-share>${en ? "Share guide" : "Ratgeber teilen"}</button><p role="status" data-share-status></p></div></article>` : `<div class="guide-grid">${cards(lang)}</div>`}
<section class="guide-cta"><h2>${en ? "Make preparedness part of your everyday life" : "Mach Vorsorge zu deinem nächsten kleinen Schritt"}</h2><p>${en ? "Record supplies, check off your backpack and see your personal preparedness status in RedScore." : "Erfasse Vorräte, hake deinen Notfallrucksack ab und sieh deinen persönlichen Vorsorgestand in RedScore."}</p><a class="guide-button" href="/${en ? "?lang=en" : "?lang=de"}#/register" data-start-register>${esc(copy?.cta || (en ? "Start for free" : "Jetzt kostenlos starten"))} →</a></section>${guide ? `<aside><h2>${en ? "Related guides" : "Weitere Ratgeber"}</h2><div class="guide-grid">${cards(lang, guide)}</div></aside>` : ""}</main>
<footer class="guide-footer"><a href="/?lang=${lang}">RedScore</a><a href="${urlFor(null, lang)}">${en ? "All guides" : "Alle Ratgeber"}</a><a href="/?lang=${lang}#/impressum">${en ? "Legal notice" : "Impressum"}</a><a href="/?lang=${lang}#/datenschutz">${en ? "Privacy" : "Datenschutz"}</a></footer></body></html>`;
}
const urls = [];
for (const lang of ["de", "en"]) {
  for (const guide of [null, ...guides]) {
    const pathname = urlFor(guide, lang);
    const file = path.join(root, pathname.slice(1));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, page(guide, lang));
    urls.push(`<url><loc>${origin}${pathname}</loc><lastmod>${updated}</lastmod><xhtml:link rel="alternate" hreflang="de" href="${origin}${urlFor(guide, "de")}"/><xhtml:link rel="alternate" hreflang="en" href="${origin}${urlFor(guide, "en")}"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin}${urlFor(guide, "de")}"/></url>`);
  }
}
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${origin}/</loc><lastmod>${updated}</lastmod></url>${urls.join("\n")}</urlset>\n`);
console.log(`Generated ${urls.length} public guide pages and sitemap.`);
