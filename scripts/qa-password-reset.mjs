// Loopback QA only. Start qa-server.mjs first. No real mail or account changes.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE||"playwright");
const browser=await chromium.launch({channel:"msedge",headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const page=await context.newPage();
const errors=[], requests=[];
page.on("pageerror",error=>errors.push(error.message));
page.on("request",request=>{if(request.url().endsWith("/api/account")&&request.method()==="POST")requests.push({body:request.postDataJSON(),authorization:request.headers().authorization});});
const output=path.join(os.tmpdir(),"redscore-password-reset-qa");await mkdir(output,{recursive:true});
try {
  await page.goto("http://127.0.0.1:4181/#/home");
  assert.equal(await page.locator('.public-header [data-scroll="about"]').count(),0);
  assert.deepEqual(await page.locator('.public-header nav > *').allTextContents(),["Start","So funktioniert’s","Informationen","Angebote"]);
  for(const id of await page.locator('[data-score-lab-step]').evaluateAll(buttons=>buttons.map(button=>button.dataset.scoreLabStep))) {
    const step=page.locator(`[data-score-lab-step="${id}"]`);
    if(await step.count()===0) continue;
    await step.click();
    assert.equal(await page.locator('.scorelab-why-note').count(),0);
    assert.doesNotMatch(await page.locator('.scorelab-why-modal').innerText(),/WARUM VORSORGE|WHY PREPARE/);
    assert.equal(await page.locator('.scorelab-result').count(),1);
    await page.locator('.modal [data-close-modal]').first().click();
  }
  await page.locator('footer [data-legal="imprint"]').click();
  assert.ok((await page.locator('.legal-modal').innerText()).includes("commit&push Venture Builder"));
  await page.screenshot({path:path.join(output,"imprint-390.png")});
  await page.locator('.modal [data-close-modal]').click();
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('.modal [data-open-auth="forgot"]').click();
  await page.locator('[name="email"]').fill("recovery@example.test");
  await page.locator('[data-recovery-submit]').click();
  await page.locator('.auth-notice').waitFor();
  assert.equal(requests.filter(item=>item.body.action==="request_password_reset").length,1);
  assert.equal(await page.locator('[data-recovery-submit]').isDisabled(),true);
  // Put an existing, different QA login in place through its normal UI.
  await page.locator('.modal [data-open-auth="login"]').click();
  await page.locator('[name="email"]').fill("qa@example.test");
  await page.locator('[name="password"]').fill("test-only-password");
  await page.locator('[data-auth-form] button.green').click();
  await page.locator('[data-auth-form]').waitFor({state:"hidden"});
  const normalSession=await page.evaluate(()=>localStorage.getItem("redscore-session-v1"));
  const callback="http://127.0.0.1:4181/?auth=confirmed#type=recovery&access_token=development-recovery&refresh_token=do-not-store&expires_in=3600";
  await page.goto(callback);
  await page.locator('[data-password-update-form]').waitFor();
  assert.equal(page.url(),"http://127.0.0.1:4181/#/home");
  assert.equal(await page.evaluate(()=>localStorage.getItem("redscore-session-v1")),normalSession);
  assert.doesNotMatch(await page.evaluate(()=>sessionStorage.getItem("redscore-recovery-v1")),/do-not-store|refresh_token/);
  for(const width of [390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await page.screenshot({path:path.join(output,`reset-${width}.png`)});
  }
  await page.reload();
  await page.locator('[data-password-update-form]').waitFor();
  await page.locator('[name="password"]').fill("test-only-new-password");
  await page.locator('[name="passwordRepeat"]').fill("test-only-mismatch");
  await page.locator('[data-password-update-form] button.green').click();
  assert.match(await page.locator('[data-form-error]').innerText(),/stimmen nicht überein/);
  assert.equal(requests.filter(item=>item.body.action==="update_password").length,0);
  await page.locator('[name="passwordRepeat"]').fill("test-only-new-password");
  await page.locator('[data-password-update-form] button.green').click();
  await page.locator('[data-auth-form]').waitFor();
  assert.match(await page.locator('.auth-notice').innerText(),/Passwort wurde geändert/);
  assert.equal(await page.locator('[name="password"]').inputValue(),"");
  assert.equal(await page.evaluate(()=>sessionStorage.getItem("redscore-recovery-v1")),null);
  const update=requests.find(item=>item.body.action==="update_password");
  assert.equal(update.authorization,"Bearer development-recovery");
  assert.equal(await page.evaluate(()=>localStorage.getItem("redscore-session-v1")),normalSession);
  await page.goto("http://127.0.0.1:4181/?lang=en&auth=recovery#type=recovery&access_token=invalid&expires_in=3600");
  await page.locator('.modal [data-open-auth="forgot"]').waitFor();
  assert.match(await page.locator('.modal').innerText(),/reset link is invalid or has expired/);
  assert.equal(await page.locator('[data-password-update-form]').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",viewports:[390,768,1440],normalSessionIsolated:true,reload:true,mismatch:true,invalidLink:true,uiRequests:true,realPasswordsChanged:0,errors,screenshots:output},null,2));
}catch(error){await page.screenshot({path:path.join(output,"failure.png")});console.error(JSON.stringify({errors,visibleText:(await page.locator("body").innerText()).slice(-3000)},null,2));throw error;}finally{await browser.close();}
