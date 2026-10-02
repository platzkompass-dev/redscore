insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values
  (
    'bbk-rss',
    'BBK · Aktuelle Meldungen',
    'https://www.bbk.bund.de',
    'rss',
    'rss',
    'official',
    true,
    300,
    array['www.bbk.bund.de'],
    jsonb_build_object(
      'endpoint', 'https://www.bbk.bund.de/DE/Infothek/Unsere-Meldungen/RSSNewsfeed/_functions/rssnewsfeed-bbk.xml?nn=20130',
      'canonical_url', 'https://www.bbk.bund.de/DE/Infothek/Unsere-Meldungen/RSSNewsfeed/rssnewsfeed_node.html',
      'query', 'warnung,katastrophenschutz,bevölkerungsschutz,hochwasser,unwetter,krise,notfall,stromausfall,cyber,feuer'
    )
  ),
  (
    'bmds-rss',
    'Bundesministerium für Digitales und Staatsmodernisierung · Meldungen',
    'https://bmds.bund.de',
    'rss',
    'rss',
    'official',
    true,
    600,
    array['bmds.bund.de'],
    jsonb_build_object(
      'endpoint', 'https://bmds.bund.de/feed',
      'canonical_url', 'https://bmds.bund.de/feed',
      'query', 'cyber,ausfall,störung,telekommunikation,netz, kritische infrastruktur'
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
