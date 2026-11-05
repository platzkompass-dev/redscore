-- Private operational incidents; no messages or personal data are collected.
create table redscore_private.operational_alerts (
  alert_key text primary key,
  severity text not null check(severity in ('warning','critical')),
  status text not null check(status in ('open','resolved')),
  source_slug text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  occurrences integer not null default 1
);
alter table redscore_private.operational_alerts enable row level security;
revoke all on redscore_private.operational_alerts from public,anon,authenticated;
grant select,insert,update,delete on redscore_private.operational_alerts to service_role;

create view redscore_private.live_lage_health_sources with (security_invoker=true) as
select slug,last_successful_fetch,
  coalesce(last_successful_fetch>=now()-make_interval(secs=>greatest(900,polling_interval_seconds*3)),false) as fresh,
  coalesce(last_error_at>coalesce(last_successful_fetch,'-infinity'::timestamptz),false) as failed
from public.news_sources where enabled;
revoke all on redscore_private.live_lage_health_sources from public,anon,authenticated;
grant select on redscore_private.live_lage_health_sources to service_role;

-- Deliberately public, read-only summary: counts and sync time only.
create function public.get_redscore_operational_health()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'status',case when count(*)=0 or count(*) filter(where fresh)=0 then 'unavailable'
      when bool_and(fresh and not failed) then 'healthy' else 'degraded' end,
    'enabledSources',count(*),'freshSources',count(*) filter(where fresh),
    'staleSources',count(*) filter(where not fresh),'failedSources',count(*) filter(where failed),
    'lastSuccessfulSync',max(last_successful_fetch))
  from redscore_private.live_lage_health_sources;
$$;
revoke all on function public.get_redscore_operational_health() from public;
grant execute on function public.get_redscore_operational_health() to anon,authenticated,service_role;

create function redscore_private.check_live_lage_health()
returns void language plpgsql security invoker set search_path='' as $$
begin
  update redscore_private.operational_alerts a set status='resolved',resolved_at=now(),last_seen_at=now()
  where a.status='open' and (
    (a.alert_key='live-lage:importer' and exists(select 1 from redscore_private.live_lage_health_sources where fresh))
    or (a.source_slug is not null and not exists(select 1 from redscore_private.live_lage_health_sources s where s.slug=a.source_slug and not s.fresh))
  );
  insert into redscore_private.operational_alerts(alert_key,severity,status,source_slug)
    select 'live-lage:source:'||slug,'warning','open',slug from redscore_private.live_lage_health_sources where not fresh
    union all
    select 'live-lage:importer','critical','open',null where not exists(select 1 from redscore_private.live_lage_health_sources where fresh)
    on conflict(alert_key) do update set
      status='open',last_seen_at=now(),resolved_at=null,
      first_seen_at=case when operational_alerts.status='resolved' then now() else operational_alerts.first_seen_at end,
      occurrences=operational_alerts.occurrences+case when operational_alerts.status='resolved' then 1 else 0 end;
end;
$$;
revoke all on function redscore_private.check_live_lage_health() from public,anon,authenticated;
grant execute on function redscore_private.check_live_lage_health() to service_role;
select cron.schedule('redscore-live-lage-health','*/5 * * * *','select redscore_private.check_live_lage_health();');
select redscore_private.check_live_lage_health();
