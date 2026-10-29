// Real analytics runtime, but every event is intercepted locally: no test data
// or analytics hits are sent to production. All portal content comes from QA.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const runtime=await (await fetch('https://www.redscore.de/_vercel/insights/script.js')).text();
assert.ok(runtime.includes('beforeSend'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'});
// The runtime skips automated clients. Exercise its ordinary-client path only
// against our intercepted local origin; no vendor event leaves this browser.
await context.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));
const events=[],errors=[];let scripts=0;
await context.route('https://www.redscore.de/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/_vercel/insights/script.js'){scripts++;return route.fulfill({contentType:'application/javascript',body:runtime});}
  if(url.pathname.startsWith('/_vercel/')){events.push(route.request().postData());return route.fulfill({status:204});}
  const local=await fetch(`http://127.0.0.1:4181${url.pathname}${url.search}`,{method:route.request().method(),headers:{'content-type':route.request().headers()['content-type']||'application/json'},body:['GET','HEAD'].includes(route.request().method())?undefined:route.request().postData()});
  return route.fulfill({status:local.status,headers:{'content-type':local.headers.get('content-type')||'text/plain'},body:Buffer.from(await local.arrayBuffer())});
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
const output=path.join(os.tmpdir(),'redscore-consent-qa');await mkdir(output,{recursive:true});
async function settled(){await page.waitForLoadState('networkidle');}
try{
  await page.goto('https://www.redscore.de/?testEmail=fake@example.test');await page.locator('#redscore-consent').waitFor();await settled();
  assert.equal(scripts,0);assert.equal(events.length,0);
  for(const width of [320,390,1440]){
    await page.setViewportSize({width,height:844});
    const bounds=await page.locator('#redscore-consent').evaluate(panel=>{const r=panel.getBoundingClientRect(),buttons=[...panel.querySelectorAll('.consent-actions button')];return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1,buttons:buttons.map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,color:getComputedStyle(b).backgroundColor}))};});
    assert.ok(bounds.fits);assert.equal(bounds.buttons[0].color,bounds.buttons[1].color);assert.ok(Math.abs(bounds.buttons[0].width-bounds.buttons[1].width)<=1);assert.ok(bounds.buttons.every(b=>b.height>=44));
    await page.screenshot({path:path.join(output,`consent-${width}.png`)});
  }
  await page.locator('[data-consent-choice="necessary"]').click();await page.reload();await settled();
  assert.equal(await page.locator('#redscore-consent').count(),0);assert.equal(scripts,0);assert.equal(events.length,0);
  await page.locator('[data-cookie-settings]').click();await page.locator('[data-consent-choice="statistics"]').click();
  await page.waitForFunction(()=>window.vai===true);await settled();assert.equal(scripts,1);assert.ok(events.length>=1);assert.ok(events.every(body=>!body.includes('fake@example.test')&&!body.includes('testEmail')));
  await page.locator('[data-cookie-settings]').click();await page.locator('[data-consent-choice="necessary"]').click();
  const afterWithdrawal=events.length;
  await page.evaluate(()=>{history.pushState({},'', '/?private=example');window.va('pageview',{path:'/?private=example'});});await settled();assert.equal(events.length,afterWithdrawal);
  await page.reload();await settled();assert.equal(scripts,1);assert.equal(await page.locator('#redscore-consent').count(),0);
  // Changing a decision in another tab affects the already-loaded tracker too.
  await page.locator('[data-cookie-settings]').click();await page.locator('[data-consent-choice="statistics"]').click();await settled();
  const second=await context.newPage();await second.goto('https://www.redscore.de/ratgeber/index.html');await second.locator('[data-cookie-settings]').click();await second.locator('[data-consent-choice="necessary"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('redscore-consent-v1')).statistics===false);
  const afterOtherTab=events.length;await page.evaluate(()=>window.va('pageview',{path:'/test'}));await settled();assert.equal(events.length,afterOtherTab);await second.close();
  // Expired and malformed stored decisions fail closed.
  await page.evaluate(()=>localStorage.setItem('redscore-consent-v1',JSON.stringify({version:1,statistics:true,decidedAt:'2020-01-01T00:00:00Z'})));
  const beforeExpiry=scripts;await page.reload();await page.locator('#redscore-consent').waitFor();await settled();assert.equal(scripts,beforeExpiry);
  await page.locator('[data-consent-choice="necessary"]').click();
  await page.goto('https://www.redscore.de/en/guides/index.html');await page.locator('[data-cookie-settings]').click();assert.equal(await page.locator('#consent-title').innerText(),'Cookies & privacy');await page.locator('[data-consent-choice="necessary"]').click();
  // Even permission to measure public pages never permits dashboard views.
  await page.goto('https://www.redscore.de/');await page.locator('[data-open-auth="login"]').first().click();await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');await page.locator('[data-auth-form] button.green').click();await page.locator('.logged-page').waitFor();
  const beforeAccountScripts=scripts,beforeAccountEvents=events.length;await page.locator('[data-cookie-settings]').click();await page.locator('[data-consent-choice="statistics"]').click();await settled();assert.equal(scripts,beforeAccountScripts);assert.equal(events.length,beforeAccountEvents);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',beforeConsent:0,rejectPersists:true,allowLoadsRealRuntime:true,withdrawal:true,crossTabWithdrawal:true,expiry:true,noQueryData:true,noAccountStatistics:true,english:true,viewports:[320,390,1440],errors,screenshots:output},null,2));
}catch(error){console.error(JSON.stringify({scripts,events:events.length,errors,state:await page.evaluate(()=>({choice:localStorage.getItem('redscore-consent-v1'),publicPage:!!document.querySelector('.public-page'),privatePage:!!document.querySelector('.logged-page'),vendor:typeof window.va,loaded:window.vai,scripts:[...document.scripts].map(s=>s.src)}))}));await page.screenshot({path:path.join(output,'failure.png')});throw error;}finally{await browser.close();}
