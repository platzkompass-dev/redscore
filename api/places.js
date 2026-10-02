const NOMINATIM_HOST = "nominatim.openstreetmap.org";
const OVERPASS_HOST = "overpass-api.de";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_PLACES = 40;

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

function clean(value, max = 80) {
  return String(value || "").replace(/[^\p{L}\p{N} .,'()\/-]/gu, "").trim().slice(0, max);
}

function radians(value) { return value * Math.PI / 180; }
function distanceKm(aLat, aLon, bLat, bLon) {
  const dLat = radians(bLat - aLat), dLon = radians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function category(tags = {}) {
  if (tags.amenity === "police" || tags.amenity === "fire_station" || tags.office === "government") return "Behörden";
  if (["hospital", "clinic", "pharmacy", "doctors"].includes(tags.amenity)) return "Gesundheit";
  if (tags.amenity === "shelter" || tags.emergency === "shelter") return "Schutzräume";
  if (["ambulance_station", "rescue_station"].includes(tags.emergency) || tags.amenity === "social_facility") return "Hilfe";
  return "Versorgung";
}

function fallbackName(tags, placeCategory) {
  if (tags.amenity === "police") return "Polizeidienststelle";
  if (tags.amenity === "fire_station") return "Feuerwehr";
  if (tags.amenity === "hospital") return "Krankenhaus";
  if (tags.amenity === "clinic") return "Klinik";
  if (tags.amenity === "pharmacy") return "Apotheke";
  if (tags.amenity === "shelter") return "Ausgewiesener Schutzort";
  if (tags.amenity === "drinking_water") return "Trinkwasserstelle";
  if (tags.shop === "supermarket") return "Supermarkt";
  if (tags.amenity === "fuel") return "Tankstelle";
  return placeCategory === "Hilfe" ? "Hilfseinrichtung" : "Anlaufstelle";
}

function address(tags = {}) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const city = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
  return [street, city].filter(Boolean).join(", ");
}

function coordinates(element) {
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

async function fetchJson(url, options = {}) {
  const result = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      "user-agent": "RedScore/1.0 (https://www.redscore.de; administration@redscore.de)",
      ...(options.headers || {}),
    },
  });
  if (!result.ok) throw new Error(`upstream ${result.status}`);
  const declared = Number(result.headers.get("content-length") || 0);
  if (declared > 3_000_000) throw new Error("oversized upstream response");
  const text = await result.text();
  if (text.length > 3_000_000) throw new Error("oversized upstream response");
  return JSON.parse(text);
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const postalCode = clean(requestUrl.searchParams.get("postalCode"), 5);
  const city = clean(requestUrl.searchParams.get("city"));
  const state = clean(requestUrl.searchParams.get("state"));
  if (!/^\d{5}$/.test(postalCode) || city.length < 2) return json(400, { error: "Bitte eine gültige Postleitzahl und einen Ort angeben." });

  try {
    const geocode = new URL("https://nominatim.openstreetmap.org/search");
    geocode.search = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "de", postalcode: postalCode, city, state, addressdetails: "1" }).toString();
    if (geocode.hostname !== NOMINATIM_HOST) throw new Error("invalid geocoder host");
    let locations = await fetchJson(geocode);
    if (!Array.isArray(locations) || !locations.length) {
      geocode.search = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "de", q: `${postalCode} ${city} ${state}`.trim(), addressdetails: "1" }).toString();
      locations = await fetchJson(geocode);
    }
    const lat = Number(locations?.[0]?.lat), lon = Number(locations?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json(404, { error: "Der angegebene Ort konnte nicht eindeutig gefunden werden." });

    const overpass = new URL("https://overpass-api.de/api/interpreter");
    if (overpass.hostname !== OVERPASS_HOST) throw new Error("invalid places host");
    const query = `[out:json][timeout:7];(nwr(around:20000,${lat},${lon})[amenity~"^(police|fire_station|hospital|clinic|pharmacy|shelter|social_facility|drinking_water|fuel)$"];nwr(around:20000,${lat},${lon})[shop="supermarket"];nwr(around:20000,${lat},${lon})[emergency~"^(shelter|ambulance_station|rescue_station)$"];);out center tags;`;
    const payload = await fetchJson(overpass, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ data: query }).toString(),
    });
    const seen = new Set();
    const places = (Array.isArray(payload.elements) ? payload.elements : []).flatMap(element => {
      const point = coordinates(element);
      if (!point) return [];
      const tags = element.tags || {};
      const placeCategory = category(tags);
      const name = clean(tags.name || tags.operator || fallbackName(tags, placeCategory), 120);
      const key = `${name.toLowerCase()}|${point.lat.toFixed(4)}|${point.lon.toFixed(4)}`;
      if (!name || seen.has(key)) return [];
      seen.add(key);
      const distance = distanceKm(lat, lon, point.lat, point.lon);
      const type = ["node", "way", "relation"].includes(element.type) ? element.type : "node";
      return [{
        id: `${type}-${String(element.id).slice(0, 24)}`,
        name,
        category: placeCategory,
        address: clean(address(tags), 180),
        lat: point.lat,
        lon: point.lon,
        distanceKm: Math.round(distance * 10) / 10,
        distanceLabel: distance < 1 ? `${Math.max(50, Math.round(distance * 1000 / 50) * 50)} m` : `${distance.toFixed(1).replace(".", ",")} km`,
        osmUrl: `https://www.openstreetmap.org/${type}/${encodeURIComponent(String(element.id))}`,
        routeUrl: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${lat}%2C${lon}%3B${point.lat}%2C${point.lon}`,
      }];
    }).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, MAX_PLACES);

    return json(200, {
      center: { lat, lon, label: clean(locations[0].display_name, 180) },
      places,
      generatedAt: new Date().toISOString(),
      source: "OpenStreetMap contributors",
    }, "public, max-age=1800, stale-while-revalidate=21600");
  } catch (error) {
    console.error("RedScore places lookup failure", error instanceof Error ? error.message : "unknown error");
    return json(503, { error: "Die Ortsdaten sind vorübergehend nicht erreichbar. Eine gespeicherte Offline-Liste bleibt verfügbar." });
  }
}
