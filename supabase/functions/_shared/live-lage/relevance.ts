import type { UserContext } from "./types.ts";

const severityWeight: Record<string, number> = { critical: 95, high: 75, medium: 50, low: 28, info: 12 };
const trustWeight: Record<string, number> = { official: 12, verified: 8, osint: 0, unknown: -4 };

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function calculateRelevance(event: Record<string, unknown>, user: UserContext) {
  let points = severityWeight[String(event.severity)] ?? 0;
  points += trustWeight[String(event.source_trust_level)] ?? 0;
  const countryMatch = user.country && String(event.country).toLowerCase() === user.country.toLowerCase();
  if (countryMatch) points += 12;
  const regionText = [event.region, event.city].filter(Boolean).join(" ").toLowerCase();
  if (user.region && regionText.includes(user.region.toLowerCase())) points += 26;
  if (user.district && regionText.includes(user.district.toLowerCase())) points += 34;
  if (["critical_infrastructure","power_outage","telecom_outage","drinking_water","supply_disruption"].includes(String(event.category))) points += 8;
  let distance: number | null = null;
  if (typeof event.latitude === "number" && typeof event.longitude === "number" && typeof user.latitude === "number" && typeof user.longitude === "number") {
    distance = distanceKm(user.latitude, user.longitude, event.latitude, event.longitude);
    if (distance <= 50) points += 40;
    else if (distance <= 150) points += 28;
    else if (distance <= 500) points += 12;
  }
  const ageHours = Math.max(0, (Date.now() - new Date(String(event.published_at)).getTime()) / 3_600_000);
  points += Math.max(0, 16 - Math.min(16, ageHours / 3));
  const score = Math.round(points);
  const level = score >= 105 ? "critical" : score >= 80 ? "high" : score >= 55 ? "medium" : "low";
  return { score, level, distance_km: distance === null ? null : Math.round(distance) };
}
