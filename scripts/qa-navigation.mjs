// One isolated browser and a synthetic local account; no production writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const output=path.join(os.tmpdir(),'redscore-navigation-qa');await mkdir(output,{recursive:true});
try{
  await page.goto('http://127.0.0.1:4181/#/home');
  await page.locator('[data-consent-choice="necessary"]').click();
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill('qa@example.test');
  await page.locator('[name="password"]').fill('test-only-password');
  await page.locator('[data-auth-form] button.green').click();
  await page.locator('.app-header').waitFor();
  await page.locator('.app-header [data-route="supplies"]').click();
  assert.equal(await page.locator('.app-header nav img').count(),0);
  assert.equal(await page.locator('.app-header .user-tools img').count(),0);
  for(const width of [320,360,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    const layout=await page.locator('.app-header').evaluate(header=>({
      overflow:document.documentElement.scrollWidth>innerWidth,
      collision:header.querySelector('.wordmark').getBoundingClientRect().right>header.querySelector('.user-tools').getBoundingClientRect().left,
      tabs:[...header.querySelectorAll('nav button')].map(button=>{const label=button.querySelector('span'),rect=button.getBoundingClientRect();return {text:label.textContent,visible:rect.width>0&&rect.height>=44&&rect.left>=0&&rect.right<=innerWidth+1,fits:label.scrollWidth<=button.clientWidth};}),
    }));
    assert.equal(layout.overflow,false,JSON.stringify({width,layout}));
    assert.equal(layout.collision,false,JSON.stringify({width,layout}));
    assert.equal(layout.tabs.length,7);
    assert.ok(layout.tabs.every(tab=>tab.visible&&tab.fits),JSON.stringify({width,layout}));
    assert.equal(await page.locator('.app-header nav [aria-current="page"]').getAttribute('data-route'),'supplies');
    await page.screenshot({path:path.join(output,`navigation-${width}.png`)});
  }
  await page.setViewportSize({width:390,height:900});
  await page.locator('.app-header nav [data-route="knowledge"]').click();
  assert.equal(await page.locator('.app-header nav [aria-current="page"]').getAttribute('data-route'),'knowledge');
  await page.locator('[data-language-toggle]').click();await page.locator('[data-language="en"]').click();
  assert.equal(await page.locator('.app-header nav').getAttribute('aria-label'),'Main navigation');
  assert.equal(await page.locator('.app-header nav button').count(),7);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',viewports:[320,360,390,768,1024,1440],labelsVisible:true,noOverlap:true,noNavigationImages:true,activeRoute:true,english:true,errors,screenshots:output}));
}finally{await browser.close();}
