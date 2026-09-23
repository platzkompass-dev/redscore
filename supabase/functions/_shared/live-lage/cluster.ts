const WEATHER_CATEGORIES = new Set(["official_warning", "storm", "heavy_rain", "flood", "severe_weather", "extreme_heat"]);
const TITLE_NOISE = new Set(["amtliche", "warnung", "wetterwarnung", "unwetterwarnung", "vor", "fuer", "fur", "der", "die", "das", "und"]);
const SEVERITY_WEIGHT: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

type LiveEvent = Record<string, any>;

function comparableTitle(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß ]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 1 && !TITLE_NOISE.has(token))
    .join(" ")
    .trim();
}

function sourceKey(event: LiveEvent): string {
  const first = Array.isArray(event.sources) ? event.sources[0] : null;
  if (first?.name) return String(first.name).toLowerCase().trim();
  try { return new URL(String(event.canonical_url || "")).hostname.replace(/^www\./, ""); }
  catch { return "unknown"; }
}

function eventTime(event: LiveEvent): number {
  return Date.parse(String(event.published_at || event.updated_at || 0)) || 0;
}

function isSamePublicIncident(left: LiveEvent, right: LiveEvent): boolean {
  if (String(left.category || "") !== String(right.category || "")) return false;
  if (String(left.country || "").toLowerCase() !== String(right.country || "").toLowerCase()) return false;
  if (Math.abs(eventTime(left) - eventTime(right)) > 12 * 60 * 60 * 1000) return false;
  if (comparableTitle(left.title) !== comparableTitle(right.title)) return false;
  if (sourceKey(left) !== sourceKey(right)) return false;

  const officialWeather = WEATHER_CATEGORIES.has(String(left.category || "")) &&
    (left.verification_status === "official" || right.verification_status === "official");
  if (officialWeather) return true;

  const leftPlace = `${left.city || ""}|${left.region || ""}`.toLowerCase();
  const rightPlace = `${right.city || ""}|${right.region || ""}`.toLowerCase();
  return leftPlace === rightPlace || (left.canonical_url && left.canonical_url === right.canonical_url);
}

function uniqueSources(events: LiveEvent[]): LiveEvent[] {
  const seen = new Set<string>();
  return events.flatMap(event => Array.isArray(event.sources) ? event.sources : []).filter(source => {
    const key = `${String(source?.url || "").toLowerCase()}|${String(source?.name || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function relevanceScore(event: LiveEvent): number {
  return Number(event.relevance?.score || 0);
}

export function clusterLiveEvents<T extends LiveEvent>(events: T[]): T[] {
  const groups: T[][] = [];
  for (const event of events) {
    const group = groups.find(candidate => isSamePublicIncident(candidate[0], event));
    if (group) group.push(event);
    else groups.push([event]);
  }

  return groups.map(group => {
    const members = [...group].sort((left, right) =>
      relevanceScore(right) - relevanceScore(left) ||
      (SEVERITY_WEIGHT[String(right.severity || "info")] || 0) - (SEVERITY_WEIGHT[String(left.severity || "info")] || 0) ||
      eventTime(right) - eventTime(left)
    );
    const representative = members[0];
    if (members.length === 1) return representative;

    const affectedRegions = [...new Set(members.flatMap(event => [event.city, event.region]).filter(Boolean).map(String))];
    const sources = uniqueSources(members);
    return {
      ...representative,
      sources,
      source_count: sources.length,
      cluster_count: members.length,
      affected_regions: affectedRegions,
      related_events: members.map(event => ({
        id: event.id,
        title: event.title,
        summary: event.summary,
        city: event.city,
        region: event.region,
        country: event.country,
        published_at: event.published_at,
        canonical_url: event.canonical_url,
      })),
    } as T;
  });
}
