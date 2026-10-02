import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

const trustedDomains = new Set([
  "tagesschau.de", "rbb24.de", "ndr.de", "wdr.de", "swr.de", "br.de", "mdr.de",
  "deutschlandfunk.de", "dw.com", "reuters.com", "apnews.com", "heise.de", "golem.de",
  "zeit.de", "sueddeutsche.de", "faz.net", "handelsblatt.com", "spiegel.de", "welt.de",
  "bundesregierung.de", "bmv.de", "bundespolizei.de", "polizei.brandenburg.de",
]);

const safetySignals = [
  "drone", "uav", "cyberattack", "ransomware", "blackout", "power outage", "network outage",
  "telecommunications outage", "critical infrastructure", "drinking water", "flood", "storm",
  "hurricane", "tornado", "extreme heat", "wildfire", "earthquake", "volcano", "tsunami",
  "evacuation", "major fire", "chemical leak", "hazardous material", "radiological", "nuclear",
  "rail disruption", "airport closure", "supply disruption", "civil protection", "sabotage",
];

function hostname(value: string): string {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function trusted(host: string): boolean {
  return [...trustedDomains].some(domain => host === domain || host.endsWith(`.${domain}`));
}

function categoryFor(value: string): NewsCategory | null {
  const text = value.toLowerCase();
  if (/drone|drohne|uav/.test(text)) return "drones";
  if (/cyber|ransomware|hacker|datenangriff/.test(text)) return "cyber";
  if (/it outage|system outage|computerausfall/.test(text)) return "it_outage";
  if (/power outage|blackout|stromausfall/.test(text)) return "power_outage";
  if (/telecom|mobile network|mobilfunk|telefonnetz/.test(text)) return "telecom_outage";
  if (/drinking water|trinkwasser/.test(text)) return "drinking_water";
  if (/flood|hochwasser|überflutung|ueberflutung/.test(text)) return "flood";
  if (/heavy rain|starkregen/.test(text)) return "heavy_rain";
  if (/storm|hurricane|orkan|sturm|tornado/.test(text)) return "storm";
  if (/extreme heat|hitzewelle/.test(text)) return "extreme_heat";
  if (/wildfire|waldbrand/.test(text)) return "wildfire";
  if (/earthquake|erdbeben/.test(text)) return "earthquake";
  if (/volcano|vulkan/.test(text)) return "volcano";
  if (/tsunami/.test(text)) return "tsunami";
  if (/evacuat|evakuier|räumung|raeumung/.test(text)) return "evacuation";
  if (/major fire|großbrand|grossbrand/.test(text)) return "major_fire";
  if (/chemical|chemieunfall/.test(text)) return "chemical_incident";
  if (/hazardous|gefahrstoff/.test(text)) return "hazmat";
  if (/radiological|nuclear|radioaktiv/.test(text)) return "radiological";
  if (/airport closure|rail disruption|verkehrsausfall|flughafen.*gesperrt/.test(text)) return "transport_outage";
  if (/supply disruption|versorgungsengpass/.test(text)) return "supply_disruption";
  if (/critical infrastructure|kritische infrastruktur|sabotage/.test(text)) return "critical_infrastructure";
  if (/civil protection|katastrophenschutz/.test(text)) return "civil_protection";
  return null;
}

function severityFor(category: NewsCategory, value: string): Severity {
  const text = value.toLowerCase();
  if (/nuclear|radiological|radioaktiv|terror|fatal|tote|mass evacuation/.test(text)) return "critical";
  if (["drones", "cyber", "critical_infrastructure", "power_outage", "major_fire", "chemical_incident", "hazmat", "evacuation"].includes(category)) return "high";
  if (/closure|closed|gesperrt|disruption|ausfall|warning|alarm/.test(text)) return "high";
  return "medium";
}

function parseSeenDate(value: unknown): string | null {
  const raw = String(value || "");
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function place(value: string): { region?: string; city?: string } {
  const candidates: Array<[RegExp, string, string?]> = [
    [/berlin|schönefeld|(?:^|[\s(])ber(?:[\s).,-]|$)/i, "Brandenburg", "Berlin / Schönefeld"],
    [/hamburg/i, "Hamburg", "Hamburg"], [/bremen/i, "Bremen", "Bremen"],
    [/niedersachsen|hanover|hannover/i, "Niedersachsen"], [/brandenburg|potsdam/i, "Brandenburg"],
    [/bayern|munich|münchen/i, "Bayern"], [/sachsen|dresden|leipzig/i, "Sachsen"],
    [/nordrhein-westfalen|cologne|köln|düsseldorf/i, "Nordrhein-Westfalen"],
    [/hessen|frankfurt/i, "Hessen"], [/baden-württemberg|stuttgart/i, "Baden-Württemberg"],
    [/schleswig-holstein|kiel|lübeck/i, "Schleswig-Holstein"],
  ];
  const hit = candidates.find(([pattern]) => pattern.test(value));
  return hit ? { region: hit[1], city: hit[2] } : {};
}

export const gdeltAdapter: NewsSourceAdapter = {
  key: "gdelt",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    endpoint.search = new URLSearchParams({
      query: String(source.config.query || `(${safetySignals.join(" OR ")}) sourcecountry:Germany`),
      mode: "artlist",
      format: "json",
      maxrecords: "250",
      timespan: "14d",
      sort: "datedesc",
    }).toString();
    const body = await fetchStructured(endpoint, "application/json");
    const payload = JSON.parse(body) as { articles?: Array<Record<string, unknown>> };
    const now = new Date().toISOString();
    return (Array.isArray(payload.articles) ? payload.articles : []).flatMap(article => {
      const title = plainText(article.title, 300);
      const url = String(article.url || "");
      const host = hostname(url);
      const publishedAt = parseSeenDate(article.seendate);
      const eventCategory = categoryFor(title);
      if (title.length < 8 || !publishedAt || !eventCategory || !trusted(host)) return [];
      let sourceUrl: string;
      try { sourceUrl = safePublicUrl(url, source.allowed_hosts); }
      catch { return []; }
      const location = place(title);
      return [{
        externalId: sourceUrl,
        title,
        summary: `Sicherheitsrelevante Meldung von ${host}. RedScore zeigt den Fund mit Verifizierungsstatus; Einzelheiten stehen in der Originalquelle.`,
        category: eventCategory,
        severity: severityFor(eventCategory, title),
        verificationStatus: "verified",
        sourceTrustLevel: "verified",
        sourceName: host,
        sourceUrl,
        canonicalUrl: sourceUrl,
        publishedAt,
        fetchedAt: now,
        country: "Deutschland",
        region: location.region,
        city: location.city,
        geographicScope: location.region || "Deutschland",
        organizations: [host],
        tags: [eventCategory, "GDELT", "Medienbeobachtung"],
        rawPayload: { domain: host, language: article.language, sourcecountry: article.sourcecountry },
      } satisfies NormalizedNewsItem];
    });
  },
};
