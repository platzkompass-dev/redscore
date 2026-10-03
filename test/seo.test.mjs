import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("publishes complete search and social metadata", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.redscore\.de\/"/);
  assert.match(html, /name="robots" content="index, follow/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /"@type": "WebApplication"/);
  assert.match(html, /"price": "0"/);
  assert.match(app, /Jetzt kostenlos starten/);
});

test("publishes crawler controls and the canonical sitemap", async () => {
  const robots = await readFile(new URL("../dist/robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /https:\/\/www\.redscore\.de\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/www\.redscore\.de\/<\/loc>/);
});

test("loads privacy-friendly analytics only on the production domain", async () => {
  const analytics = await readFile(new URL("../dist/analytics.js", import.meta.url), "utf8");
  assert.match(analytics, /redscore\\\.de/);
  assert.match(analytics, /\/_vercel\/insights\/script\.js/);
});
