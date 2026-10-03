import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

const CATEGORY_MAP: Record<string, NewsCategory> = {
  drought: "supply_disruption",
  dustHaze: "severe_weather",
  earthquakes: "earthquake",
  floods: "flood",
  landslides: "civil_protection",
  severeStorms: "storm",
  snow: "severe_weather",
  tempExtremes: "extreme_heat",
  volcanoes: "volcano",
  wildfires: "wildfire",
};

function categoryFor(categories: any[]): NewsCategory | null {
  for (const category of categories || []) {
    const mapped = CATEGORY_MAP[String(category?.id || "")];
    if (mapped) return mapped;
  }
  return null;
}

function severityFor(category: NewsCategory, title: string): Severity {
  if (/major|extreme|cat(?:egory)?\s*[45]|super typhoon|violent/i.test(title)) return "critical";
  if (["storm", "flood", "volcano", "wildfire", "extreme_heat"].includes(category)) return "high";
  return "medium";
}

function latestGeometry(geometries: any[]): any | null {
  return [...(geometries || [])]
    .filter(geometry => Number.isFinite(Date.parse(String(geometry?.date || ""))))
    .sort((left, right) => Date.parse(String(right.date)) - Date.parse(String(left.date)))[0] || null;
}

export const eonetAdapter: NewsSourceAdapter = {
  key: "eonet",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const payload = JSON.parse(await fetchStructured(endpoint, "application/json")) as { events?: any[] };
    const fetchedAt = new Date().toISOString();
    const canonical = safePublicUrl(String(source.config.canonical_url || source.config.endpoint), source.allowed_hosts);

    return (payload.events || []).flatMap(raw => {
      const title = plainText(raw?.title, 300);
      const category = categoryFor(raw?.categories || []);
      const geometry = latestGeometry(raw?.geometry || []);
      const publishedAt = new Date(geometry?.date || raw?.geometry?.[0]?.date || "");
      if (!category || title.length < 5 || Number.isNaN(publishedAt.getTime())) return [];
      const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
      const sourceUrl = safePublicUrl(`${endpoint.origin}/api/v3/events/${encodeURIComponent(String(raw.id || ""))}`, source.allowed_hosts);
      const sourceNames = (raw?.sources || []).map((item: any) => plainText(item?.id, 80)).filter(Boolean);

      return [{
        externalId: plainText(raw.id || `${title}-${publishedAt.toISOString()}`, 500),
        title,
        summary: plainText(raw.description || `Von NASA EONET als laufendes Naturereignis geführt: ${title}.`, 1200),
        category,
        severity: severityFor(category, title),
        verificationStatus: "official",
        sourceTrustLevel: "official",
        sourceName: source.name,
        sourceUrl,
        canonicalUrl: sourceUrl || canonical,
        publishedAt: publishedAt.toISOString(),
        fetchedAt,
        country: "International",
        region: title,
        latitude: Number.isFinite(Number(coordinates[1])) ? Number(coordinates[1]) : undefined,
        longitude: Number.isFinite(Number(coordinates[0])) ? Number(coordinates[0]) : undefined,
        geographicScope: "international",
        organizations: ["NASA EONET", ...sourceNames].slice(0, 8),
        tags: [category, "laufendes Ereignis", ...sourceNames].slice(0, 12),
        rawPayload: raw,
      } satisfies NormalizedNewsItem];
    });
  },
};
