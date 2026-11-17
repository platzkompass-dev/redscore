import test from "node:test";
import assert from "node:assert/strict";
import { evacuationCause } from "../supabase/functions/_shared/live-lage/evacuation.ts";
test("evacuations retain their cause instead of classifying every response as a disaster",()=>{
 assert.equal(evacuationCause("Sprühattacke in der S3 endet mit Zugevakuierung und Wohnungsdurchsuchung"),"hazmat");
 assert.equal(evacuationCause("Evakuierung nach Gefahrstoffaustritt bei Industrieunternehmen"),"chemical_incident");
 assert.equal(evacuationCause("Airport closed after evacuation"),"transport_outage");
 assert.equal(evacuationCause("Großbrand: Wohngebiet wird evakuiert"),"major_fire");
 assert.equal(evacuationCause("Hochwasser: Ort evakuiert"),null);
 assert.equal(evacuationCause("Pfefferspray sichergestellt"),null);
});
