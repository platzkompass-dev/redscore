insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values (
  'gdelt-verified-germany',
  'GDELT · etablierte Originalquellen',
  'https://api.gdeltproject.org',
  'rest_api',
  'gdelt',
  'verified',
  true,
  300,
  array[
    'api.gdeltproject.org',
    'tagesschau.de','www.tagesschau.de','rbb24.de','www.rbb24.de','ndr.de','www.ndr.de',
    'wdr.de','www1.wdr.de','swr.de','www.swr.de','br.de','www.br.de','mdr.de','www.mdr.de',
    'deutschlandfunk.de','www.deutschlandfunk.de','dw.com','www.dw.com','reuters.com','www.reuters.com',
    'apnews.com','www.apnews.com','heise.de','www.heise.de','golem.de','www.golem.de',
    'zeit.de','www.zeit.de','sueddeutsche.de','www.sueddeutsche.de','faz.net','www.faz.net',
    'handelsblatt.com','www.handelsblatt.com','spiegel.de','www.spiegel.de','welt.de','www.welt.de',
    'bundesregierung.de','www.bundesregierung.de','bmv.de','www.bmv.de','bundespolizei.de','www.bundespolizei.de',
    'polizei.brandenburg.de'
  ],
  jsonb_build_object(
    'endpoint', 'https://api.gdeltproject.org/api/v2/doc/doc',
    'query', '(drone OR UAV OR cyberattack OR ransomware OR blackout OR "power outage" OR "network outage" OR "critical infrastructure" OR "drinking water" OR flood OR storm OR hurricane OR tornado OR "extreme heat" OR wildfire OR earthquake OR volcano OR tsunami OR evacuation OR "major fire" OR "chemical leak" OR radiological OR nuclear OR "airport closure" OR sabotage) sourcecountry:Germany'
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
  config = excluded.config;

comment on table public.news_sources is
  'Central Live-Lage source registry. Verified media monitoring is never displayed as an official warning.';
