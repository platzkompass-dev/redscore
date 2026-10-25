// Run qa-server.mjs first. All auth responses are local mocks; no mail is sent.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || "playwright");
const browser = await chromium.launch({channel:"msedge",headless:true});
const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const page = await context.newPage();
const errors = [], requests = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => { if (request.url().endsWith("/api/account") && request.method()==="POST") requests.push(request.postDataJSON()); });
const output = path.join(os.tmpdir(),"redscore-auth-confirmation-qa");
await mkdir(output,{recursive:true});
try {
  await page.clock.install();
  await page.goto("http://127.0.0.1:4181/#/home");
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill("qa@example.test");
  await page.locator('[data-open-auth="resend"]').click();
  assert.equal(await page.locator('[data-resend-form] input').inputValue(),"qa@example.test");
  assert.equal(await page.locator('[data-resend-form] input[type="password"]').count(),0);
  await page.locator('[data-resend-submit]').click();
  await page.locator('.auth-notice').waitFor();
  assert.equal(await page.locator('[data-resend-submit]').isDisabled(),true);
  assert.deepEqual(requests.filter(item=>item.action==="resend_confirmation"),[{action:"resend_confirmation",email:"qa@example.test"}]);
  for (const width of [390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await page.screenshot({path:path.join(output,`confirmation-${width}.png`)});
  }
  await page.clock.fastForward(61_000);
  assert.equal(await page.locator('[data-resend-submit]').isDisabled(),false);
  await page.locator('.modal [data-open-auth="login"]').click();
  assert.equal(await page.locator('[name="email"]').inputValue(),"qa@example.test");
  await page.locator('.modal [data-open-auth="register"]').click();
  await page.locator('[name="displayName"]').fill("QA only");
  await page.locator('[name="password"]').fill("test-only-password");
  await page.locator('[data-auth-form] button.green').click();
  await page.locator('[data-resend-form]').waitFor();
  assert.equal(await page.locator('[data-resend-submit]').isDisabled(),true);
  assert.equal(requests.filter(item=>item.action==="resend_confirmation").length,1,"registration must not cause a second mail request");
  await page.goto("http://127.0.0.1:4181/?lang=en#/home");
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[data-open-auth="resend"]').click();
  assert.equal(await page.locator('.modal h2').textContent(),"Missing your confirmation email?");
  await page.locator('[name="email"]').fill("qa@example.test");
  await context.setOffline(true);
  await page.locator('[data-resend-submit]').click();
  await page.locator('[data-form-error]:not([hidden])').waitFor();
  assert.match(await page.locator('[data-form-error]').textContent(),/You are offline/);
  assert.equal(requests.filter(item=>item.action==="resend_confirmation").length,1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:"PASS",viewports:[390,768,1440],cooldown:true,registrationHint:true,english:true,offline:true,realEmailsSent:0,screenshots:output,errors},null,2));
} catch(error) {
  await page.screenshot({path:path.join(output,"failure.png")});
  console.error(JSON.stringify({errors,visibleText:await page.locator("body").innerText()},null,2));
  throw error;
} finally {await browser.close();}
