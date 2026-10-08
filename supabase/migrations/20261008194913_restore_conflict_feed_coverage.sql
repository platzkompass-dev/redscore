-- The public, sanitized read model stays separate from private ingestion tables.
-- Keep the old RPC during rollout so the previously deployed Edge Function works.
create or replace function public.get_filtered_live_lage_events(
  p_limit integer default 400,
  p_cutoff timestamptz default (now() - interval '7 days'),
  p_categories text[] default null,
  p_scope text default 'all',
  p_region text default '',
  p_district text default ''
)
returns table (
  id uuid, title text, summary text, category text, severity text,
  verification_status text, source_trust_level text, country text, region text,
  city text, latitude double precision, longitude double precision,
  geographic_scope text, affected_radius_km numeric, published_at timestamptz,
  first_seen_at timestamptz, last_seen_at timestamptz, updated_at timestamptz,
  canonical_url text, source_count integer, organizations text[], tags text[], sources jsonb
)
language sql stable security definer set search_path = ''
as $$
  with candidates as (
    select e.*, row_number() over (
      partition by e.category order by
        case when nullif(trim(p_district), '') is not null and strpos(lower(concat_ws(' ', e.region, e.city)), lower(left(p_district, 80))) > 0 then 2
             when nullif(trim(p_region), '') is not null and strpos(lower(concat_ws(' ', e.region, e.city)), lower(left(p_region, 80))) > 0 then 1 else 0 end desc,
        case e.severity when 'critical' then 3 when 'high' then 2 else 1 end desc,
        e.published_at desc, e.id
    ) as category_rank
    from public.news_events e
    where e.active and e.severity in ('critical', 'high', 'medium')
      and (e.expires_at is null or e.expires_at > now())
      and e.published_at >= greatest(coalesce(p_cutoff, now() - interval '7 days'), now() - interval '30 days')
      and e.published_at <= now() + interval '15 minutes'
      and (p_categories is null or e.category = any(p_categories))
      and (p_scope not in ('germany', 'world') or
        (p_scope = 'germany' and lower(e.country) in ('deutschland', 'germany')) or
        (p_scope = 'world' and lower(e.country) not in ('deutschland', 'germany')))
  ), selected as (
    select * from candidates
    -- Round-robin categories stops a high-volume weather source crowding out wars.
    order by category_rank, published_at desc, id
    limit least(greatest(coalesce(p_limit, 400), 1), 500)
  )
  select e.id, e.title, e.summary, e.category, e.severity, e.verification_status,
    e.source_trust_level, e.country, e.region, e.city, e.latitude, e.longitude,
    e.geographic_scope, e.affected_radius_km, e.published_at, e.first_seen_at,
    e.last_seen_at, e.updated_at, e.canonical_url, e.source_count, e.organizations, e.tags,
    coalesce((select jsonb_agg(jsonb_build_object(
      'name', s.name, 'trust_level', s.trust_level, 'url', es.source_url,
      'title', es.source_title, 'published_at', es.source_published_at
    ) order by es.source_published_at desc nulls last)
      from public.news_event_sources es join public.news_sources s on s.id = es.source_id
      where es.event_id = e.id), '[]'::jsonb)
  from selected e;
$$;

revoke all on function public.get_filtered_live_lage_events(integer, timestamptz, text[], text, text, text) from public;
grant execute on function public.get_filtered_live_lage_events(integer, timestamptz, text[], text, text, text) to anon, authenticated, service_role;

-- Same publisher/source ID, not a second "independent" confirmation from UN News.
update public.news_sources set
  config = jsonb_build_object(
    'endpoint', 'https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml',
    'canonical_url', 'https://news.un.org/en/news/topic/peace-and-security',
    'categories', jsonb_build_array('international_security'), 'language', 'en',
    'terms_url', 'https://www.un.org/en/about-us/terms-of-use'),
  last_successful_fetch = null, last_error = null, last_error_at = null
where slug = 'un-news-conflicts';

-- RTL explicitly permits embedding its RSS content, subject to withdrawal.
-- No publisher images/videos or articles are downloaded or republished.
insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values ('rtl-security-news', 'RTL News', 'https://www.rtl.de', 'rss', 'rss', 'verified', true, 180,
  array['www.rtl.de'], jsonb_build_object('endpoint', 'https://www.rtl.de/rss/feed/news',
    'canonical_url', 'https://www.rtl.de/news', 'language', 'de',
    'categories', jsonb_build_array('international_security'),
    'terms_url', 'https://www.rtl.de/cms/rss-feed-abonnieren-sie-die-rtl-de-auf-ihrem-feedreader-4476976.html'))
on conflict (slug) do update set config = excluded.config, enabled = excluded.enabled,
  allowed_hosts = excluded.allowed_hosts, last_error = null, last_error_at = null;
