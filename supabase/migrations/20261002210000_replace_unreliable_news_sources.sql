update public.news_sources
set enabled = false
where slug in ('bmds-rss', 'gdelt-verified-germany');

insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values (
  'presseportal-polizei',
  'Presseportal · Polizei, Feuerwehr und Behörden',
  'https://www.presseportal.de',
  'rss',
  'rss',
  'verified',
  true,
  300,
  array['www.presseportal.de'],
  jsonb_build_object(
    'endpoint', 'https://www.presseportal.de/rss/polizei.rss2',
    'canonical_url', 'https://www.presseportal.de/blaulicht/',
    'query', 'drohne,drohnen,cyber,ransomware,stromausfall,blackout,flughafen,evakuierung,großbrand,grossbrand,gefahrstoff,chemieunfall,radioaktiv,nuklear,sabotage,kritische infrastruktur,hochwasser,überflutung,starkregen,orkan,unwetter,waldbrand,explosion'
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

comment on table public.news_sources is
  'Central Live-Lage source registry. Media and agency feeds remain clearly separated from official warning sources.';
