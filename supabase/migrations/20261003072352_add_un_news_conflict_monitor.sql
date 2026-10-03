insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values (
  'un-news-conflicts',
  'UN News · Kriege und Konflikte',
  'https://news.un.org',
  'rss',
  'rss',
  'verified',
  true,
  180,
  array['news.un.org'],
  jsonb_build_object(
    'endpoint', 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    'canonical_url', 'https://news.un.org/en/news/topic/peace-and-security',
    'query', 'airstrike,air strike,missile attack,missiles kill,drone attack,military strike,bombardment,shelling,armed clash,fighting,ceasefire,invasion,military offensive,luftangriff,raketenangriff,drohnenangriff,militärschlag,beschuss,gefecht,kampfhandlungen,waffenruhe,waffenstillstand'
  )
)
on conflict (slug) do update set
  name = excluded.name,
  base_url = excluded.base_url,
  source_type = excluded.source_type,
  adapter_key = excluded.adapter_key,
  trust_level = excluded.trust_level,
  enabled = excluded.enabled,
  polling_interval_seconds = excluded.polling_interval_seconds,
  allowed_hosts = excluded.allowed_hosts,
  config = excluded.config,
  last_error = null,
  last_error_at = null;

