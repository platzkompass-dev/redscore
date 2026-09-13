const ALLOWED_PARAMS = new Set(["scope", "filter", "limit", "country", "region", "district", "lat", "lon"]);
const MAX_RESPONSE_BYTES = 2_000_000;

function json(status, payload) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function upstreamConfiguration() {
  const baseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  let url;
  try { url = new URL(baseUrl); }
  catch { return null; }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co") || url.username || url.password || url.port || !anonKey) return null;
  return { url, anonKey };
}

export async function GET(request) {
  const config = upstreamConfiguration();
  if (!config) return json(503, { error: "Live-Lage ist serverseitig noch nicht konfiguriert." });

  const requestUrl = new URL(request.url);
  const upstream = new URL("/functions/v1/live-lage", config.url);
  for (const [name, value] of requestUrl.searchParams) {
    if (ALLOWED_PARAMS.has(name)) upstream.searchParams.append(name, value.slice(0, 120));
  }

  try {
    const result = await fetch(upstream, {
      signal: AbortSignal.timeout(9_000),
      redirect: "error",
      headers: {
        authorization: `Bearer ${config.anonKey}`,
        apikey: config.anonKey,
        accept: "application/json",
      },
    });
    if (!result.ok) {
      console.error("RedScore Live-Lage upstream status", result.status);
      return json(502, { error: "Der Lage-Dienst ist vorübergehend nicht erreichbar." });
    }
    const declaredSize = Number(result.headers.get("content-length") || 0);
    if (declaredSize > MAX_RESPONSE_BYTES) throw new Error("oversized response");
    const body = await result.arrayBuffer();
    if (body.byteLength > MAX_RESPONSE_BYTES) throw new Error("oversized response");
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("RedScore Live-Lage proxy failure", error instanceof Error ? error.message : "unknown error");
    return json(503, { error: "Der Lage-Dienst ist vorübergehend nicht erreichbar." });
  }
}

