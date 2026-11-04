create schema if not exists redscore_private;
revoke all on schema redscore_private from public,anon,authenticated;
create extension if not exists pg_cron with schema pg_catalog;
-- Only daily aggregates are retained. Session hashes expire after two days.
create table redscore_private.web_daily_counts (
  day date not null,
  route text not null,
  pageviews bigint not null default 0 check(pageviews>=0),
  visits bigint not null default 0 check(visits>=0),
  primary key(day,route)
);
create table redscore_private.web_visit_keys (
  day date not null,
  route text not null,
  session_hash text not null,
  last_seen timestamptz not null,
  events integer not null default 0,
  primary key(day,route,session_hash)
);
alter table redscore_private.web_daily_counts enable row level security;
alter table redscore_private.web_visit_keys enable row level security;
revoke all on redscore_private.web_daily_counts,redscore_private.web_visit_keys from public,anon,authenticated;
grant usage on schema redscore_private to service_role;
grant select,insert,update,delete on redscore_private.web_daily_counts,redscore_private.web_visit_keys to service_role;
create function public.record_redscore_visit(p_route text,p_session uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare
  v_day date := (now() at time zone 'Europe/Berlin')::date;
  v_hash text := encode(extensions.digest(p_session::text||v_day::text,'sha256'),'hex');
  v_previous redscore_private.web_visit_keys;
  v_new_total boolean;
  v_new_route boolean;
begin
  if p_session is null or p_route is null or p_route<>all(array['/','/angebote','/ratgeber/index.html','/ratgeber/notvorrat.html','/ratgeber/notfallrucksack.html','/ratgeber/stromausfall.html','/en/guides/index.html','/en/guides/emergency-supplies.html','/en/guides/emergency-backpack.html','/en/guides/power-outage.html']) then
    raise exception 'invalid public route';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_hash,0));
  select * into v_previous from redscore_private.web_visit_keys where day=v_day and route='*' and session_hash=v_hash;
  v_new_total := not found;
  if not v_new_total and v_previous.events>=200 then return; end if;
  select * into v_previous from redscore_private.web_visit_keys where day=v_day and route=p_route and session_hash=v_hash;
  v_new_route := not found;
  if not v_new_route and v_previous.last_seen>now()-interval '10 seconds' then return; end if;
  insert into redscore_private.web_visit_keys(day,route,session_hash,last_seen,events)
    values(v_day,'*',v_hash,now(),1),(v_day,p_route,v_hash,now(),1)
    on conflict(day,route,session_hash) do update set last_seen=excluded.last_seen,events=web_visit_keys.events+1;
  insert into redscore_private.web_daily_counts(day,route,pageviews,visits)
    values(v_day,'*',1,case when v_new_total then 1 else 0 end),(v_day,p_route,1,case when v_new_route then 1 else 0 end)
    on conflict(day,route) do update set pageviews=web_daily_counts.pageviews+1,visits=web_daily_counts.visits+excluded.visits;
  delete from redscore_private.web_visit_keys where day<v_day-1;
  delete from redscore_private.web_daily_counts where day<=v_day-400;
end;
$$;
revoke all on function public.record_redscore_visit(text,uuid) from public,anon,authenticated;
grant execute on function public.record_redscore_visit(text,uuid) to service_role;
comment on table redscore_private.web_daily_counts is 'Consent-based public pageviews and daily tab visits; * is the site total. Not registered users or unique people.';
select cron.schedule('redscore-visit-retention','15 2 * * *',
  $job$delete from redscore_private.web_visit_keys where day<(now() at time zone 'Europe/Berlin')::date-1;
  delete from redscore_private.web_daily_counts where day<=(now() at time zone 'Europe/Berlin')::date-400;$job$);
