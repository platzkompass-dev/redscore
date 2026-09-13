import type { NewsCategory, NewsSourceAdapter, NormalizedNewsItem, Severity, SourceConfig } from "../types.ts";
import { assertAllowedHttpsUrl, fetchStructured, plainText, safePublicUrl } from "../security.ts";

function tag(xml: string, name: string): string {
  const escaped = name.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return plainText((match?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""), 4000);
}

function categoryFor(type: string): NewsCategory {
  return ({ EQ: "earthquake", TC: "storm", FL: "flood", VO: "volcano", WF: "wildfire", DR: "supply_disruption", TS: "tsunami" } as Record<string, NewsCategory>)[type.toUpperCase()] || "civil_protection";
}

function severityFor(color: string): Severity {
  const value = color.toLowerCase();
  return value === "red" ? "critical" : value === "orange" ? "high" : value === "green" ? "medium" : "low";
}

export const gdacsAdapter: NewsSourceAdapter = {
  key: "gdacs",
  async fetch(source: SourceConfig): Promise<NormalizedNewsItem[]> {
    const endpoint = assertAllowedHttpsUrl(String(source.config.endpoint || ""), source.allowed_hosts);
    const body = await fetchStructured(endpoint, "application/rss+xml, application/xml, text/xml");
    const now = new Date().toISOString();
    const items = body.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
    return items.flatMap(item => {
      const title = tag(item, "title");
      const description = tag(item, "description");
      const eventType = tag(item, "gdacs:eventtype");
      const eventId = tag(item, "gdacs:eventid");
      const country = tag(item, "gdacs:country") || "International";
      const alert = tag(item, "gdacs:alertlevel");
      const linkValue = tag(item, "link") || String(source.config.canonical_url || "");
      let sourceUrl: string;
      try { sourceUrl = safePublicUrl(linkValue, source.allowed_hosts); }
      catch { sourceUrl = safePublicUrl(String(source.config.canonical_url || ""), source.allowed_hosts); }
      const point = tag(item, "georss:point").split(/\s+/).map(Number);
      const publishedDate = new Date(tag(item, "pubDate") || tag(item, "gdacs:fromdate") || Date.now());
      if (title.length < 5 || Number.isNaN(publishedDate.getTime())) return [];
      return [{
        externalId: `${eventType || "EVENT"}:${eventId || plainText(linkValue, 300)}`,
        title,
        summary: plainText(description, 1200),
        category: categoryFor(eventType),
        severity: severityFor(alert),
        verificationStatus: "official",
        sourceTrustLevel: "official",
        sourceName: source.name,
        sourceUrl,
        canonicalUrl: sourceUrl,
        publishedAt: publishedDate.toISOString(),
        fetchedAt: now,
        country,
        latitude: Number.isFinite(point[0]) ? point[0] : undefined,
        longitude: Number.isFinite(point[1]) ? point[1] : undefined,
        geographicScope: "international",
        expiresAt: (() => { const value = new Date(tag(item, "gdacs:todate") || Date.now() + 7 * 86400000); return Number.isNaN(value.getTime()) ? undefined : value.toISOString(); })(),
        organizations: ["GDACS", "United Nations", "European Commission"],
        tags: [eventType, alert].filter(Boolean),
        rawPayload: { eventType, eventId, country, alert, linkValue },
      } satisfies NormalizedNewsItem];
    });
  },
};
