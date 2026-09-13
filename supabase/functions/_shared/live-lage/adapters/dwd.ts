import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

function categoryFor(value: string): NewsCategory {
  const text = value.toLowerCase();
  if (text.includes("hochwasser") || text.includes("flut")) return "flood";
  if (text.includes("starkregen") || text.includes("dauerregen")) return "heavy_rain";
  if (text.includes("hitze")) return "extreme_heat";
  if (text.includes("waldbrand")) return "wildfire";
  if (text.includes("sturm") || text.includes("orkan") || text.includes("wind")) return "storm";
  if (text.includes("gewitter") || text.includes("schnee") || text.includes("glätte") || text.includes("nebel")) return "severe_weather";
  return "official_warning";
}

function severityFor(level: unknown): Severity {
  const value = Number(level);
  return value >= 4 ? "critical" : value >= 3 ? "high" : value >= 2 ? "medium" : "low";
}

export const dwdAdapter: NewsSourceAdapter = {
  key: "dwd",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const body = await fetchStructured(endpoint, "application/json");
    // The WarnWetter endpoint is JSONP (`warnWetter.loadWarnings({...});`),
    // despite the historic .json filename. Extract only the JSON object and
    // let JSON.parse reject anything that is not valid structured data.
    const objectStart = body.indexOf("{");
    const objectEnd = body.lastIndexOf("}");
    if (objectStart < 0 || objectEnd <= objectStart) throw new Error("DWD response contains no JSON object");
    const payload = JSON.parse(body.slice(objectStart, objectEnd + 1)) as { warnings?: Record<string, unknown[]> };
    const now = new Date().toISOString();
    const canonical = safePublicUrl(String(source.config.canonical_url || source.config.endpoint), source.allowed_hosts);
    const warnings = Object.values(payload.warnings || {}).flat();
    return warnings.flatMap((raw: any) => {
      const title = plainText(raw.headline || raw.event || "Amtliche Wetterwarnung", 300);
      const region = plainText(raw.regionName || raw.areaDesc || "", 180);
      const publishedAt = new Date(Number(raw.start || Date.now())).toISOString();
      if (title.length < 5) return [];
      return [{
        externalId: plainText(raw.identifier || raw.id || `${region}-${publishedAt}-${title}`, 500),
        title,
        summary: plainText(raw.description || raw.instruction || raw.event || "", 1200),
        category: categoryFor(`${raw.event || ""} ${title}`),
        severity: severityFor(raw.level),
        verificationStatus: "official",
        sourceTrustLevel: "official",
        sourceName: source.name,
        sourceUrl: canonical,
        canonicalUrl: canonical,
        publishedAt,
        fetchedAt: now,
        country: "Deutschland",
        region: region || undefined,
        geographicScope: region || undefined,
        expiresAt: new Date(Number(raw.end || Date.now() + 24 * 60 * 60 * 1000)).toISOString(),
        organizations: ["Deutscher Wetterdienst"],
        tags: ["Wetterwarnung", plainText(raw.event || "", 80)].filter(Boolean),
        rawPayload: raw,
      } satisfies NormalizedNewsItem];
    });
  },
};
