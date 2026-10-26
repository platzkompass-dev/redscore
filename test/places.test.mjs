import test from "node:test";
import assert from "node:assert/strict";
import { createPlacesHandler } from "../api/places.js";

const originalFetch = globalThis.fetch;
let GET;
test.beforeEach(() => { GET=createPlacesHandler(); });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("rejects incomplete place lookups before contacting external services", async () => {
  globalThis.fetch = () => { throw new Error("must not fetch"); };
  const response = await GET(new Request("https://www.redscore.de/api/places?city=Freiburg"));
  assert.equal(response.status, 400);
});

const request = () => new Request("https://www.redscore.de/api/places?postalCode=21729&city=Freiburg%20(Elbe)&state=Niedersachsen");
const location = [{lat:"53.825248",lon:"9.28872",display_name:"Freiburg (Elbe), 21729"}];
const pharmacy = {type:"Feature",properties:{osm_type:"W",osm_id:123,osm_key:"amenity",osm_value:"pharmacy",name:"Test-Apotheke",street:"Hauptstraße",housenumber:"1",postcode:"21729",city:"Freiburg (Elbe)"},geometry:{type:"Point",coordinates:[9.2867,53.8257]}};

test("a busy Overpass server falls back to Photon and validates its real point data", async () => {
  const calls=[];
  GET=createPlacesHandler({fetchImpl:async(url,options)=>{
    calls.push({url:new URL(url),options});
    if (url.hostname.includes("nominatim")) return Response.json(location);
    if (url.hostname.includes("overpass")) return new Response("busy",{status:502});
    return Response.json({features:[pharmacy,{...pharmacy,properties:{...pharmacy.properties,osm_id:124},geometry:{type:"Point",coordinates:[0,0]}},{...pharmacy,properties:{...pharmacy.properties,osm_id:125},geometry:{type:"Point",coordinates:[null,null]}}]});
  }});
  const result=await GET(request()), payload=await result.json();
  assert.equal(result.status,200); assert.equal(payload.lookupProvider,"photon");
  assert.equal(payload.placesStatus,"ready"); assert.equal(payload.places.length,1);
  assert.equal(payload.places[0].category,"Gesundheit");
  assert.equal(payload.places[0].address,"Hauptstraße 1, 21729 Freiburg (Elbe)");
  assert.equal(calls[2].url.hostname,"photon.komoot.io");
  assert.equal(calls[2].url.searchParams.get("radius"),"20");
  assert.equal(calls[2].url.searchParams.getAll("include").length,1,"category alternatives must be ORed, not ANDed");
  assert.ok(calls.every(call=>call.options.redirect==="error"));
});

test("all place services failing still returns the resolved map centre without claiming an empty result", async () => {
  GET=createPlacesHandler({fetchImpl:async url=>url.hostname.includes("nominatim")?Response.json(location):new Response("unavailable",{status:503})});
  const result=await GET(request()),payload=await result.json();
  assert.equal(result.status,200); assert.equal(payload.center.lat,53.825248);
  assert.equal(payload.placesStatus,"unavailable"); assert.equal(payload.generatedAt,null);
  assert.deepEqual(payload.places,[]); assert.match(result.headers.get("cache-control"),/s-maxage=30/);
});

test("Overpass JSON with a timeout remark is not accepted as a successful empty search", async () => {
  GET=createPlacesHandler({fetchImpl:async url=>url.hostname.includes("nominatim")?Response.json(location):url.hostname.includes("overpass")?Response.json({elements:[],remark:"runtime error: timeout"}):Response.json({features:[pharmacy]})});
  const payload=await (await GET(request())).json();
  assert.equal(payload.lookupProvider,"photon"); assert.equal(payload.places.length,1);
});

test("cached places survive upstream outages with their original timestamp and expire after a day", async () => {
  let timestamp=Date.now(), outage=false, calls=0;
  GET=createPlacesHandler({now:()=>timestamp,fetchImpl:async url=>{
    calls++;if(url.hostname.includes("nominatim"))return Response.json(location);
    if(outage)throw new Error("timeout");
    return Response.json({elements:[{type:"node",id:123,lat:53.826,lon:9.289,tags:{amenity:"pharmacy",name:"Cached pharmacy"}}]});
  }});
  const first=await (await GET(request())).json();
  assert.equal(calls,2);
  assert.deepEqual(await (await GET(request())).json(),first);assert.equal(calls,2);
  timestamp+=31*60_000;outage=true;
  const stale=await (await GET(request())).json();
  assert.equal(stale.placesStatus,"stale");assert.equal(stale.generatedAt,first.generatedAt);assert.equal(stale.places.length,1);
  timestamp+=25*60*60_000;
  const expired=await (await GET(request())).json();
  assert.equal(expired.placesStatus,"unavailable");assert.equal(expired.places.length,0);assert.equal(expired.generatedAt,null);
});

test("simultaneous lookups of the same location share one upstream request", async () => {
  let calls=0;
  GET=createPlacesHandler({fetchImpl:async url=>{calls++;await Promise.resolve();return url.hostname.includes("nominatim")?Response.json(location):Response.json({elements:[]});}});
  const results=await Promise.all([GET(request()),GET(request())]);
  assert.equal(calls,2);assert.deepEqual(await results[0].json(),await results[1].json());
});

test("invalid geocoder coordinates cannot generate a query at zero or outside the world", async () => {
  let calls=0;
  GET=createPlacesHandler({fetchImpl:async()=>{calls++;return Response.json([{lat:null,lon:"9.28"}]);}});
  assert.equal((await GET(request())).status,404);assert.equal(calls,1);
});

test("returns normalized nearby infrastructure from OpenStreetMap", async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });
    if (String(url).includes("nominatim")) return Response.json([{ lat: "53.823", lon: "9.285", display_name: "21729 Freiburg (Elbe)" }]);
    return Response.json({ elements: [{
      type: "node", id: 123, lat: 53.824, lon: 9.286,
      tags: { amenity: "fire_station", name: "Ortsfeuerwehr", "addr:street": "Am Hafen", "addr:housenumber": "4", "addr:postcode": "21729", "addr:city": "Freiburg (Elbe)" },
    }] });
  };
  const response = await GET(new Request("https://www.redscore.de/api/places?postalCode=21729&city=Freiburg%20(Elbe)&state=Niedersachsen"));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.equal(payload.places[0].category, "Behörden");
  assert.equal(payload.places[0].name, "Ortsfeuerwehr");
  assert.match(payload.places[0].routeUrl, /^https:\/\/www\.openstreetmap\.org\/directions/);
});
