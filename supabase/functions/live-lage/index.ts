import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { DatabaseClient } from "../_shared/live-lage/db.ts";
import { corsHeaders } from "../_shared/live-lage/security.ts";
import { calculateRelevance } from "../_shared/live-lage/relevance.ts";
import { clusterLiveEvents } from "../_shared/live-lage/cluster.ts";
import { candidateParams, feedLimit, selectOverview, validCoordinates } from "../_shared/live-lage/selection.ts";
import { liveLanguage, localizedSourceName, localizeLiveEvent } from "../_shared/live-lage/localize.ts";
import type { UserContext } from "../_shared/live-lage/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const db = new DatabaseClient(supabaseUrl, anonKey);

function cleanParam(value: string | null, max = 80): string {
  return (value || "").replace(/[^\p{L}\p{N} .,_()-]/gu, "").trim().slice(0, max);
}

Deno.serve(async request => {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "GET required" }), { status: 405, headers });
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ error: "Backend configuration missing" }), { status: 503, headers });

  const url = new URL(request.url);
  const language = liveLanguage(url.searchParams.get("language"));
  const scope = ["for_you","germany","world","all"].includes(url.searchParams.get("scope") || "") ? url.searchParams.get("scope")! : "for_you";
  const filter = cleanParam(url.searchParams.get("filter") || "all", 30).toLowerCase();
  const limit = feedLimit(url.searchParams.get("limit"));
  const user: UserContext = {
    country: cleanParam(url.searchParams.get("country") || "Deutschland"),
    region: cleanParam(url.searchParams.get("region")),
    district: cleanParam(url.searchParams.get("district")),
    ...validCoordinates(url.searchParams.get("lat"), url.searchParams.get("lon")),
  };
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const events = await db.request<any[]>("rpc/get_filtered_live_lage_events", {
    method: "POST",
    body: JSON.stringify(candidateParams(scope, filter, cutoff, user.region, user.district)),
  });

  const ranked = events.map(event => ({ ...event, relevance: calculateRelevance(event, user) }))
    .filter(event => !["low", "info"].includes(String(event.severity)))
    .filter(event => scope !== "for_you" || event.relevance.score >= 70)
    .sort((a, b) => b.relevance.score - a.relevance.score || Date.parse(b.published_at) - Date.parse(a.published_at));
  const grouped = clusterLiveEvents(ranked).sort((a, b) => b.relevance.score - a.relevance.score || Date.parse(b.published_at) - Date.parse(a.published_at));
  const clustered = selectOverview(grouped, limit, filter).map(event => localizeLiveEvent(event, language));
  const sourceState = await db.request<any[]>("rpc/get_live_lage_source_state", { method: "POST", body: "{}" });
  const lastSyncAt = sourceState.map(source => source.last_successful_fetch).filter(Boolean).sort().at(-1) || null;

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    lastSyncAt,
    scope,
    filter,
    language,
    events: clustered,
    sources: sourceState.map(source => ({ ...source, name: localizedSourceName(source.name, language) })),
    disclaimer: "Lageübersicht aus strukturierten Quellen. Im Ereignisfall gelten ausschließlich amtliche Warnungen und Anweisungen.",
  }), { headers: { ...headers, "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
});
