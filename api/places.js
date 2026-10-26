const NOMINATIM_HOST = "nominatim.openstreetmap.org";
const OVERPASS_HOST = "overpass-api.de";
const PHOTON_HOST = "photon.komoot.io";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_PLACES = 40;
const CACHE_TTL_MS = 30 * 60_000;
const STALE_TTL_MS = 24 * 60 * 60_000;
const AMENITIES = ["police", "fire_station", "hospital", "clinic", "pharmacy", "shelter", "social_facility", "drinking_water", "fuel"];
const EMERGENCIES = ["shelter", "ambulance_station", "rescue_station"];

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
  const rawLat = element.lat ?? element.center?.lat, rawLon = element.lon ?? element.center?.lon;
  if ([rawLat, rawLon].some(value => value === null || value === undefined || String(value).trim() === "")) return null;
  const lat = Number(rawLat), lon = Number(rawLon);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

async function fetchJson(fetchImpl, url, options, deadline, signal) {
  if (url.protocol !== "https:" || ![NOMINATIM_HOST, OVERPASS_HOST, PHOTON_HOST].includes(url.hostname)) throw new Error("invalid upstream host");
  const timeout = Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now());
  if (timeout < 100) throw new Error("lookup deadline");
  const result = await fetchImpl(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]),
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

function normalisePlaces(elements, lat, lon) {
    const seen = new Set();
    return elements.flatMap(element => {
      const point = coordinates(element);
      if (!point) return [];
      const tags = element.tags || {};
      if (!AMENITIES.includes(tags.amenity) && tags.shop !== "supermarket" && !EMERGENCIES.includes(tags.emergency)) return [];
      const placeCategory = category(tags);
      const name = clean(tags.name || tags.operator || fallbackName(tags, placeCategory), 120);
      const key = `${name.toLowerCase()}|${point.lat.toFixed(4)}|${point.lon.toFixed(4)}`;
      if (!name || seen.has(key)) return [];
      seen.add(key);
      const distance = distanceKm(lat, lon, point.lat, point.lon);
      if (distance > 20 || !/^\d+$/.test(String(element.id))) return [];
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

}

function photonElements(payload) {
  if (!Array.isArray(payload.features)) throw new Error("invalid Photon response");
  return payload.features.flatMap(feature => {
    const p = feature.properties || {}, point = feature.geometry;
    const type = ({N:"node",W:"way",R:"relation"})[p.osm_type];
    if (!type || point?.type !== "Point" || !Array.isArray(point.coordinates)) return [];
    return [{ type, id:p.osm_id, lat:point.coordinates[1], lon:point.coordinates[0], tags:{
      [p.osm_key]:p.osm_value, name:p.name, "addr:street":p.street,
      "addr:housenumber":p.housenumber, "addr:postcode":p.postcode, "addr:city":p.city,
    }}];
  });
}

// In-flight coalescing and bounded warm-instance caches complement CDN caching.
// A dedicated handler also makes failover and expiry testable without live calls.
export function createPlacesHandler({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  const cache = new Map(), centres = new Map(), pending = new Map();
  let geocodeQueue = Promise.resolve(), nextGeocodeAt = 0;
  function remember(map, key, value) { if (map.size >= 100) map.delete(map.keys().next().value); map.set(key,value); }
  async function geocodeFetch(url, deadline, signal) {
    const work = geocodeQueue.then(async () => {
      const delay = Math.max(0,nextGeocodeAt-Date.now());
      if (delay + Date.now() >= deadline) throw new Error("geocoding busy");
      if (delay) await new Promise(resolve => setTimeout(resolve,delay));
      nextGeocodeAt = Date.now()+1100;
      return fetchJson(fetchImpl,url,{},deadline,signal);
    });
    geocodeQueue = work.catch(()=>{});
    return work;
  }
  async function lookup(input,key,request,previous) {
    const deadline = Date.now()+17_000;
    let center = centres.get(key)?.value;
    if (!center || now()-centres.get(key).at > STALE_TTL_MS) {
      const url=new URL(`https://${NOMINATIM_HOST}/search`);
      url.search=new URLSearchParams({format:"jsonv2",limit:"1",countrycodes:"de",postalcode:input.postalCode,city:input.city,state:input.state,addressdetails:"1"}).toString();
      let locations=await geocodeFetch(url,deadline,request.signal);
      if (Array.isArray(locations) && !locations.length) {
        url.search=new URLSearchParams({format:"jsonv2",limit:"1",countrycodes:"de",q:`${input.postalCode} ${input.city} ${input.state}`.trim(),addressdetails:"1"}).toString();
        locations=await geocodeFetch(url,deadline,request.signal);
      }
      const point=coordinates(locations?.[0] || {});
      if (!point) { const error=new Error("location not found");error.status=404;throw error; }
      center={...point,label:clean(locations[0].display_name,180)};
      remember(centres,key,{at:now(),value:center});
    }
    const {lat,lon}=center;
    let elements, provider="overpass";
    try {
      const url=new URL(`https://${OVERPASS_HOST}/api/interpreter`);
      const query=`[out:json][timeout:3];(nwr(around:20000,${lat},${lon})[amenity~"^(${AMENITIES.join("|")})$"];nwr(around:20000,${lat},${lon})[shop="supermarket"];nwr(around:20000,${lat},${lon})[emergency~"^(${EMERGENCIES.join("|")})$"];);out center tags;`;
      const payload=await fetchJson(fetchImpl,url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams({data:query}).toString()},deadline,request.signal);
      if (!Array.isArray(payload.elements) || payload.remark) throw new Error("incomplete Overpass response");
      elements=payload.elements;
    } catch(error) {
      console.warn("RedScore places primary unavailable",error instanceof Error ? error.message : "unknown");
      try {
        const url=new URL(`https://${PHOTON_HOST}/reverse`);
        const include=[...AMENITIES.map(value=>`osm.amenity.${value}`),"osm.shop.supermarket",...EMERGENCIES.map(value=>`osm.emergency.${value}`)].join(",");
        url.search=new URLSearchParams({lat:String(lat),lon:String(lon),radius:"20",limit:"60",lang:"de",include}).toString();
        elements=photonElements(await fetchJson(fetchImpl,url,{},deadline,request.signal));
        provider="photon";
      } catch(fallbackError) {
        console.warn("RedScore places fallback unavailable",fallbackError instanceof Error ? fallbackError.message : "unknown");
        if (previous && now()-Date.parse(previous.generatedAt) < STALE_TTL_MS) return {...previous,placesStatus:"stale"};
        return {center,places:[],generatedAt:null,source:"OpenStreetMap contributors",placesStatus:"unavailable",lookupProvider:null};
      }
    }
    return {center,places:normalisePlaces(elements,lat,lon),generatedAt:new Date(now()).toISOString(),source:"OpenStreetMap contributors",placesStatus:"ready",lookupProvider:provider};
  }
  return async function GET(request) {
    const url=new URL(request.url);
    const input={postalCode:clean(url.searchParams.get("postalCode"),5),city:clean(url.searchParams.get("city")),state:clean(url.searchParams.get("state"))};
    if (!/^\d{5}$/.test(input.postalCode) || input.city.length<2) return json(400,{error:"Bitte eine gültige Postleitzahl und einen Ort angeben."});
    const key=[input.postalCode,input.city,input.state].join("|").toLocaleLowerCase("de-DE");
    const cached=cache.get(key);
    if (cached && now()-cached.at<cached.ttl) return json(200,cached.value,"public, max-age=0, s-maxage=30");
    try {
      if (!pending.has(key)) {
        const work=lookup(input,key,request,cached?.value).then(value=>{remember(cache,key,{at:now(),ttl:value.placesStatus==="ready"?CACHE_TTL_MS:30_000,value});return value;}).finally(()=>pending.delete(key));
        pending.set(key,work);
      }
      const value=await pending.get(key);
      return json(200,value,value.placesStatus==="ready"?"public, max-age=0, s-maxage=1800, stale-while-revalidate=21600":"public, max-age=0, s-maxage=30");
    } catch(error) {
      if (cached?.value.generatedAt && now()-Date.parse(cached.value.generatedAt)<STALE_TTL_MS) return json(200,{...cached.value,placesStatus:"stale"},"public, max-age=0, s-maxage=30");
      console.error("RedScore places lookup failure",error instanceof Error?error.message:"unknown");
      return json(error.status===404?404:503,{error:error.status===404?"Der angegebene Ort konnte nicht eindeutig gefunden werden.":"Die Ortsdaten sind vorübergehend nicht erreichbar. Eine gespeicherte Offline-Liste bleibt verfügbar."});
    }
  };
}

export const GET = createPlacesHandler();
