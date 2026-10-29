// Responsive UI audit using one isolated Edge and synthetic local data.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
const output=path.join(os.tmpdir(),'redscore-mobile-qa');await mkdir(output,{recursive:true});
const errors=[],report=[],dialogs=[];page.on('pageerror',error=>errors.push(error.message));
async function inspect(route,width){
  await page.setViewportSize({width,height:width>=600?1024:844});
  await page.goto(`http://127.0.0.1:4181/#/${route}`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{
    const visible=element=>{const r=element.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(element).visibility!=='hidden';};
    return {overflow:document.documentElement.scrollWidth>innerWidth,
      outside:[...document.querySelectorAll('main *,section *')].filter(visible).filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e.parentElement).overflowX!=='auto').slice(0,8).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right})),
      smallTargets:[...document.querySelectorAll('main button,main a,input,select,.public-actions button,.user-tools button')].filter(visible).filter(e=>e.getBoundingClientRect().height<43.5).slice(0,16).map(e=>({text:(e.textContent||e.getAttribute('aria-label')||e.name).trim().slice(0,45),height:Math.round(e.getBoundingClientRect().height),cls:e.className})),
      smallInputs:[...document.querySelectorAll('input:not([type=range]),select,textarea')].filter(visible).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.name||e.dataset.twinField),
      nav:document.querySelector('.app-header nav')?.getBoundingClientRect().height||0};
  });
  report.push({route,width,...result});
  if([390,768,1024].includes(width)||result.overflow)await page.screenshot({path:path.join(output,`${await page.locator('.logged-page').count()?'account':'public'}-${route}-${width}.png`),fullPage:true});
}
async function inspectDialog(name){
  const dialog=page.locator('.modal');await dialog.waitFor();
  for(const width of [320,390,768,1024]){
    await page.setViewportSize({width,height:844});
    const layout=await dialog.evaluate(element=>({overflow:element.scrollWidth>element.clientWidth+1,smallInputs:[...element.querySelectorAll('input:not([type=range]),select,textarea')].filter(e=>e.getClientRects().length).filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.name)}));
    dialogs.push({name,width,...layout});
    assert.equal(layout.overflow,false,JSON.stringify({name,width,layout}));assert.deepEqual(layout.smallInputs,[]);
    if(width===390){await dialog.evaluate(element=>element.scrollTop=0);await page.screenshot({path:path.join(output,`dialog-${name}.png`)});}
  }
  // Reduced height approximates a raised keyboard; this does not emulate a real OS keyboard.
  await page.setViewportSize({width:390,height:430});
  const last=dialog.locator('button:not(:disabled)').last();await last.scrollIntoViewIfNeeded();
  assert.ok(await last.evaluate(element=>{const r=element.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),name+' final action unreachable');
  if(['household','assessment'].includes(name))assert.ok(await dialog.locator('.modal-close').evaluate(element=>{const r=element.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),name+' close button unreachable');
  await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});
}
try{
  await page.goto('http://127.0.0.1:4181/#/home');
  await page.locator('[data-consent-choice="necessary"]').click();
  for(const route of ['home','angebote'])for(const width of [320,390,430,768,820,1024])await inspect(route,width);
  await inspect('home',390);
  await page.locator('[data-open-auth="register"]:visible').first().click();
  await inspectDialog('registration');
  await page.locator('[data-open-auth="login"]').first().click();
  await page.screenshot({path:path.join(output,'login-430.png')});
  await page.locator('[name="email"]').fill('qa@example.test');await page.locator('[name="password"]').fill('test-only-password');await page.locator('[data-auth-form] button.green').click();await page.locator('.app-header').waitFor();
  for(const route of ['home','supplies','packliste','map','warnschutz','knowledge','angebote','profile'])for(const width of [320,390,430,768,820,1024])await inspect(route,width);
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-edit-household]').click();await inspectDialog('household');
  await page.locator('[data-open-assessment]').click();await inspectDialog('assessment');
  await page.locator('.app-header nav [data-route="supplies"]').click();
  await page.locator('[data-open-supply="water"]').first().click();await inspectDialog('water');
  await page.locator('[data-add-custom-supply]').click();await inspectDialog('custom-supply');
  await page.locator('[data-open-supply-twin]').click();await inspectDialog('time-machine');
  await page.locator('.app-header nav [data-route="packliste"]').click();
  const checkbox=page.locator('[data-pack-item]').first();
  const checked=await checkbox.getAttribute('aria-pressed');await checkbox.click();
  assert.notEqual(await page.locator('[data-pack-item]').first().getAttribute('aria-pressed'),checked);
  await page.reload();await page.locator('[data-pack-item]').first().waitFor();
  assert.notEqual(await page.locator('[data-pack-item]').first().getAttribute('aria-pressed'),checked);
  await page.setViewportSize({width:740,height:390});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await writeFile(path.join(output,'report.json'),JSON.stringify({report,dialogs,errors},null,2));
  assert.ok(report.every(item=>!item.overflow));assert.deepEqual(report.filter(item=>item.smallInputs.length||item.smallTargets.length),[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',output,pageChecks:report.length,dialogChecks:dialogs.length,errors,remainingSmallTargets:report.filter(item=>item.smallTargets.length).map(item=>({route:item.route,width:item.width,targets:item.smallTargets})),landscape:true,packlistPersistence:true},null,2));
}finally{await browser.close();}
