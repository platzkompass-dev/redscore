// Actual local portal and collector code; no statistics requests reach production.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {validVisit} from '../supabase/functions/_shared/visits.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const events=[],errors=[];
await context.route('https://www.redscore.de/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/visit'){
    const body=req.postDataJSON();assert.ok(validVisit(body));events.push(body);return route.fulfill({status:204});
  }
  assert.ok(!url.pathname.startsWith('/_vercel/'),'no vendor tracking');
  const local=await fetch(`http://127.0.0.1:4181${url.pathname}${url.search}`,{method:req.method(),headers:{'content-type':req.headers()['content-type']||'application/json'},body:['GET','HEAD'].includes(req.method())?undefined:req.postData()});
  return route.fulfill({status:local.status,headers:{'content-type':local.headers.get('content-type')||'text/plain'},body:Buffer.from(await local.arrayBuffer())});
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const output=path.join(os.tmpdir(),'redscore-consent-qa');await mkdir(output,{recursive:true});
const settled=()=>page.waitForLoadState('networkidle');
const choose=async value=>{await page.locator('[data-cookie-settings]').click();await page.locator(`[data-consent-choice="${value}"]`).click();await settled();};
try{
  await page.goto('https://www.redscore.de/?testEmail=fake@example.test');await page.locator('#redscore-consent').waitFor();await settled();
  assert.equal(events.length,0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('redscore-visit-session-v1')),null);
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:844});
    const bounds=await page.locator('#redscore-consent').evaluate(panel=>{const r=panel.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1,buttons:[...panel.querySelectorAll('.consent-actions button')].map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,color:getComputedStyle(b).backgroundColor}))};});
    assert.ok(bounds.fits);assert.equal(bounds.buttons[0].color,bounds.buttons[1].color);assert.ok(Math.abs(bounds.buttons[0].width-bounds.buttons[1].width)<=1);assert.ok(bounds.buttons.every(b=>b.height>=44));
    await page.screenshot({path:path.join(output,`consent-${width}.png`)});
  }
  await page.locator('[data-consent-choice="necessary"]').click();await page.reload();await settled();assert.equal(events.length,0);assert.equal(await page.locator('#redscore-consent').count(),0);
  await choose('statistics');assert.equal(events.length,1);assert.equal(events[0].route,'/');
  assert.ok(!JSON.stringify(events).includes('fake@example.test'));const session=events[0].session;
  await page.reload();await settled();assert.equal(events.at(-1).session,session);
  const beforeRender=events.length;await page.evaluate(()=>document.body.append(document.createElement('span')));await settled();assert.equal(events.length,beforeRender);
  const offerRequest=page.waitForResponse(res=>res.url().endsWith('/api/visit')&&res.request().postDataJSON()?.route==='/angebote');
  await page.evaluate(()=>{location.hash='#/angebote';});await offerRequest;await settled();assert.equal(events.at(-1).route,'/angebote');assert.equal(events.at(-1).session,session);
  await choose('necessary');assert.equal(await page.evaluate(()=>sessionStorage.getItem('redscore-visit-session-v1')),null);
  const withdrawn=events.length;await page.evaluate(()=>{location.hash='#/home';});await settled();assert.equal(events.length,withdrawn);
  await choose('statistics');const second=await context.newPage();await second.goto('https://www.redscore.de/ratgeber/index.html');await second.locator('[data-cookie-settings]').click();await second.locator('[data-consent-choice="necessary"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('redscore-consent-v2')).statistics===false);
  const afterOtherTab=events.length;await page.evaluate(()=>{location.hash='#/angebote';});await settled();assert.equal(events.length,afterOtherTab);await second.close();
  await page.evaluate(()=>localStorage.setItem('redscore-consent-v2',JSON.stringify({version:2,statistics:true,decidedAt:'2020-01-01T00:00:00Z'})));
  await page.reload();await page.locator('#redscore-consent').waitFor();await settled();assert.equal(events.length,afterOtherTab);
  // An earlier vendor consent cannot authorize the new collector.
  await page.evaluate(()=>{localStorage.removeItem('redscore-consent-v2');localStorage.setItem('redscore-consent-v1',JSON.stringify({version:1,statistics:true,decidedAt:new Date().toISOString()}));});
  await page.reload();await page.locator('#redscore-consent').waitFor();await settled();assert.equal(events.length,afterOtherTab);
  await page.locator('[data-consent-choice="necessary"]').click();
  await page.goto('https://www.redscore.de/en/guides/index.html');await page.locator('[data-cookie-settings]').click();assert.equal(await page.locator('#consent-title').innerText(),'Cookies & privacy');await page.locator('[data-consent-choice="necessary"]').click();
  await page.goto('https://www.redscore.de/');await page.locator('[data-open-auth="login"]').first().click();await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');await page.locator('[data-auth-form] button.green').click();await page.locator('.logged-page').waitFor();
  const beforeAccount=events.length;await choose('statistics');assert.equal(events.length,beforeAccount);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',beforeConsent:0,sessionReuse:true,noRenderDuplicates:true,publicRouteTracking:true,withdrawal:true,crossTabWithdrawal:true,expiry:true,oldConsentIgnored:true,noQueryData:true,noAccountStatistics:true,english:true,viewports:[320,390,1440],errors,screenshots:output},null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});console.error({events,errors});throw error;}finally{await browser.close();}
