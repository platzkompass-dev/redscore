import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { DatabaseClient } from "../_shared/live-lage/db.ts";
import { corsHeaders } from "../_shared/live-lage/security.ts";
import { calculateRelevance } from "../_shared/live-lage/relevance.ts";
import type { UserContext } from "../_shared/live-lage/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const db = new DatabaseClient(supabaseUrl, anonKey);
const filterCategories: Record<string, string[]> = {
  drones: ["drones"],
  cyber: ["cyber","it_outage"],
  weather: ["flood","heavy_rain","storm","extreme_heat","severe_weather"],
  disasters: ["earthquake","volcano","tsunami","wildfire","major_fire","evacuation"],
  infrastructure: ["critical_infrastructure","power_outage","telecom_outage","transport_outage"],
  supply: ["drinking_water","supply_disruption"],
  security: ["civil_protection","official_warning","international_security","radiological","chemical_incident","hazmat"],
};

function cleanParam(value: string | null, max = 80): string {
  return (value || "").replace(/[^\p{L}\p{N} .,_()-]/gu, "").trim().slice(0, max);
}

Deno.serve(async request => {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "GET required" }), { status: 405, headers });
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: "Backend configuration missing" }), { status: 503, headers });

  const url = new URL(request.url);
  const scope = ["for_you","germany","world","all"].includes(url.searchParams.get("scope") || "") ? url.searchParams.get("scope")! : "for_you";
  const filter = cleanParam(url.searchParams.get("filter") || "all", 30).toLowerCase();
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit") || 12)));
  const user: UserContext = {
    country: cleanParam(url.searchParams.get("country") || "Deutschland"),
    region: cleanParam(url.searchParams.get("region")),
    district: cleanParam(url.searchParams.get("district")),
    latitude: Number.isFinite(Number(url.searchParams.get("lat"))) ? Number(url.searchParams.get("lat")) : undefined,
    longitude: Number.isFinite(Number(url.searchParams.get("lon"))) ? Number(url.searchParams.get("lon")) : undefined,
  };
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  let events = await db.request<any[]>("rpc/get_live_lage_events", {
    method: "POST",
    body: JSON.stringify({ p_limit: 200, p_cutoff: cutoff }),
  });
  if (filter !== "all" && filterCategories[filter]) events = events.filter(event => filterCategories[filter].includes(event.category));
  if (scope === "germany") events = events.filter(event => /deutschland|germany/i.test(event.country || ""));
  if (scope === "world") events = events.filter(event => !/deutschland|germany/i.test(event.country || ""));

  const ranked = events.map(event => ({ ...event, relevance: calculateRelevance(event, user) }))
    .filter(event => scope !== "for_you" || event.relevance.score >= 45)
    .sort((a, b) => b.relevance.score - a.relevance.score || Date.parse(b.published_at) - Date.parse(a.published_at))
    .slice(0, limit);
  const sourceState = await db.request<any[]>("rpc/get_live_lage_source_state", { method: "POST", body: "{}" });
  const lastSyncAt = sourceState.map(source => source.last_successful_fetch).filter(Boolean).sort().at(-1) || null;

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    lastSyncAt,
    scope,
    filter,
    events: ranked,
    sources: sourceState,
    disclaimer: "Lageübersicht aus strukturierten Quellen. Im Ereignisfall gelten ausschließlich amtliche Warnungen und Anweisungen.",
  }), { headers: { ...headers, "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
});
