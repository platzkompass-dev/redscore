import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

function field(block: string, names: string[]): string {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    if (match?.[1]) return plainText(match[1].replace(/^<!\\[CDATA\\[/, "").replace(/\\]\\]>$/, ""), 4000);
  }
  return "";
}

function categoryFor(value: string): NewsCategory | null {
  const text = value.toLowerCase();
  if (/drohn|drone|uav/.test(text)) return "drones";
  if (/cyber|ransomware|hacker|it-ausfall|it.?ausfall/.test(text)) return "cyber";
  if (/stromausfall|blackout|power outage/.test(text)) return "power_outage";
  if (/mobilfunk|telekommunikation|telefonnetz|telecom/.test(text)) return "telecom_outage";
  if (/trinkwasser|wasserwerk|drinking water/.test(text)) return "drinking_water";
  if (/hochwasser|überschwemm|überflut|flood/.test(text)) return "flood";
  if (/starkregen|dauerregen|heavy rain/.test(text)) return "heavy_rain";
  if (/sturm|orkan|unwetter|storm|hurricane/.test(text)) return "storm";
  if (/hitze|hitzewelle|extreme heat/.test(text)) return "extreme_heat";
  if (/waldbrand|wildfire/.test(text)) return "wildfire";
  if (/erdbeben|earthquake/.test(text)) return "earthquake";
  if (/vulkan|volcano/.test(text)) return "volcano";
  if (/tsunami/.test(text)) return "tsunami";
  if (/evaku|räumung|evacuat/.test(text)) return "evacuation";
  if (/großbrand|grossbrand|brandserie|major fire/.test(text)) return "major_fire";
  if (/chemieunfall|gefahrstoff|chemical|hazmat/.test(text)) return "chemical_incident";
  if (/radioaktiv|radiologisch|nuklear|nuclear/.test(text)) return "radiological";
  if (/kritische infrastr|critical infrastr|sabotage|angriff auf/.test(text)) return "critical_infrastructure";
  if (/it.?ausfall|systemausfall|serverausfall|dienste? (?:nicht erreichbar|ausgefallen)|systeme? (?:nicht erreichbar|ausgefallen)|network outage/.test(text)) return "it_outage";
  if (/versorgungs(?:störung|ausfall|engpass)|lieferengpass|supply disruption/.test(text)) return "supply_disruption";
  if (/(?:bahnstrecke|flughafen|airport|verkehrsinfrastr).*(?:gesperrt|geschlossen|ausfall|eingestellt|unterbrochen)|(?:gesperrt|geschlossen|ausfall).*(?:bahnstrecke|flughafen|airport)/.test(text)) return "transport_outage";
  if (/amtliche (?:unwetter)?warnung|warnmeldung (?:ausgegeben|aktualisiert)|gefahreninformation|akute gefahr/.test(text)) return "official_warning";
  return null;
}

function isCurrentIncident(category: NewsCategory, value: string): boolean {
  const text = value.toLowerCase();
  if (/ratgeber|gebärdensprache|\bdgs\b|warntag|bilanz|veranstaltung|projekt|forschung|fähigkeitsmanagement|publikation|interview|erklärvideo|tipps? (?:für|zur)|wie (?:kann|können|funktioniert)|vorsorge(?:n|tipps|ratgeber)/.test(text)) return false;
  const active = /aktuell|heute|gestern|meldet|gemeldet|ereignis|vorfall|alarm|warnung|gefahr|ausgefallen|beeinträchtigt|unterbrochen|gesperrt|evakuiert|ausgetreten|brennt|überschwemmt|überflutet|tritt auf|erwartet|angriff|attacke|sichtung|gesichtet|explosion/.test(text);
  if (!active) return false;
  if (category === "drones") return /sichtung|gesichtet|alarm|vorfall|gesperrt/.test(text) && /flughafen|airport|militär|bundeswehr|kritische infrastr|kraftwerk|hafen|bahn|polizei/.test(text);
  if (category === "cyber") return /angriff|attacke|ransomware|ausfall|beeinträchtigt|störung/.test(text);
  return true;
}

function severityFor(category: NewsCategory, value: string): Severity {
  const text = value.toLowerCase();
  if (/nuklear|radioaktiv|terror|tote|lebensgefahr|mass evacuation/.test(text)) return "critical";
  if (["drones", "cyber", "critical_infrastructure", "power_outage", "major_fire", "chemical_incident", "radiological", "evacuation"].includes(category)) return "high";
  if (/warnung|alarm|gefahr|ausfall|evaku|gesperrt|hochwasser|orkan/.test(text)) return "high";
  return "medium";
}

function locationFor(value: string): { country: string; region?: string; city?: string } {
  const text = value.toLowerCase();
  const regions: Array<[RegExp, string, string?]> = [
    [/\bschönefeld\b|flughafen ber|airport ber|berlin brandenburg airport/, "Brandenburg", "Schönefeld"],
    [/\bberlin\b/, "Berlin", "Berlin"], [/brandenburg|potsdam/, "Brandenburg"],
    [/niedersachsen|hannover|stade/, "Niedersachsen"], [/\bhamburg\b/, "Hamburg", "Hamburg"], [/bayern|münchen|munich/, "Bayern"],
    [/sachsen|dresden|leipzig/, "Sachsen"], [/hessen|frankfurt/, "Hessen"],
    [/nordrhein.?westfalen|köln|cologne|düsseldorf/, "Nordrhein-Westfalen"],
    [/schleswig.?holstein|kiel|lübeck/, "Schleswig-Holstein"],
    [/baden.?württemberg|stuttgart|karlsruhe|freiburg im breisgau/, "Baden-Württemberg"],
    [/rheinland.?pfalz|mainz|koblenz/, "Rheinland-Pfalz"], [/saarland|saarbrücken/, "Saarland"],
    [/mecklenburg.?vorpommern|schwerin|rostock/, "Mecklenburg-Vorpommern"],
    [/sachsen.?anhalt|magdeburg|halle \(saale\)/, "Sachsen-Anhalt"], [/thüringen|erfurt|jena/, "Thüringen"],
    [/bremen|bremerhaven/, "Bremen"],
  ];
  const hit = regions.find(([pattern]) => pattern.test(text));
  return { country: hit || /deutschland|germany/.test(text) ? "Deutschland" : "International", region: hit?.[1], city: hit?.[2] };
}

export const rssAdapter: NewsSourceAdapter = {
  key: "rss",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const body = await fetchStructured(endpoint, "application/rss+xml, application/atom+xml, application/xml, text/xml");
    const blocks = [...(body.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || []), ...(body.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [])];
    const now = new Date().toISOString();
    const configuredTerms = String(source.config.query || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    return blocks.flatMap(block => {
      const title = field(block, ["title"]);
      const summary = field(block, ["description", "summary", "content"]);
      const combined = `${title} ${summary}`;
      const category = categoryFor(combined);
      if (title.length < 8 || !category || !isCurrentIncident(category, combined) || (configuredTerms.length && !configuredTerms.some(term => combined.toLowerCase().includes(term)))) return [];
      const linkRaw = field(block, ["link", "guid", "id"]);
      let sourceUrl: string;
      try { sourceUrl = safePublicUrl(linkRaw || String(source.config.canonical_url || endpoint), source.allowed_hosts); }
      catch { return []; }
      const publishedRaw = field(block, ["pubDate", "published", "updated", "dc:date"]);
      const publishedDate = new Date(publishedRaw || Date.now());
      if (Number.isNaN(publishedDate.getTime())) return [];
      const location = locationFor(combined);
      return [{
        externalId: field(block, ["guid", "id"]) || sourceUrl,
        title,
        summary: summary || `${source.trust_level === "official" ? "Amtliche sicherheitsrelevante Meldung" : "Sicherheitsrelevante Meldung"} von ${source.name}.`,
        category,
        severity: severityFor(category, combined),
        verificationStatus: source.trust_level === "official" ? "official" : source.trust_level === "verified" ? "verified" : source.trust_level === "osint" ? "osint_unconfirmed" : "unknown",
        sourceTrustLevel: source.trust_level,
        sourceName: source.name,
        sourceUrl,
        canonicalUrl: sourceUrl,
        publishedAt: publishedDate.toISOString(),
        fetchedAt: now,
        country: location.country,
        region: location.region,
        city: location.city,
        geographicScope: location.region || location.country,
        organizations: [source.name],
        tags: [category, "RSS", source.trust_level === "official" ? "offizielle Quelle" : "bestätigte Quelle"],
        rawPayload: { title, publishedRaw },
      } satisfies NormalizedNewsItem];
    });
  },
};
