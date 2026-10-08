// Selection is applied by PostgreSQL before its candidate limit, not afterwards.
export const filterCategories: Record<string, string[]> = {
  conflicts: ["international_security"],
  drones: ["drones"],
  cyber: ["cyber", "it_outage"],
  weather: ["flood", "heavy_rain", "storm", "extreme_heat", "severe_weather"],
  disasters: ["earthquake", "volcano", "tsunami", "wildfire", "major_fire", "evacuation"],
  infrastructure: ["critical_infrastructure", "power_outage", "telecom_outage", "transport_outage"],
  supply: ["drinking_water", "supply_disruption"],
  security: ["civil_protection", "official_warning", "international_security", "radiological", "chemical_incident", "hazmat"],
};

export function validCoordinates(lat: string | null, lon: string | null) {
  if (!lat?.trim() || !lon?.trim()) return {};
  const latitude = Number(lat), longitude = Number(lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : {};
}

export function feedLimit(value: string | null): number {
  const limit = Number(value || 12);
  return Number.isFinite(limit) ? Math.min(30, Math.max(1, Math.floor(limit))) : 12;
}

export function candidateParams(scope: string, filter: string, cutoff: string, region = "", district = "") {
  return { p_limit: 400, p_cutoff: cutoff, p_categories: filterCategories[filter] || null,
    p_scope: scope === "germany" || scope === "world" ? scope : "all", p_region: region, p_district: district };
}

// Keep the most relevant incident first; make room for a few serious conflict
// updates in a mixed overview, without displacing a nearby critical incident.
export function selectOverview<T extends Record<string, any>>(ranked: T[], limit: number, filter: string): T[] {
  const selected = ranked.slice(0, limit);
  if (filter !== "all" || limit < 3) return selected;
  const conflicts = ranked.filter(event => event.category === "international_security" && ["critical", "high"].includes(event.severity)).slice(0, 2);
  for (const event of conflicts) {
    if (selected.some(item => item.id === event.id)) continue;
    const index = selected.findLastIndex((item, position) => position > 0 && item.category !== "international_security" &&
      !(item.severity === "critical" && item.relevance?.distance_km != null && item.relevance.distance_km <= 150) &&
      !(item.severity === "critical" && item.relevance?.score >= 130));
    if (index >= 0) selected.splice(index, 1, event);
  }
  return selected.sort((a, b) => Number(b.relevance?.score || 0) - Number(a.relevance?.score || 0) ||
    Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
}
