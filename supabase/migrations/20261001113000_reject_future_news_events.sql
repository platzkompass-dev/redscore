create or replace function public.get_live_lage_events(
  p_limit integer default 200,
  p_cutoff timestamptz default (now() - interval '30 days')
)
returns table (
  id uuid,
  title text,
  summary text,
  category text,
  severity text,
  verification_status text,
  source_trust_level text,
  country text,
  region text,
  city text,
  latitude double precision,
  longitude double precision,
  geographic_scope text,
  affected_radius_km numeric,
  published_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  updated_at timestamptz,
  canonical_url text,
  source_count integer,
  organizations text[],
  tags text[],
  sources jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.title, e.summary, e.category, e.severity, e.verification_status,
    e.source_trust_level, e.country, e.region, e.city, e.latitude, e.longitude,
    e.geographic_scope, e.affected_radius_km, e.published_at, e.first_seen_at,
    e.last_seen_at, e.updated_at, e.canonical_url, e.source_count, e.organizations, e.tags,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', s.name,
        'trust_level', s.trust_level,
        'url', es.source_url,
        'title', es.source_title,
        'published_at', es.source_published_at
      ) order by es.source_published_at desc nulls last)
      from public.news_event_sources es
      join public.news_sources s on s.id = es.source_id
      where es.event_id = e.id
    ), '[]'::jsonb) as sources
  from public.news_events e
  where e.active = true
    and e.published_at >= p_cutoff
    and e.published_at <= now() + interval '15 minutes'
  order by e.published_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

revoke all on function public.get_live_lage_events(integer, timestamptz) from public;
grant execute on function public.get_live_lage_events(integer, timestamptz) to anon, authenticated, service_role;

update public.news_events
set active = false,
    updated_at = now()
where active = true
  and published_at > now() + interval '15 minutes';
