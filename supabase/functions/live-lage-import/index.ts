import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adapterFor } from "../_shared/live-lage/adapters/index.ts";
import { DatabaseClient } from "../_shared/live-lage/db.ts";
import { fingerprint, isProbableDuplicate } from "../_shared/live-lage/dedupe.ts";
import type { NormalizedNewsItem, SourceConfig, VerificationStatus } from "../_shared/live-lage/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = new DatabaseClient(supabaseUrl, serviceRoleKey);

function due(source: any): boolean {
  if (!source.last_successful_fetch) return true;
  return Date.now() - new Date(source.last_successful_fetch).getTime() >= source.polling_interval_seconds * 1000;
}

function eventRow(item: NormalizedNewsItem) {
  return {
    title: item.title,
    summary: item.summary,
    category: item.category,
    severity: item.severity,
    verification_status: item.verificationStatus,
    source_trust_level: item.sourceTrustLevel,
    country: item.country,
    region: item.region || null,
    city: item.city || null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    geographic_scope: item.geographicScope || null,
    affected_radius_km: item.affectedRadiusKm ?? null,
    organizations: item.organizations,
    tags: item.tags,
    published_at: item.publishedAt,
    last_seen_at: item.fetchedAt,
    expires_at: item.expiresAt || null,
    canonical_url: item.canonicalUrl,
    title_fingerprint: fingerprint(item),
    source_count: 1,
    active: true,
  };
}

function mergedVerification(existing: string, incoming: string, sourceCount: number): VerificationStatus {
  if (existing === "official" || incoming === "official") return "official";
  if (sourceCount > 1 && [existing, incoming].some(value => value === "verified")) return "multiple_sources";
  if (existing === "verified" || incoming === "verified") return "verified";
  if (existing === "osint_unconfirmed" || incoming === "osint_unconfirmed") return "osint_unconfirmed";
  return "unknown";
}

async function ingest(source: SourceConfig & Record<string, any>, item: NormalizedNewsItem, candidates: any[]) {
  const sourceItemFilter = `news_event_sources?select=id,event_id&source_id=eq.${source.id}&source_item_id=eq.${encodeURIComponent(item.externalId)}&limit=1`;
  const existingLink = await db.select<any[]>(sourceItemFilter);
  if (existingLink.length) {
    await db.update(`news_event_sources?id=eq.${existingLink[0].id}`, { fetched_at: item.fetchedAt, source_title: item.title, source_summary: item.summary });
    await db.update(`news_events?id=eq.${existingLink[0].event_id}`, { last_seen_at: item.fetchedAt, active: true });
    return "updated";
  }

  const duplicate = candidates.find(candidate => isProbableDuplicate(item, candidate));
  let eventId: string;
  if (duplicate) {
    eventId = duplicate.id;
    const sourceCount = Number(duplicate.source_count || 1) + 1;
    const verification = mergedVerification(String(duplicate.verification_status), item.verificationStatus, sourceCount);
    const [updated] = await db.update<any[]>(`news_events?id=eq.${eventId}`, {
      last_seen_at: item.fetchedAt,
      source_count: sourceCount,
      verification_status: verification,
      source_trust_level: item.sourceTrustLevel === "official" ? "official" : duplicate.source_trust_level,
      active: true,
    });
    Object.assign(duplicate, updated);
  } else {
    const [created] = await db.insert<any[]>("news_events", eventRow(item));
    eventId = created.id;
    candidates.push(created);
  }

  await db.insert("news_event_sources", {
    event_id: eventId,
    source_id: source.id,
    source_item_id: item.externalId,
    source_url: item.sourceUrl,
    source_title: item.title,
    source_summary: item.summary,
    source_published_at: item.publishedAt,
    fetched_at: item.fetchedAt,
    raw_payload: item.rawPayload || null,
  });
  return duplicate ? "duplicate" : "inserted";
}

Deno.serve(async request => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { "content-type": "application/json" } });
  if (!supabaseUrl || !serviceRoleKey) return new Response(JSON.stringify({ error: "Backend configuration missing" }), { status: 503, headers: { "content-type": "application/json" } });

  const sources = await db.select<any[]>("news_sources?select=*&enabled=eq.true&order=slug");
  const dueSources = sources.filter(due);
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const candidates = await db.select<any[]>(`news_events?select=*&active=eq.true&published_at=gte.${encodeURIComponent(cutoff)}&limit=500`);
  const result: Record<string, unknown>[] = [];

  for (const source of dueSources) {
    const [run] = await db.insert<any[]>("news_sync_runs", { source_id: source.id, execution_id: Deno.env.get("SB_EXECUTION_ID") || null });
    let inserted = 0, updated = 0, duplicates = 0;
    try {
      const items = await adapterFor(source.adapter_key).fetch(source as SourceConfig);
      for (const item of items.slice(0, 300)) {
        const outcome = await ingest(source, item, candidates);
        if (outcome === "inserted") inserted++;
        else if (outcome === "duplicate") duplicates++;
        else updated++;
      }
      const finishedAt = new Date().toISOString();
      await db.update(`news_sources?id=eq.${source.id}`, { last_successful_fetch: finishedAt, last_error: null, last_error_at: null });
      await db.update(`news_sync_runs?id=eq.${run.id}`, { finished_at: finishedAt, status: "success", fetched_count: items.length, inserted_count: inserted, updated_count: updated, duplicate_count: duplicates });
      result.push({ source: source.slug, status: "success", fetched: items.length, inserted, updated, duplicates });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown source error";
      const finishedAt = new Date().toISOString();
      await db.update(`news_sources?id=eq.${source.id}`, { last_error: message, last_error_at: finishedAt });
      await db.update(`news_sync_runs?id=eq.${run.id}`, { finished_at: finishedAt, status: "failed", error_message: message, inserted_count: inserted, updated_count: updated, duplicate_count: duplicates });
      result.push({ source: source.slug, status: "failed", error: message });
    }
  }

  await db.update(`news_events?active=eq.true&or=(expires_at.lt.${encodeURIComponent(new Date().toISOString())},last_seen_at.lt.${encodeURIComponent(new Date(Date.now()-14*86400000).toISOString())})`, { active: false });
  return new Response(JSON.stringify({ ok: true, processedSources: dueSources.length, sources: result, at: new Date().toISOString() }), {
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
});
