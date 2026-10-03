import type { NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

function severityFor(properties: any): Severity {
  const alert = String(properties?.alert || "").toLowerCase();
  const magnitude = Number(properties?.mag || 0);
  const significance = Number(properties?.sig || 0);
  if (alert === "red" || magnitude >= 7.5 || significance >= 1000) return "critical";
  if (alert === "orange" || magnitude >= 6 || significance >= 600 || Number(properties?.tsunami) === 1) return "high";
  return "medium";
}

function countryFromPlace(place: string): string {
  const parts = place.split(",").map(value => value.trim()).filter(Boolean);
  const last = plainText(parts.at(-1) || "International", 120);
  const usRegions = new Set([
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "Puerto Rico", "U.S. Virgin Islands",
  ]);
  return usRegions.has(last) ? "United States" : last;
}

export const usgsAdapter: NewsSourceAdapter = {
  key: "usgs",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const payload = JSON.parse(await fetchStructured(endpoint, "application/geo+json, application/json")) as { features?: any[] };
    const fetchedAt = new Date().toISOString();
    const canonical = safePublicUrl(String(source.config.canonical_url || source.config.endpoint), source.allowed_hosts);

    return (payload.features || []).flatMap(feature => {
      const properties = feature?.properties || {};
      const title = plainText(properties.title || `Erdbeben ${properties.place || ""}`, 300);
      const publishedAt = new Date(Number(properties.time));
      const place = plainText(properties.place, 220);
      const coordinates = Array.isArray(feature?.geometry?.coordinates) ? feature.geometry.coordinates : [];
      if (title.length < 5 || Number.isNaN(publishedAt.getTime())) return [];
      let sourceUrl = canonical;
      try { sourceUrl = safePublicUrl(String(properties.url || canonical), source.allowed_hosts); } catch { /* canonical fallback */ }
      const magnitude = Number(properties.mag || 0);

      return [{
        externalId: plainText(feature.id || properties.code || `${title}-${publishedAt.toISOString()}`, 500),
        title,
        summary: plainText(`Signifikantes Erdbeben der Magnitude ${magnitude.toFixed(1)}${place ? ` bei ${place}` : ""}.`, 1200),
        category: "earthquake",
        severity: severityFor(properties),
        verificationStatus: "official",
        sourceTrustLevel: "official",
        sourceName: source.name,
        sourceUrl,
        canonicalUrl: sourceUrl,
        publishedAt: publishedAt.toISOString(),
        fetchedAt,
        country: countryFromPlace(place),
        region: place || undefined,
        latitude: Number.isFinite(Number(coordinates[1])) ? Number(coordinates[1]) : undefined,
        longitude: Number.isFinite(Number(coordinates[0])) ? Number(coordinates[0]) : undefined,
        geographicScope: "international",
        affectedRadiusKm: magnitude >= 7 ? 500 : magnitude >= 6 ? 250 : 100,
        expiresAt: new Date(publishedAt.getTime() + 7 * 86400000).toISOString(),
        organizations: ["United States Geological Survey"],
        tags: ["Erdbeben", `Magnitude ${magnitude.toFixed(1)}`, properties.alert, Number(properties.tsunami) === 1 ? "Tsunami-Hinweis" : ""].filter(Boolean),
        rawPayload: feature,
      } satisfies NormalizedNewsItem];
    });
  },
};
