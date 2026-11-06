-- Public news excerpts only; no raw payloads, credentials or user data.
create or replace function public.get_live_lage_event_detail(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'summary', e.summary, 'tags', e.tags,
    'updated_at', e.updated_at,
    'sources', coalesce((select jsonb_agg(jsonb_build_object(
      'name', s.name, 'title', es.source_title, 'url', es.source_url,
      'published_at', es.source_published_at
    ) order by es.source_published_at desc nulls last)
    from public.news_event_sources es join public.news_sources s on s.id=es.source_id
    where es.event_id=e.id), '[]'::jsonb)
  ) from public.news_events e
  where e.id=p_id and e.active and e.published_at >= now()-interval '7 days'
    and e.published_at <= now()+interval '15 minutes'
    and (e.expires_at is null or e.expires_at>now())
    and e.severity in ('critical','high','medium');
$$;
revoke all on function public.get_live_lage_event_detail(uuid) from public;
grant execute on function public.get_live_lage_event_detail(uuid) to anon, authenticated, service_role;
