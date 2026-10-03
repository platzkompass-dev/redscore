import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

function categoryFor(event: string): NewsCategory {
  const value = event.toLowerCase();
  if (/flash flood|flood/.test(value)) return "flood";
  if (/heat/.test(value)) return "extreme_heat";
  if (/fire weather|red flag|wildfire/.test(value)) return "wildfire";
  if (/tornado|hurricane|typhoon|tropical storm|thunderstorm|wind|storm surge/.test(value)) return "storm";
  if (/tsunami/.test(value)) return "tsunami";
  return "severe_weather";
}

function severityFor(value: unknown): Severity {
  const severity = String(value || "").toLowerCase();
  return severity === "extreme" ? "critical" : severity === "severe" ? "high" : "medium";
}

export const nwsAdapter: NewsSourceAdapter = {
  key: "nws",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const payload = JSON.parse(await fetchStructured(endpoint, "application/geo+json, application/json")) as { features?: any[] };
    const fetchedAt = new Date().toISOString();
    const canonical = safePublicUrl(String(source.config.canonical_url || source.config.endpoint), source.allowed_hosts);

    return (payload.features || []).flatMap(feature => {
      const properties = feature?.properties || {};
      const event = plainText(properties.event || properties.headline || "Amtliche Unwetterwarnung", 180);
      const headline = plainText(properties.headline || event, 300);
      const sentAt = new Date(properties.sent || properties.effective || Date.now());
      const endsAt = new Date(properties.ends || properties.expires || Date.now() + 6 * 60 * 60 * 1000);
      const region = plainText(properties.areaDesc || "", 240);
      if (headline.length < 5 || Number.isNaN(sentAt.getTime())) return [];
      let sourceUrl = canonical;
      try { sourceUrl = safePublicUrl(String(feature.id || properties["@id"] || canonical), source.allowed_hosts); } catch { /* canonical fallback */ }

      return [{
        externalId: plainText(properties.id || feature.id || `${headline}-${sentAt.toISOString()}`, 500),
        title: headline,
        summary: plainText([properties.description, properties.instruction].filter(Boolean).join(" "), 1200),
        category: categoryFor(event),
        severity: severityFor(properties.severity),
        verificationStatus: "official",
        sourceTrustLevel: "official",
        sourceName: source.name,
        sourceUrl,
        canonicalUrl: sourceUrl,
        publishedAt: sentAt.toISOString(),
        fetchedAt,
        country: "United States",
        region: region || undefined,
        geographicScope: region || "United States",
        expiresAt: Number.isNaN(endsAt.getTime()) ? undefined : endsAt.toISOString(),
        organizations: ["National Weather Service", plainText(properties.senderName, 120)].filter(Boolean),
        tags: [event, plainText(properties.urgency, 60), plainText(properties.certainty, 60)].filter(Boolean),
        rawPayload: feature,
      } satisfies NormalizedNewsItem];
    });
  },
};
