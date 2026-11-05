-- Owner-only verification. Simulated source outages are never committed.
begin;
set local statement_timeout='10s';
do $$
declare sample_slug text; state jsonb;
begin
  select slug into sample_slug from public.news_sources where enabled order by slug limit 1;
  if sample_slug is null then raise exception 'No enabled source to test'; end if;
  update public.news_sources set last_successful_fetch=now()-interval '2 days' where slug=sample_slug;
  perform redscore_private.check_live_lage_health();
  if not exists(select 1 from redscore_private.operational_alerts where source_slug=sample_slug and status='open') then raise exception 'Missing source outage alert'; end if;
  update public.news_sources set last_successful_fetch=now()-interval '2 days' where enabled;
  state:=public.get_redscore_operational_health();
  if state->>'status'<>'unavailable' then raise exception 'Stale sources falsely healthy'; end if;
  perform redscore_private.check_live_lage_health();
  if not exists(select 1 from redscore_private.operational_alerts where alert_key='live-lage:importer' and severity='critical' and status='open') then raise exception 'Missing importer outage alert'; end if;
  update public.news_sources set last_successful_fetch=now(),last_error_at=null where enabled;
  perform redscore_private.check_live_lage_health();
  state:=public.get_redscore_operational_health();
  if state->>'status'<>'healthy' then raise exception 'Recovery not recognized'; end if;
  if exists(select 1 from redscore_private.operational_alerts where status='open') then raise exception 'Recovered alerts remain open'; end if;
  update public.news_sources set enabled=false;
  state:=public.get_redscore_operational_health();
  if state->>'status'<>'unavailable' or (state->>'enabledSources')::integer<>0 then raise exception 'Empty source registry falsely healthy'; end if;
end;
$$;
select 'PASS: individual outage, importer outage, recovery, disabled sources; rolled back' as verification;
rollback;
