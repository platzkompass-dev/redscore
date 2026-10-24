// Isolated browser test: run scripts/qa-server.mjs first. No production credentials/data.
// PLAYWRIGHT_PACKAGE points to an installed playwright package directory.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || "playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
let saved;
page.on("request", request => {
  if (request.url() === "http://127.0.0.1:4181/api/account" && request.method() === "POST") {
    const input = request.postDataJSON();
    if (input.action === "save") saved = input;
  }
});
const output = path.join(os.tmpdir(), "redscore-household-qa");
await mkdir(output, { recursive: true });
try {
  await page.goto("http://127.0.0.1:4181/#/home");
  await page.locator('[data-open-auth="login"]').first().click();
  await page.locator('[name="email"]').fill("qa@example.test");
  await page.locator('[name="password"]').fill("test-only-password");
  await page.locator("[data-auth-form] button[type=submit], [data-auth-form] button.green").click();
  await page.locator("[data-auth-form]").waitFor({ state: "hidden" });
  await page.goto("http://127.0.0.1:4181/#/profile");
  await page.locator("[data-edit-household]").first().click();
  const child = page.locator('[name="childGender0"]');
  await child.waitFor({ state: "visible" });
  assert.equal(await child.inputValue(), "girl");
  assert.deepEqual(await child.locator("option:not([disabled])").allTextContents(), ["Weiblich", "Männlich"]);
  assert.ok((await page.locator('[name="adultGender0"] option').allTextContents()).includes("Divers / nichtbinär"));

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await child.scrollIntoViewIfNeeded();
    const bounds = await child.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `child selector fits at ${width}px`);
    assert.equal(await page.locator(".onboarding-modal").evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.screenshot({ path: path.join(output, `child-selector-${width}.png`) });
  }

  await page.locator('[name="children"]').fill("2");
  await page.locator('[name="childGender1"]').waitFor({ state: "visible" });
  assert.equal(await page.locator("[data-onboarding-form]").evaluate(form => form.checkValidity()), false);
  await page.locator('[name="childGender1"]').selectOption("boy");
  await page.locator("[data-onboarding-form] button.green").click();
  await page.locator(".onboarding-modal").waitFor({ state: "hidden" });
  assert.deepEqual(saved.profile.children_details, [{ gender: "girl" }, { gender: "boy" }]);
  assert.equal(saved.profile.selected_scene, "family-woman-man-boy-girl");

  await page.reload();
  await page.locator("[data-edit-household]").first().click();
  assert.equal(await page.locator('[name="childGender0"]').inputValue(), "girl");
  assert.equal(await page.locator('[name="childGender1"]').inputValue(), "boy");
  await page.locator('[name="children"]').fill("1");
  await child.selectOption("girl");
  await page.locator("[data-onboarding-form] button.green").click();
  await page.locator(".onboarding-modal").waitFor({ state: "hidden" });
  assert.equal(saved.profile.selected_scene, "family-woman-man-girl");
  assert.deepEqual(saved.profile.children_details, [{ gender: "girl" }]);
  await page.goto("http://127.0.0.1:4181/#/home");
  const motif = page.locator('[style*="--hero-photo"]').first();
  assert.match(await motif.getAttribute("style"), /family-woman-man-girl\.png/);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,"daughter-home-390.png")});
  await context.setOffline(true);
  await page.evaluate(() => { location.hash = "#/profile"; });
  await page.locator("[data-edit-household]").first().click();
  assert.equal(await child.inputValue(), "girl");
  await child.selectOption("boy");
  await page.locator("[data-onboarding-form] button.green").click();
  await page.locator(".onboarding-modal").waitFor({ state: "hidden" });
  await page.evaluate(() => { location.hash = "#/home"; });
  assert.match(await motif.getAttribute("style"), /family-woman-man\.png/);
  const local = await page.evaluate(() => JSON.parse(localStorage.getItem("redscore-state-v1")));
  assert.deepEqual(local.household.childDetails, [{ gender: "boy" }]);
  assert.equal(local.sync.pending, true);
  await context.setOffline(false);
  await page.goto("http://127.0.0.1:4181/?lang=en#/profile");
  await page.locator("[data-edit-household]").first().click();
  await child.waitFor({state:"visible"});
  assert.deepEqual(await child.locator("option:not([disabled])").allTextContents(), ["Female","Male"]);
  assert.equal(await page.locator('[data-child-index="0"] span').textContent(), "Child 1 – gender");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: "PASS", viewports: [390,768,1440], choices: ["Weiblich","Männlich"], savedAndReloaded: true, offlineSave: true, screenshots: output, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(output, "failure.png") });
  console.error(JSON.stringify({ errors, visibleText: (await page.locator("body").innerText()).slice(-4500), screenshot: path.join(output,"failure.png") }, null, 2));
  throw error;
} finally { await browser.close(); }
