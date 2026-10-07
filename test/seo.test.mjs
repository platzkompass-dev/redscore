import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

test("publishes complete search and social metadata", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.redscore\.de\/"/);
  assert.match(html, /name="robots" content="index, follow/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="og:locale:alternate" content="en_GB"/);
  assert.match(html, /name="twitter:url" content="https:\/\/www\.redscore\.de\/"/);
  assert.match(html, /"@type": "WebApplication"/);
  assert.match(html, /"price": "0"/);
  assert.match(app, /Jetzt kostenlos starten/);
  assert.match(app, /data-share-redscore/);
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

test("every sitemap guide has crawlable content, matching canonical metadata and working local links", async () => {
  const origin = "https://www.redscore.de";
  const sitemap = await readFile(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  const guides = urls.filter(url => url.pathname !== "/");
  assert.equal(guides.length, 8);
  for (const url of guides) {
    assert.equal(url.origin, origin);
    const file = new URL(`../dist${url.pathname}`, import.meta.url);
    const html = await readFile(file, "utf8");
    assert.ok(html.includes(`<link rel="canonical" href="${url.href}">`));
    assert.match(html, /<h1>[^<]+<\/h1>/);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    assert.equal(schema.url, url.href);
    assert.equal(schema.inLanguage, url.pathname.startsWith("/en/") ? "en" : "de-DE");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = new URL(match[1], url);
      if (target.origin === origin && target.pathname !== "/") {
        await access(new URL(`../dist${target.pathname}`, import.meta.url));
      }
    }
  }
});
