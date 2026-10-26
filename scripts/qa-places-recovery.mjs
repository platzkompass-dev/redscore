// One isolated Edge instance. Real place providers, synthetic authentication only.
// Start qa-server.mjs; this script never contacts real user accounts.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {GET} from "../api/places.js";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
const browser=await chromium.launch({channel:"msedge",headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const page=await context.newPage();
const errors=[];page.on("pageerror",error=>errors.push(error.message));
let fault=false,actual=null;
const output=path.join(os.tmpdir(),"redscore-places-recovery-qa");await mkdir(output,{recursive:true});
await page.route('**/api/account',async route=>{
  if(route.request().postDataJSON()?.action!=="load")return route.continue();
  await route.fulfill({json:{user:{id:"development-qa-user",email:"qa@example.test",user_metadata:{display_name:"QA"}},profile:{display_name:"QA",adults:[{gender:"woman"}],children_count:0,children_details:[],pets:[],postal_code:"21729",city:"Freiburg (Elbe)",state:"Niedersachsen",district:"Landkreis Stade",onboarding_completed:true},appState:{}}});
});
await page.route('**/api/places?*',async route=>{
  if(fault)return route.fulfill({json:{center:actual.center,places:[],placesStatus:"unavailable",generatedAt:null}});
  const result=await GET(new Request(route.request().url()));actual=await result.json();
  await route.fulfill({status:result.status,json:actual});
});
try{
  await page.goto('http://127.0.0.1:4181/#/home');
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');
  await page.locator('[data-auth-form] button.green').click();await page.locator('.app-header').waitFor();
  await page.locator('.app-header [data-route="map"]').click();
  await page.locator('.place-list [data-map-route]').first().waitFor({timeout:25_000});
  assert.ok(actual.places.length>0);assert.equal(actual.placesStatus,'ready');
  assert.equal(await page.locator('.place-list article').count(),actual.places.length);
  assert.equal(await page.locator('.map-canvas iframe').count(),1);
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:path.join(output,`real-places-${width}.png`),fullPage:true});
  }
  const count=actual.places.length;
  fault=true;
  await page.locator('[data-map-refresh]').click();
  await page.waitForFunction(()=>document.querySelector('.map-data-status')?.textContent.includes('Gespeicherte Ortsliste'));
  assert.equal(await page.locator('.place-list article').count(),count);
  await page.evaluate(()=>localStorage.removeItem('redscore-nearby-places-v1')); // Own isolated QA context only.
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.map-data-status')?.textContent.includes('Karte verfügbar'));
  assert.equal(await page.locator('.map-canvas iframe').count(),1);
  assert.equal(await page.locator('.place-list article').count(),0);
  assert.match(await page.locator('.place-list h2').innerText(),/Orte im Umkreis/);
  assert.doesNotMatch(await page.locator('.place-list').innerText(),/Keine passenden Orte gefunden|Orte \(0\)/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',realLocation:'21729 Freiburg (Elbe)',realPlaces:count,provider:actual.lookupProvider,mapTileAvailability:'not asserted; separate OSM probe rate-limited',viewports:[390,1440],cachedPlacesPreserved:true,mapSurvivesPlaceOutage:true,realAccountChanges:0,errors,screenshots:output},null,2));
}finally{await browser.close();}
