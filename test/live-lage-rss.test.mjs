import test from "node:test";
import assert from "node:assert/strict";
import { rssAdapter } from "../supabase/functions/_shared/live-lage/adapters/rss.ts";

const originalFetch = globalThis.fetch;

test.afterEach(() => { globalThis.fetch = originalFetch; });

const source = {
  id: "source-id",
  slug: "un-news-conflicts",
  name: "UN News · Kriege und Konflikte",
  source_type: "rss",
  adapter_key: "rss",
  trust_level: "verified",
  polling_interval_seconds: 180,
  allowed_hosts: ["news.un.org"],
  config: {
    endpoint: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    canonical_url: "https://news.un.org/en/news/topic/peace-and-security",
    query: "missiles kill,war",
  },
};

test("imports only concrete conflict incidents and identifies their country", async () => {
  globalThis.fetch = async () => new Response(`<?xml version="1.0" encoding="UTF-8"?><rss><channel>
    <item><title>Russian missiles kill 17 more in Ukraine</title><description><![CDATA[<b>Emergency teams</b> are responding after the overnight attack.]]></description><link>https://news.un.org/en/story/2026/10/123456</link><guid>un-123456</guid><pubDate>Fri, 03 Oct 2026 06:00:00 GMT</pubDate></item>
    <item><title>Analysis: What the Ukraine war means for diplomacy</title><description>Experts discuss the political outlook.</description><link>https://news.un.org/en/story/2026/10/123457</link><guid>un-123457</guid><pubDate>Fri, 03 Oct 2026 06:10:00 GMT</pubDate></item>
  </channel></rss>`, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });

  const events = await rssAdapter.fetch(source);
  assert.equal(events.length, 1);
  assert.equal(events[0].category, "international_security");
  assert.equal(events[0].country, "Ukraine");
  assert.equal(events[0].severity, "high");
  assert.equal(events[0].verificationStatus, "verified");
  assert.equal(events[0].summary.includes("<b>"), false);
});

function rssItem(title, description = "", published = "Thu, 08 Oct 2026 10:00:00 GMT", id = "1") {
  return `<item><title>${title}</title><description>${description}</description><link>https://news.un.org/en/story/${id}</link><guid>${id}</guid>${published ? `<pubDate>${published}</pubDate>` : ""}</item>`;
}

async function importItems(items, config = {}) {
  globalThis.fetch = async () => new Response(`<rss><channel>${items.join("")}</channel></rss>`, { headers: { "content-type": "application/rss+xml" } });
  return rssAdapter.fetch({ ...source, config: { ...source.config, query: "", categories: ["international_security"], ...config } });
}

test("recognizes Ukraine attacks, US-Iran conflict updates and US military attacks", async () => {
  const events = await importItems([
    rssItem("Ukraine: UN condemns latest attacks and calls for civilian protection", "Russia attacked cities overnight.", undefined, "1"),
    rssItem("In Islamabad, Guterres calls for end to US-Iran conflict", "The United States and Iran remain in conflict.", undefined, "2"),
    rssItem("USA melden Angriff auf Militärstützpunkt", "In Washington berichtet das Militär über den Vorfall.", undefined, "3"),
    rssItem("Russland greift die Ukraine erneut an", "Berlin verurteilt die Angriffe.", undefined, "4"),
  ]);
  assert.equal(events.length, 4);
  assert.deepEqual(events.map(x => x.country), ["Ukraine", "Iran", "USA", "Ukraine"]);
  assert.ok(events[0].tags.includes("conflict:russia-ukraine"));
  assert.ok(events[1].tags.includes("conflict:us-iran"));
  assert.ok(events.every(x => x.verificationStatus === "verified"));
});

test("rejects general politics, opinion, anniversaries and undated war reports", async () => {
  const events = await importItems([
    rssItem("USA und Iran verhandeln über Handelsbeziehungen"),
    rssItem("Analysis: Russia's military offensive and the election"),
    rssItem("Three years on from the attacks in Israel"),
    rssItem("Russian missiles hit Ukraine", "An attack was reported.", ""),
    rssItem("Ukraine: Wahlkampf in Kiew beginnt"),
  ]);
  assert.equal(events.length, 0);
});

test("supports category restrictions and a declared feed language", async () => {
  const events = await importItems([rssItem("Iran: USA melden Luftangriff", "Nach einem Militärschlag sind Rettungskräfte im Einsatz.")], { language: "de" });
  assert.equal(events.length, 1);
  assert.ok(events[0].tags.includes("source-language:de"));
  assert.equal((await importItems([rssItem("Iran: USA melden Luftangriff")], { categories: ["cyber"] })).length, 0);
});
