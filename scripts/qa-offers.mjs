// Isolated development browser: no real registrations, purchases or location APIs.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || "playwright");
const browser = await chromium.launch({channel:"msedge",headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:"block"});
const page = await context.newPage();
const errors = [], external = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1:4181") && /^https?:/.test(request.url())) external.push(new URL(request.url()).hostname); });
const output = path.join(os.tmpdir(),"redscore-offers-qa"); await mkdir(output,{recursive:true});
async function noOverflow() {
  const overflow = await page.evaluate(() => ({ width:innerWidth, document:document.documentElement.scrollWidth, elements:[...document.querySelectorAll('body *')].filter(element=>element.getBoundingClientRect().right>innerWidth+1).map(element=>({class:element.className,right:element.getBoundingClientRect().right})).slice(0,12) }));
  assert.ok(overflow.document <= overflow.width,JSON.stringify(overflow));
}
async function location(postcode,city) {
  await page.locator('[name="offerPostcode"]').fill(postcode);
  await page.locator('[name="offerCity"]').fill(city);
  await page.locator('[data-offers-location] button.green').click();
}
try {
  await page.goto("http://127.0.0.1:4181/#/angebote");
  await page.locator('.offers-hero h1').waitFor();
  assert.equal(await page.locator('.offer-category').count(),6);
  assert.equal(await page.locator('[data-offer-id="johanniter-stade"]').count(),0);
  assert.match(await page.locator('.offers-score').innerText(),/nicht berechnet/);
  await page.locator('[data-offer-discover]').click();
  assert.ok(page.url().endsWith("#/angebote"));
  await location("21680","Stade");
  assert.equal(await page.locator('[data-offer-id="johanniter-stade"]').count(),1);
  assert.equal(await page.locator('[data-offer-id="thw-stade"]').count(),1);
  assert.equal(await page.locator('[data-offer-id="thw-hamburg"]').count(),0);
  // The provider is documented, course dates are deliberately not promised.
  assert.match(await page.locator('[data-offer-id="johanniter-stade"]').innerText(),/Termine und freie Plätze direkt dort prüfen/);
  await location("10115","Berlin");
  assert.equal(await page.locator('[data-offer-id="johanniter-stade"]').count(),0);
  assert.equal(await page.locator('.offers-empty').count(),1);
  assert.equal(await page.locator('[data-offer-id="drk-courses"]').count(),1);
  await page.locator('[data-offer-mode="online"]').click();
  assert.equal(await page.locator('.offer-card').count(),4);
  for (const width of [360,390,768,1440]) {
    await page.setViewportSize({width,height:1000}); await noOverflow();
    await page.locator('.public-header a[href="#/angebote"]').waitFor({state:"visible"});
    await page.screenshot({path:path.join(output,`offers-de-${width}.png`),fullPage:true});
  }
  await page.locator('[data-language-toggle]').click();
  await page.locator('[data-language="en"]').click();
  assert.match(await page.locator('.offers-hero h1').innerText(),/Useful offers/);
  assert.match(await page.locator('[data-offer-id="decathlon-backpacks"]').innerText(),/Compare trekking backpacks/);
  await context.setOffline(true);
  await page.locator('.offers-status').waitFor();
  assert.match(await page.locator('.offers-status').innerText(),/Saved catalog/);
  assert.equal(await page.locator('.offer-card').count(),4);
  await context.setOffline(false);
  // Public navigation back to how-it-works stays usable from Offers.
  await page.locator('.public-header [data-scroll="how"]').click();
  await page.locator('#how').waitFor();
  assert.equal(await page.locator('.offers-hero').count(),0);
  // Synthetic login to check all seven mobile navigation destinations.
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill("qa@example.test");
  await page.locator('[name="password"]').fill("test-only-password");
  await page.locator('[data-auth-form] button.green').click();
  await page.locator('.app-header').waitFor();
  await page.locator('.app-header [data-route="angebote"]').click();
  await page.locator('.offers-hero').waitFor();
  await page.setViewportSize({width:390,height:844}); await noOverflow();
  assert.equal(await page.locator('.app-header nav button').count(),7);
  const bounds=await page.locator('.app-header nav button').evaluateAll(buttons=>buttons.map(button=>({left:button.getBoundingClientRect().left,right:button.getBoundingClientRect().right,width:button.getBoundingClientRect().width})));
  assert.ok(bounds.every(box=>box.left>=0 && box.right<=390 && box.width>=44));
  assert.match(await page.locator('.offers-score').innerText(),/not calculated/);
  await page.screenshot({path:path.join(output,"offers-en-mobile-logged.png"),fullPage:true});
  // Also verify a real offline reload through the app's service worker, rather
  // than merely keeping an already-rendered page open without connectivity.
  const offlineContext=await browser.newContext({viewport:{width:390,height:844}});
  const offlinePage=await offlineContext.newPage();
  await offlinePage.goto("http://127.0.0.1:4181/#/angebote");
  await offlinePage.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  await offlineContext.setOffline(true);
  await offlinePage.reload();
  await offlinePage.locator('.offers-hero h1').waitFor();
  assert.equal(await offlinePage.locator('.offer-category').count(),6);
  assert.match(await offlinePage.locator('.offers-status').innerText(),/Gespeicherter Katalog/);
  await offlineContext.close();
  assert.deepEqual(external,[]); assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",viewports:[360,390,768,1440],regionalMatching:true,onlineIndependent:true,english:true,offlineReload:true,externalRequests:0,errors,screenshots:output},null,2));
} catch(error) { await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}); console.error(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(-2000)},null,2)); throw error; }
finally { await browser.close(); }
