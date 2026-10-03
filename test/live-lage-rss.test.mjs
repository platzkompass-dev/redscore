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
