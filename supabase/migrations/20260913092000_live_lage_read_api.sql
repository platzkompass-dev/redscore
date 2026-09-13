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
  where e.active = true and e.published_at >= p_cutoff
  order by e.published_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.get_live_lage_source_state()
returns table (
  slug text,
  name text,
  last_successful_fetch timestamptz,
  last_error_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slug, s.name, s.last_successful_fetch, s.last_error_at
  from public.news_sources s
  where s.enabled = true
  order by s.last_successful_fetch desc nulls last;
$$;

revoke all on function public.get_live_lage_events(integer, timestamptz) from public;
revoke all on function public.get_live_lage_source_state() from public;
grant execute on function public.get_live_lage_events(integer, timestamptz) to anon, authenticated, service_role;
grant execute on function public.get_live_lage_source_state() to anon, authenticated, service_role;
