insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values
  (
    'nasa-eonet',
    'NASA EONET · Laufende Naturereignisse',
    'https://eonet.gsfc.nasa.gov',
    'rest_api',
    'eonet',
    'official',
    true,
    300,
    array['eonet.gsfc.nasa.gov'],
    jsonb_build_object(
      'endpoint', 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=100',
      'canonical_url', 'https://eonet.gsfc.nasa.gov/'
    )
  ),
  (
    'usgs-significant-earthquakes',
    'USGS · Signifikante Erdbeben',
    'https://earthquake.usgs.gov',
    'rest_api',
    'usgs',
    'official',
    true,
    60,
    array['earthquake.usgs.gov'],
    jsonb_build_object(
      'endpoint', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
      'canonical_url', 'https://earthquake.usgs.gov/earthquakes/map/'
    )
  ),
  (
    'nws-severe-alerts',
    'NOAA/NWS · Schwere Wetterwarnungen',
    'https://api.weather.gov',
    'rest_api',
    'nws',
    'official',
    true,
    60,
    array['api.weather.gov'],
    jsonb_build_object(
      'endpoint', 'https://api.weather.gov/alerts/active?status=actual&severity=Extreme%2CSevere',
      'canonical_url', 'https://api.weather.gov/alerts/active'
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
