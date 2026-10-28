// One isolated Edge instance, synthetic account and stock only. No external AI.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
const browser=await chromium.launch({channel:"msedge",headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:"block"});
const page=await context.newPage();
const errors=[],writes=[];let empty=false;
page.on("pageerror",error=>errors.push(error.message));
await page.route('**/api/account',async route=>{
  const input=route.request().postDataJSON();
  if(input.action==='save')writes.push(input);
  if(input.action!=='load')return route.continue();
  return route.fulfill({json:{user:{id:'development-qa-user',email:'qa@example.test',user_metadata:{display_name:'QA'}},profile:{display_name:'QA',adults:[{gender:'woman'},{gender:'man'}],children_count:1,children_details:[{gender:'girl'}],pets:[],postal_code:'10115',city:'Berlin',state:'Berlin',district:'',onboarding_completed:true},appState:{supplies:{water:empty?null:18,food:empty?null:3,medicine:5,power:1,hygiene:.5}}}});
});
const output=path.join(os.tmpdir(),'redscore-supply-twin-qa');await mkdir(output,{recursive:true});
async function range(field,value){const slider=page.locator(`[data-twin-field="${field}"]`);await slider.evaluate((element,value)=>{element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function noOverflow(){const bounds=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('body *')].filter(element=>element.getBoundingClientRect().right>innerWidth+1).map(element=>({tag:element.tagName,class:typeof element.className==='string'?element.className:'svg',right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width})).slice(0,15)}));assert.ok(bounds.document<=bounds.width,JSON.stringify(bounds));}
try{
  await page.goto('http://127.0.0.1:4181/#/home');assert.equal(await page.locator('[data-supply-twin]').count(),0);
  await page.locator('[data-open-auth="login"]').first().click();await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');await page.locator('[data-auth-form] button.green').click();await page.locator('.app-header').waitFor();
  await page.locator('.app-header [data-route="supplies"]').click();
  assert.equal(await page.locator('[data-supply-twin]').count(),0);
  await page.locator('[data-open-supply-twin]').click();
  await page.locator('[data-twin-first]').waitFor();
  assert.equal(await page.locator('.logged-page').getAttribute('inert'),'');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-supply-twin]').count(),0);
  assert.equal(await page.locator('[data-open-supply-twin]').evaluate(element=>element===document.activeElement),true);
  await page.locator('[data-open-supply-twin]').click();
  const originalState=await page.evaluate(()=>localStorage.getItem('redscore-state-v1'));
  assert.equal(await page.locator('[data-twin-first]').innerText(),'3 Tage');
  await page.locator('[data-twin-action="water"]').click();assert.equal(await page.locator('[data-twin-projected]').innerText(),'3 Tage');
  await page.locator('[data-twin-action="food"]').click();assert.equal(await page.locator('[data-twin-projected]').innerText(),'4 Tage');
  for(const width of [360,390,768,1440]){
    await page.setViewportSize({width,height:1050});await noOverflow();
    assert.ok(await page.locator('.supply-twin-modal').evaluate(element=>element.scrollWidth<=element.clientWidth+1));
    await page.screenshot({path:path.join(output,`supply-twin-${width}.png`),fullPage:true});
  }
  await page.locator('[data-twin-action="balance"]').click();assert.equal(await page.locator('[data-twin-projected]').innerText(),'10 Tage');
  assert.equal(await page.locator('[data-twin-field="water"]').inputValue(),'42');
  await range('guests',3);assert.equal(await page.locator('[data-twin-projected]').innerText(),'5 Tage');
  await page.locator('[data-twin-scenario="no-cook"]').click();assert.equal(await page.locator('[data-twin-first]').innerText(),'Noch offen');
  await page.locator('[data-twin-field="readyPercent"]').selectOption('50');assert.equal(await page.locator('[data-twin-projected]').innerText(),'4 Tage 6 h');
  await range('hour',48);assert.match(await page.locator('.twin-snapshot').innerText(),/36 L/);
  const slider=page.locator('[data-twin-field="water"]');await slider.focus();await slider.press('ArrowRight');
  assert.equal(await slider.evaluate(element=>element===document.activeElement),true);
  assert.equal(await slider.inputValue(),'42.5');
  assert.equal(await page.evaluate(()=>localStorage.getItem('redscore-state-v1')),originalState);assert.equal(writes.length,0);
  await page.locator('.supply-twin-modal [data-close-modal]').click();
  await page.locator('[data-language-toggle]').click();await page.locator('[data-language="en"]').click();
  await page.locator('[data-open-supply-twin]').click();assert.match(await page.locator('#supply-twin-title').innerText(),/Supply Time Machine/);
  await context.setOffline(true);await page.locator('[data-twin-action="reset"]').click();await range('water',6);await range('food',1);
  assert.equal(await page.locator('[data-twin-projected]').innerText(),'4 days');assert.equal(writes.length,0);
  await context.setOffline(false);empty=true;await page.reload();await page.locator('[data-open-supply-twin]').click();await page.locator('[data-twin-first]').waitFor();
  assert.equal(await page.locator('[data-twin-first]').innerText(),'Not calculated yet');
  assert.equal(await page.locator('.twin-record-actions [data-open-supply]').count(),2);
  assert.equal(await page.locator('[data-twin-action="balance"]').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',viewports:[360,390,768,1440],synergy:true,guests:true,noCook:true,timeTravel:true,keyboardFocus:true,offline:true,unknownStock:true,stockWrites:0,errors,screenshots:output},null,2));
}catch(error){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;}finally{await browser.close();}
