// Isolated UI/API-contract QA with synthetic account, places and route responses.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
const browser=await chromium.launch({channel:"msedge",headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:"block"});
const page=await context.newPage();
const errors=[],lookups=[],routeRequests=[];
const output=path.join(os.tmpdir(),"redscore-location-map-qa");await mkdir(output,{recursive:true});
page.on("pageerror",error=>errors.push(error.message));
await page.route('**/api/places?*',async route=>{
  const params=new URL(route.request().url()).searchParams;lookups.push(Object.fromEntries(params));
  const stade=params.get('postalCode')==='21680';
  const lat=stade?53.6:52.52,lon=stade?9.47:13.4;
  await route.fulfill({json:{center:{lat,lon},generatedAt:new Date().toISOString(),places:[{id:"development-pharmacy",name:"DEVELOPMENT: Test-Apotheke",category:"Gesundheit",address:"Teststraße 1",lat:lat+.01,lon:lon+.01,distanceLabel:"1,2 km"}]}});
});
await page.route('**/api/route',async route=>{routeRequests.push(route.request().postDataJSON());await route.fulfill({json:{distanceMeters:1800,durationSeconds:240,source:"Development routing fixture"}});});
// Keep provider availability out of this layout test. This is not a production map.
await page.route('https://www.openstreetmap.org/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="de"><meta charset="utf-8"><body style="margin:0;min-height:100vh;background:repeating-linear-gradient(90deg,transparent 0 60px,#bfd0c7 61px 62px),repeating-linear-gradient(0deg,#e8efe8 0 60px,#bfd0c7 61px 62px);display:grid;place-items:center;font:14px system-ui;color:#49645a"><div>⌖<br>DEVELOPMENT · Kartenansicht</div></body></html>'}));
async function noOverflow(){const bounds=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(element=>element.getBoundingClientRect().right>innerWidth+1).map(element=>({class:element.className,right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width})).slice(0,12)}));assert.ok(bounds.document<=bounds.width,JSON.stringify(bounds));}
try{
  await page.goto('http://127.0.0.1:4181/#/angebote');
  await page.locator('[name="offerPostcode"]').fill('99999');await page.locator('[name="offerCity"]').fill('DevelopmentGuestTown');
  await page.locator('[data-offers-location] button.green').click();
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');
  await page.locator('[data-auth-form] button.green').click();await page.locator('.app-header').waitFor();
  await page.locator('.app-header [data-route="angebote"]').click();
  assert.equal(await page.locator('[name="offerPostcode"],[name="offerCity"]').count(),0);
  assert.match(await page.locator('.offers-profile-location').innerText(),/DEIN GESPEICHERTER STANDORT/);
  assert.doesNotMatch(await page.locator('.offers-profile-location').innerText(),/DevelopmentGuestTown/);
  await page.locator('.offers-profile-location [data-route="profile"]').click();
  await page.locator('[data-edit-household]').first().click();
  await page.locator('[name="postalCode"]').fill('21680');await page.locator('[name="city"]').fill('Stade');
  await page.locator('[name="state"]').fill('Niedersachsen');await page.locator('[name="district"]').fill('Landkreis Stade');
  await page.locator('[data-onboarding-form] button.green').click();await page.locator('[data-onboarding-form]').waitFor({state:'hidden'});
  await page.locator('.app-header [data-route="angebote"]').click();
  assert.match(await page.locator('.offers-profile-location').innerText(),/21680 Stade/);
  assert.equal(await page.locator('[data-offer-id="johanniter-stade"]').count(),1);
  await page.locator('.app-header [data-route="map"]').click();
  await page.locator('.place-list [data-map-route]').waitFor();
  assert.equal(lookups.at(-1).postalCode,'21680');
  assert.match(await page.locator('.map-location-card').innerText(),/21680 Stade/);
  assert.match(await page.locator('.map-location-card').innerText(),/keine GPS-Ortung/);
  assert.match(await page.locator('.map-marker-legend').innerText(),/Ortsmittelpunkt/);
  for(const width of [360,390,768,1440]){
    await page.setViewportSize({width,height:1000});await noOverflow();
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:path.join(output,`safeplaces-${width}.png`),fullPage:true});
  }
  const originalPages=context.pages().length;
  await page.locator('[data-map-route="development-pharmacy"]').click();
  await page.locator('.route-overview.ready').waitFor();
  assert.equal(context.pages().length,originalPages);
  assert.deepEqual(routeRequests.at(-1),{fromLat:53.6,fromLon:9.47,toLat:53.61,toLon:9.48});
  assert.match(await page.locator('.map-marker-legend').innerText(),/Routenziel/);
  await page.locator('[data-map-center]').click();
  assert.equal(await page.locator('.route-overview').count(),0);
  assert.equal(new URL(await page.locator('.map-canvas iframe').getAttribute('src')).searchParams.get('marker'),'53.600000,9.470000');
  await page.locator('[data-language-toggle]').click();await page.locator('[data-language="en"]').click();
  assert.match(await page.locator('.map-location-card').innerText(),/no GPS tracking/);
  await page.setViewportSize({width:390,height:844});await noOverflow();
  await context.setOffline(true);await page.locator('.map-unavailable').waitFor();
  assert.equal(await page.locator('.map-canvas iframe').count(),0);
  assert.equal(await page.locator('.place-list [data-map-route]').count(),1);
  assert.match(await page.locator('.map-location-status').innerText(),/Offline/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',viewports:[360,390,768,1440],profileLocation:true,noSignedInLocationFields:true,settingsUpdate:true,mapCentre:true,routingWithinSite:true,offline:true,errors,screenshots:output},null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}finally{await browser.close();}
