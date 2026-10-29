// Editorial catalog: official provider pages, checked on the date below.
// No affiliate parameters, paid placements, live stock, prices or invented dates.
export const offersCheckedAt = "2026-10-28";
export const offerCategories = [
  { id: "first-aid", icon: "medical", image: "knowledge.png", de: "Erste Hilfe", en: "First aid", copyDe: "Wissen auffrischen. Im Notfall handeln können.", copyEn: "Refresh your skills. Know how to help." },
  { id: "volunteer", icon: "profile", image: "shelter.png", de: "Katastrophenschutz & Ehrenamt", en: "Civil protection & volunteering", copyDe: "Organisationen kennenlernen und mithelfen.", copyEn: "Meet organisations and get involved." },
  { id: "equipment", icon: "backpack", image: "pantry.png", de: "Rucksäcke & Ausrüstung", en: "Backpacks & equipment", copyDe: "Ausrüstung passend zu deiner Packliste finden.", copyEn: "Find equipment for your packing list." },
  { id: "safety", icon: "light-bulb", image: "lighthouse.png", de: "Sicherheit zu Hause", en: "Home safety", copyDe: "Warnmelder und Lösungen für dein Zuhause.", copyEn: "Detectors and solutions for your home." },
  { id: "events", icon: "knowledge", image: "warning-storm.png", de: "Veranstaltungen", en: "Events", copyDe: "Aktionstage und Hinweise der Veranstalter.", copyEn: "Awareness days and organiser updates." },
  { id: "regional", icon: "map", image: "public-hero.png", de: "In deiner Region", en: "In your region", copyDe: "Belegte Anlaufstellen statt erfundener Nähe.", copyEn: "Real local services, matched to your location." },
];

export const offerCatalog = [
  { id: "drk-courses", provider: "Deutsches Rotes Kreuz", category: "first-aid", mode: "finder", url: "https://www.rotkreuzkurs.de/start.html", de: "Rotkreuzkurs: Erste-Hilfe-Kurse finden", en: "Find Red Cross first-aid courses", descriptionDe: "Der offizielle Kursfinder sucht nach Postleitzahl oder Ort. Termine und Anmeldung prüfst du beim DRK.", descriptionEn: "Search the official course finder by postcode or town. Check dates and registration with the German Red Cross." },
  { id: "malteser-courses", provider: "Malteser Hilfsdienst", category: "first-aid", mode: "finder", url: "https://www.malteser.de/erste-hilfe/grundlagen.html", de: "Erste-Hilfe-Ausbildung bei den Maltesern", en: "First-aid training with Malteser", descriptionDe: "Informationen zur Ausbildung und Zugang zur Kurssuche. Kein bereits bestätigter Kursplatz in deiner Nähe.", descriptionEn: "Training information and access to the course search. This is not a confirmed local booking." },
  { id: "thw-finder", provider: "Technisches Hilfswerk", category: "volunteer", mode: "finder", url: "https://rb-hamburg.thw.de/mitmachen-unterstuetzen/aktiv-helfen", de: "Beim THW mitmachen", en: "Volunteer with THW", descriptionDe: "Informationen zum Ehrenamt und Ortsverbandssuche mit Postleitzahl oder Ort auf der offiziellen THW-Seite.", descriptionEn: "Learn about volunteering and use the postcode or town search for local THW units on the official website." },
  { id: "johanniter-stade", provider: "Johanniter-Unfall-Hilfe", category: "first-aid", mode: "local", city: "Stade", district: "Stade", postalCodes: ["21680", "21682", "21683", "21684"], address: "Thuner Straße 124 · 21680 Stade", url: "https://www.johanniter.de/dienste-leistungen/angebote-fuer-privatpersonen/lokale-angebote/dienstleistung/erste-hilfe-ausbildung-betriebliche-erste-hilfe-ausbildung-stade-5467/", de: "Erste-Hilfe-Ausbildung in Stade", en: "First-aid training in Stade", descriptionDe: "Die Johanniter führen den Kursstandort Stade auf ihrer Angebotsseite. Aktuelle Termine und freie Plätze direkt dort prüfen.", descriptionEn: "Johanniter lists its Stade course location on its service page. Check current dates and available places directly with the provider." },
  { id: "thw-stade", provider: "THW Ortsverband Stade", category: "volunteer", mode: "local", city: "Stade", district: "Stade", postalCodes: ["21680", "21682", "21683", "21684"], url: "https://www.thw-stade.de/", de: "Technisches Ehrenamt in Stade", en: "Technical volunteering in Stade", descriptionDe: "Der Ortsverband lädt Interessierte ein, Kontakt aufzunehmen und seine Arbeit kennenzulernen. Besuchstermin vorher vereinbaren.", descriptionEn: "The local unit invites people to get in touch and learn about its work. Arrange a visit in advance." },
  { id: "thw-hamburg", provider: "THW Regionalstelle Hamburg", category: "volunteer", mode: "local", city: "Hamburg", postalPattern: "^2[02][0-9]{3}$|^21[01][0-9]{2}$", url: "https://rb-hamburg.thw.de/mitmachen-unterstuetzen/aktiv-helfen", de: "Ehrenamt beim THW in Hamburg", en: "Volunteer with THW in Hamburg", descriptionDe: "Die Regionalstelle informiert über den Einstieg und die Hamburger Ortsverbände. Kontakt und Einstieg direkt mit dem THW abstimmen.", descriptionEn: "The regional office explains how to join and lists Hamburg units. Arrange your introduction directly with THW." },
  { id: "drk-heidelberg", provider: "DRK Rhein-Neckar / Heidelberg", category: "first-aid", mode: "local", city: "Heidelberg", postalCodes: ["69115", "69117", "69118", "69120", "69121", "69123", "69124", "69126"], url: "https://service.drk-heidelberg.de/kurse/rotkreuzkurse-erste-hilfe/rotkreuzkurs-erste-hilfe.html", de: "Rotkreuzkurse in Heidelberg", en: "Red Cross courses in Heidelberg", descriptionDe: "Die offizielle Kursübersicht enthält Kurse in Heidelberg und im Rhein-Neckar-Raum. Ort und freien Termin beim Anbieter auswählen.", descriptionEn: "The official listing includes courses in Heidelberg and the Rhine-Neckar area. Select the location and an available date with the provider." },
  { id: "decathlon-backpacks", provider: "DECATHLON", category: "equipment", mode: "online", url: "https://www.decathlon.de/alle-sportarten-a-z/wandern-trekking/wanderrucksacke-50-liter", de: "Trekkingrucksäcke vergleichen", en: "Compare trekking backpacks", descriptionDe: "Online-Sortiment mit Trekkingrucksäcken. Größe, Gewicht und Tragekomfort an deinen Bedarf anpassen; kein fertig gepackter Notfallrucksack.", descriptionEn: "An online selection of trekking backpacks. Choose size, weight and fit for your needs; these are not pre-packed emergency kits." },
  { id: "globetrotter-water", provider: "Globetrotter", category: "equipment", mode: "online", url: "https://www.globetrotter.de/ausruestung/campingkueche/wasserfilter/?show=all", de: "Wasserfilter und Aufbereitung vergleichen", en: "Compare water filters and treatment", descriptionDe: "Online-Sortiment für Wasseraufbereitung unterwegs. Einsatzgrenzen des jeweiligen Produkts beachten; ein Filter ersetzt keinen Trinkwasservorrat.", descriptionEn: "An online range of water treatment equipment. Check each product’s limitations; a filter does not replace stored drinking water." },
  { id: "abus-detectors", provider: "ABUS", category: "safety", mode: "online", url: "https://www.abus.com/de/Privat/Brandschutz-Gefahrenmelder/Brandschutz/Rauchwarnmelder", de: "Rauch- und Hitzewarnmelder", en: "Smoke and heat detectors", descriptionDe: "Herstellerübersicht zu Warnmeldern und deren Eigenschaften. Produktberatung; Kaufmöglichkeiten, Eignung und Montage beim Anbieter prüfen.", descriptionEn: "The manufacturer’s detector range and specifications. Product information; check purchase options, suitability and installation with the provider." },
  { id: "bbk-awareness-day", provider: "Bundesamt für Bevölkerungsschutz und Katastrophenhilfe", category: "events", mode: "online", url: "https://bevoelkerungsschutztag.de/", de: "Bevölkerungsschutztag: Veranstalter-Information", en: "Civil Protection Day: organiser information", descriptionDe: "Der Veranstalter meldet eine Verschiebung auf 2027; ein neuer Termin steht noch nicht fest (Stand 25.10.2026). Aktuelle Hinweise direkt dort prüfen.", descriptionEn: "The organiser reports a postponement to 2027; no new date has been set (checked 25 October 2026). Check the organiser’s page for updates." },
].map(item => Object.freeze({ ...item, checkedAt: offersCheckedAt, country: "DE" }));

const normalise = value => String(value || "").trim().toLocaleLowerCase("de-DE").replace(/^landkreis\s+|^kreis\s+|^freie und hansestadt\s+|^hansestadt\s+/g, "");
const searchText = value => String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/ß/g,"ss").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function offerMatchesSearch(item, query = "") {
  const text=searchText([item.provider,item.de,item.en,item.descriptionDe,item.descriptionEn,item.city,item.address].filter(Boolean).join(" "));
  return searchText(String(query).slice(0,120)).split(/\s+/).filter(Boolean).every(term=>text.includes(term));
}
export function offerPreparation(item, language="de") {
  const de=language!=="en";
  return ({
    "first-aid":de?["Kursinhalt und Zielgruppe passend?","Termin, Kursort und Gesamtkosten prüfen.","Freie Plätze erst beim Anbieter bestätigen."]:["Does the course suit your needs?","Check date, venue and total cost.","Confirm available places with the provider."],
    volunteer:de?["Zeitaufwand und Voraussetzungen klären.","Kennenlerntermin direkt vereinbaren.","Keine Aufnahmezusage durch RedScore."]:["Check time commitment and requirements.","Arrange an introduction directly.","RedScore does not guarantee admission."],
    equipment:de?["Zuerst vorhandene Ausrüstung prüfen.","Maße, Gewicht und Einsatzgrenzen vergleichen.","Lieferumfang und Rückgabebedingungen prüfen."]:["Check equipment you already own first.","Compare size, weight and usage limits.","Check included items and return terms."],
    safety:de?["Eignung für Wohnung und Einsatzort prüfen.","Montage und Wartung berücksichtigen.","Lieferumfang und Folgekosten vergleichen."]:["Check suitability for your home and location.","Consider installation and maintenance.","Compare included items and ongoing costs."],
    events:de?["Aktuellen Termin beim Veranstalter prüfen.","Ort, Anmeldung und mögliche Kosten klären.","Ohne bestätigten Termin keine Reise planen."]:["Check the current date with the organiser.","Confirm venue, registration and possible cost.","Do not plan travel without a confirmed date."],
  })[item.category] || [];
}
export function offerNeedHints({people,water,backpack}={}) {
  const hints=[];
  if(Number.isInteger(people)&&people>0&&people<=20){
    if(water===null||water===undefined)hints.push({id:"water",route:"supplies",de:"Dein Wasserbestand ist noch nicht erfasst. Kläre zuerst euren Bedarf.",en:"Your water stock has not been recorded. Check your needs first."});
    else if(typeof water==="number"&&Number.isFinite(water)&&water>=0&&water<people*20)hints.push({id:"water",route:"supplies",de:"Dein eingetragener Wasservorrat liegt unter eurem 10-Tage-Planungsziel. Ein Wasserfilter ersetzt diesen Vorrat nicht.",en:"Your recorded water stock is below your 10-day planning target. A water filter does not replace stored water."});
  }
  if(backpack===false)hints.push({id:"backpack",route:"packliste",de:"Notgepäck ist in deinem Vorsorge-Check noch offen. Prüfe mit der Packliste, was du bereits besitzt.",en:"Emergency luggage is still marked as incomplete in your check. Use the packing list to see what you already own."});
  return hints;
}
export function localOfferMatches(offer, location = {}) {
  if (offer.mode !== "local") return false;
  if (location.country && !["de", "deutschland", "germany"].includes(normalise(location.country))) return false;
  // A known district is a regional match, never a claimed distance or a free place.
  if (offer.district && normalise(location.district) === normalise(offer.district)) return true;
  if (normalise(location.city) !== normalise(offer.city) || !/^\d{5}$/.test(String(location.postalCode || ""))) return false;
  return Boolean(offer.postalCodes?.includes(location.postalCode) || (offer.postalPattern && new RegExp(offer.postalPattern).test(location.postalCode)));
}

export function selectOffers({ category = "all", mode = "all", location = {}, query = "", sort = "recommended", catalog = offerCatalog } = {}) {
  return catalog.filter(item => {
    if (!offerMatchesSearch(item,query)) return false;
    if (category !== "all" && category !== item.category && !(category === "regional" && item.mode === "local")) return false;
    if (item.mode === "local") return mode !== "online" && localOfferMatches(item, location);
    if (mode === "local" || category === "regional") return false;
    return mode !== "online" || item.mode === "online";
  }).sort((a, b) => sort === "provider" ? a.provider.localeCompare(b.provider,"de") || a.id.localeCompare(b.id) : Number(b.mode === "local") - Number(a.mode === "local"));
}
