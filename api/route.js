const ROUTER_HOST = "router.project-osrm.org";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ROUTE_DISTANCE_KM = 150;

function json(status, payload, cache = "no-store") {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": cache,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function coordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function radians(value) { return value * Math.PI / 180; }
function distanceKm(aLat, aLon, bLat, bLon) {
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function POST(request) {
  let input;
  try { input = await request.json(); }
  catch { return json(400, { error: "Die Routendaten sind ungültig." }); }
  const fromLat = coordinate(input?.fromLat, -90, 90);
  const fromLon = coordinate(input?.fromLon, -180, 180);
  const toLat = coordinate(input?.toLat, -90, 90);
  const toLon = coordinate(input?.toLon, -180, 180);

  if ([fromLat, fromLon, toLat, toLon].some(value => value === null)) {
    return json(400, { error: "Start und Ziel müssen gültige Koordinaten enthalten." });
  }
  if (distanceKm(fromLat, fromLon, toLat, toLon) > MAX_ROUTE_DISTANCE_KM) {
    return json(400, { error: "Das Routenziel liegt außerhalb des unterstützten Bereichs." });
  }

  const upstream = new URL(`https://${ROUTER_HOST}/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}`);
  upstream.search = new URLSearchParams({
    alternatives: "false",
    steps: "false",
    overview: "false",
  }).toString();
  if (upstream.hostname !== ROUTER_HOST) return json(500, { error: "Routingdienst falsch konfiguriert." });

  try {
    const response = await fetch(upstream, {
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        accept: "application/json",
        "user-agent": "RedScore/1.0 (https://www.redscore.de; administration@redscore.de)",
      },
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > 500_000) throw new Error("oversized upstream response");
    const body = await response.text();
    if (body.length > 500_000) throw new Error("oversized upstream response");
    const payload = JSON.parse(body);
    const route = Array.isArray(payload.routes) ? payload.routes[0] : null;
    const distanceMeters = Number(route?.distance);
    const durationSeconds = Number(route?.duration);
    if (payload.code !== "Ok" || !Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
      return json(404, { error: "Für dieses Ziel konnte keine Fahrtroute ermittelt werden." });
    }
    return json(200, {
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(durationSeconds),
      profile: "driving",
      source: "OSRM · OpenStreetMap-Mitwirkende",
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RedScore route lookup failure", error instanceof Error ? error.message : "unknown error");
    return json(503, { error: "Die Route kann gerade nicht berechnet werden. Bitte später erneut versuchen." });
  }
}
