type LiveLanguage = "de" | "en";
type LiveEvent = Record<string, any>;

const CATEGORY_LABELS: Record<string, Record<LiveLanguage, string>> = {
  drones: { de: "Drohnenvorfall", en: "Drone incident" },
  critical_infrastructure: { de: "Vorfall an kritischer Infrastruktur", en: "Critical infrastructure incident" },
  cyber: { de: "Cyberangriff", en: "Cyberattack" },
  it_outage: { de: "Größerer IT-Ausfall", en: "Major IT outage" },
  power_outage: { de: "Stromausfall", en: "Power outage" },
  telecom_outage: { de: "Telekommunikationsausfall", en: "Telecommunications outage" },
  drinking_water: { de: "Trinkwasserproblem", en: "Drinking water incident" },
  flood: { de: "Hochwasserlage", en: "Flood emergency" },
  heavy_rain: { de: "Starkregenwarnung", en: "Heavy rain warning" },
  storm: { de: "Sturmwarnung", en: "Storm warning" },
  extreme_heat: { de: "Warnung vor extremer Hitze", en: "Extreme heat warning" },
  wildfire: { de: "Waldbrand", en: "Wildfire" },
  earthquake: { de: "Erdbeben", en: "Earthquake" },
  volcano: { de: "Vulkanausbruch", en: "Volcanic eruption" },
  tsunami: { de: "Tsunamiwarnung", en: "Tsunami warning" },
  severe_weather: { de: "Schwere Unwetterwarnung", en: "Severe weather warning" },
  evacuation: { de: "Evakuierung", en: "Evacuation" },
  major_fire: { de: "Großbrand", en: "Major fire" },
  chemical_incident: { de: "Chemieunfall", en: "Chemical incident" },
  hazmat: { de: "Gefahrstoffaustritt", en: "Hazardous materials incident" },
  radiological: { de: "Radiologisches oder nukleares Ereignis", en: "Radiological or nuclear incident" },
  transport_outage: { de: "Ausfall der Verkehrsinfrastruktur", en: "Transport infrastructure outage" },
  supply_disruption: { de: "Erhebliche Versorgungsstörung", en: "Major supply disruption" },
  civil_protection: { de: "Katastrophenschutzlage", en: "Civil protection incident" },
  official_warning: { de: "Amtliche Warnmeldung", en: "Official warning" },
  international_security: { de: "Kriegs- und Konfliktlage", en: "War and conflict update" },
};

const COUNTRY_NAMES: Record<string, Record<LiveLanguage, string>> = {
  Deutschland: { de: "Deutschland", en: "Germany" },
  Germany: { de: "Deutschland", en: "Germany" },
  "United States": { de: "Vereinigte Staaten", en: "United States" },
  USA: { de: "Vereinigte Staaten", en: "United States" },
  "United States of America": { de: "Vereinigte Staaten", en: "United States" },
  International: { de: "International", en: "International" },
  Russland: { de: "Russland", en: "Russia" },
  Russia: { de: "Russland", en: "Russia" },
  Ukraine: { de: "Ukraine", en: "Ukraine" },
  Israel: { de: "Israel", en: "Israel" },
  Iran: { de: "Iran", en: "Iran" },
  Libanon: { de: "Libanon", en: "Lebanon" },
  Lebanon: { de: "Libanon", en: "Lebanon" },
  Syrien: { de: "Syrien", en: "Syria" },
  Syria: { de: "Syrien", en: "Syria" },
  Jemen: { de: "Jemen", en: "Yemen" },
  Yemen: { de: "Jemen", en: "Yemen" },
  Sudan: { de: "Sudan", en: "Sudan" },
  "Palästinensische Gebiete": { de: "Palästinensische Gebiete", en: "Palestinian territories" },
  "Palestinian territories": { de: "Palästinensische Gebiete", en: "Palestinian territories" },
  "Demokratische Republik Kongo": { de: "Demokratische Republik Kongo", en: "Democratic Republic of the Congo" },
  "Democratic Republic of the Congo": { de: "Demokratische Republik Kongo", en: "Democratic Republic of the Congo" },
  Philippines: { de: "Philippinen", en: "Philippines" },
  Mexico: { de: "Mexiko", en: "Mexico" },
  Spain: { de: "Spanien", en: "Spain" },
  Italy: { de: "Italien", en: "Italy" },
  Greece: { de: "Griechenland", en: "Greece" },
  Turkey: { de: "Türkei", en: "Türkiye" },
  Türkiye: { de: "Türkei", en: "Türkiye" },
  France: { de: "Frankreich", en: "France" },
  Poland: { de: "Polen", en: "Poland" },
  "United Kingdom": { de: "Vereinigtes Königreich", en: "United Kingdom" },
  India: { de: "Indien", en: "India" },
  Indonesia: { de: "Indonesien", en: "Indonesia" },
};

const SEVERITY_WORDS: Record<string, Record<LiveLanguage, string>> = {
  critical: { de: "kritisch", en: "critical" },
  high: { de: "hoch", en: "high" },
  medium: { de: "erhöht", en: "elevated" },
  low: { de: "gering", en: "low" },
  info: { de: "informativ", en: "informational" },
};

const SOURCE_NAMES: Record<string, Record<LiveLanguage, string>> = {
  "NASA EONET · Laufende Naturereignisse": { de: "NASA EONET · Laufende Naturereignisse", en: "NASA EONET · Active natural events" },
  "USGS · Signifikante Erdbeben": { de: "USGS · Signifikante Erdbeben", en: "USGS · Significant earthquakes" },
  "NOAA/NWS · Schwere Wetterwarnungen": { de: "NOAA/NWS · Schwere Wetterwarnungen", en: "NOAA/NWS · Severe weather alerts" },
  "UN News · Kriege und Konflikte": { de: "UN News · Kriege und Konflikte", en: "UN News · Wars and conflicts" },
  "BBK · Aktuelle Meldungen": { de: "BBK · Aktuelle Meldungen", en: "BBK · Latest reports" },
  "Presseportal · Polizei, Feuerwehr und Behörden": { de: "Presseportal · Polizei, Feuerwehr und Behörden", en: "Presseportal · Police, fire and public authorities" },
};

const GERMAN_WORDS = /\b(?:amtlich(?:e|er|es)?|warnung|meldet|gemeldet|wurde|werden|der|die|das|und|für|vor|bei|durch|ausgegeben|ereignis|lage|sturm|hochwasser|erdbeben|waldbrand|angriff|gefahr)\b/i;
const ENGLISH_WORDS = /\b(?:official|warning|reports?|reported|issued|the|and|for|near|from|by|event|storm|flood|earthquake|wildfire|attack|danger|severe)\b/i;

function sourceLanguage(value: unknown): LiveLanguage | null {
  const text = String(value || "").trim();
  if (!text) return null;
  const german = (text.match(new RegExp(GERMAN_WORDS.source, "gi")) || []).length + (/[äöüß]/i.test(text) ? 2 : 0);
  const english = (text.match(new RegExp(ENGLISH_WORDS.source, "gi")) || []).length;
  if (german > english) return "de";
  if (english > german) return "en";
  return null;
}

function countryName(value: unknown, language: LiveLanguage): string {
  const country = String(value || "International").trim() || "International";
  return COUNTRY_NAMES[country]?.[language] || country;
}

export function localizedSourceName(value: unknown, language: LiveLanguage): string {
  const name = String(value || "").trim();
  return SOURCE_NAMES[name]?.[language] || name;
}

function directionName(value: string, language: LiveLanguage): string {
  if (language === "en") return value;
  const directions: Record<string, string> = { N: "nördlich", NE: "nordöstlich", E: "östlich", SE: "südöstlich", S: "südlich", SW: "südwestlich", W: "westlich", NW: "nordwestlich" };
  return value.replace(/^(\d+(?:\.\d+)?)\s*km\s+(N|NE|E|SE|S|SW|W|NW)\s+of\s+/i, (_, distance, direction) => `${distance} km ${directions[String(direction).toUpperCase()] || direction} von `);
}

function cleanLocation(event: LiveEvent, language: LiveLanguage): string {
  const raw = String(event.city || event.region || "").trim();
  if (language === "de" && /\b(?:area including|county|coastal waters|waters from|until|zone)\b/i.test(raw)) return countryName(event.country, language);
  if (language === "en" && /\b(?:kreis|landkreis|bezirk|gemeinde|stadtgebiet)\b/i.test(raw)) return countryName(event.country, language);
  const stripped = raw
    .replace(/^(?:major|large|extreme|active|ongoing)?\s*(?:wildfire|flood|storm|volcano|earthquake|drought|landslide)\s*[-–:]\s*/i, "")
    .replace(/^(?:waldbrand|hochwasser|sturm|vulkan|erdbeben)\s*[-–:]\s*/i, "")
    .replace(/^Super Typhoon\s+/i, language === "de" ? "Supertaifun " : "Super Typhoon ")
    .trim();
  return directionName(stripped || countryName(event.country, language), language);
}

function magnitude(event: LiveEvent): string | null {
  const value = `${event.title || ""} ${event.summary || ""} ${(event.tags || []).join(" ")}`.match(/(?:\bM\s*|Magnitude\s*)(\d+(?:[.,]\d+)?)/i)?.[1];
  return value ? value.replace(",", ".") : null;
}

function conflictKind(event: LiveEvent, language: LiveLanguage): string {
  const text = `${event.title || ""} ${event.summary || ""}`.toLowerCase();
  const entries: Array<[RegExp, string, string]> = [
    [/missile|raketen/, "Raketenangriff", "Missile attack"],
    [/drone|drohnen/, "Drohnenangriff", "Drone attack"],
    [/airstrike|luftangriff/, "Luftangriff", "Airstrike"],
    [/shelling|beschuss|bombard/, "Beschuss", "Shelling"],
    [/ceasefire|waffenruhe|waffenstillstand/, "Waffenruhe", "Ceasefire"],
    [/invasion|offensive/, "Militäroffensive", "Military offensive"],
    [/fighting|clash|gefecht|kampfhandlung/, "Gefechte", "Fighting"],
    [/explosion/, "Explosion", "Explosion"],
  ];
  const match = entries.find(([pattern]) => pattern.test(text));
  return match ? match[language === "de" ? 1 : 2] : CATEGORY_LABELS.international_security[language];
}

function translatedTitle(event: LiveEvent, language: LiveLanguage): string {
  const location = cleanLocation(event, language);
  if (event.category === "earthquake") {
    const strength = magnitude(event);
    return language === "de"
      ? `${strength ? `Erdbeben der Stärke ${strength.replace(".", ",")}` : "Erdbeben"} – ${location}`
      : `${strength ? `Magnitude ${strength} earthquake` : "Earthquake"} – ${location}`;
  }
  if (event.category === "international_security") {
    // Translate narrowly recognized statements without inventing attack details.
    // Unrecognized headlines keep the conservative category/topic fallback.
    const headline = String(event.title || "");
    if (language === "de" && /Guterres calls for (?:an? )?end to (?:US-Iran|U\.S\.-Iran) conflict/i.test(headline))
      return "Guterres fordert ein Ende des USA-Iran-Konflikts";
    if (language === "de" && /^Ukraine:.*UN condemns (?:latest|new) attacks.*civilian protection/i.test(headline))
      return "UN verurteilt neue Angriffe in der Ukraine und fordert Schutz der Zivilbevölkerung";
    const topic = event.tags?.includes("conflict:us-iran") ? "USA / Iran" : event.tags?.includes("conflict:russia-ukraine") ? (language === "de" ? "Russland / Ukraine" : "Russia / Ukraine") : location;
    return `${conflictKind(event, language)} – ${topic}`;
  }
  const label = CATEGORY_LABELS[String(event.category)]?.[language] || (language === "de" ? "Sicherheitsrelevante Meldung" : "Safety-related report");
  return `${label} – ${location}`;
}

function translatedSummary(event: LiveEvent, language: LiveLanguage): string {
  const source = localizedSourceName(event.sources?.[0]?.name || event.organizations?.[0], language) || (language === "de" ? "Die angegebene Quelle" : "The listed source");
  const location = cleanLocation(event, language);
  const label = CATEGORY_LABELS[String(event.category)]?.[language] || (language === "de" ? "sicherheitsrelevantes Ereignis" : "safety-related incident");
  const severity = SEVERITY_WORDS[String(event.severity)]?.[language] || SEVERITY_WORDS.medium[language];
  if (language === "de") {
    if (event.category === "international_security") return `${translatedTitle(event, language)}. Quelle: ${source}. Einzelheiten und die ursprüngliche Meldung stehen in der verlinkten Originalquelle.`;
    return `${source} meldet für ${location} eine Lage der Kategorie „${label}“. Die Gefahrenstufe wird als ${severity} eingeordnet. Weitere Einzelheiten stehen in der verlinkten Originalquelle.`;
  }
  return `${source} reports an incident in the “${label}” category for ${location}. The severity level is classified as ${severity}. Further details are available from the linked original source.`;
}

function localizedField(value: unknown, event: LiveEvent, language: LiveLanguage, field: "title" | "summary"): string {
  const text = String(value || "").trim();
  if (text && (event.tags?.includes(`source-language:${language}`) || sourceLanguage(text) === language)) return text;
  return field === "title" ? translatedTitle(event, language) : translatedSummary(event, language);
}

export function localizeLiveEvent<T extends LiveEvent>(event: T, language: LiveLanguage): T {
  const localizedCountry = countryName(event.country, language);
  const localized = { ...event, country: localizedCountry } as T;
  localized.title = localizedField(event.title, event, language, "title");
  localized.summary = localizedField(event.summary, event, language, "summary");
  if (Array.isArray(event.sources)) {
    localized.sources = event.sources.map((source: LiveEvent) => ({
      ...source,
      name: localizedSourceName(source.name, language),
      title: language === "de" ? `Originalmeldung von ${localizedSourceName(source.name, language) || "der Quelle"}` : `Original report by ${localizedSourceName(source.name, language) || "the source"}`,
    }));
  }
  if (Array.isArray(event.related_events)) {
    localized.related_events = event.related_events.map((related: LiveEvent) => localizeLiveEvent({ ...related, category: event.category, severity: event.severity, sources: event.sources, organizations: event.organizations, tags: event.tags }, language));
  }
  return localized;
}

export function liveLanguage(value: string | null): LiveLanguage {
  return value === "en" ? "en" : "de";
}
