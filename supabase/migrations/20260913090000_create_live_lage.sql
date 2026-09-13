create schema if not exists plans_private;
revoke all on schema plans_private from public, anon, authenticated;

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  base_url text not null check (base_url ~ '^https://'),
  source_type text not null check (source_type in ('rest_api','rss','atom','json_feed','cap')),
  adapter_key text not null,
  trust_level text not null check (trust_level in ('official','verified','osint','unknown')),
  enabled boolean not null default false,
  polling_interval_seconds integer not null default 300 check (polling_interval_seconds between 60 and 86400),
  allowed_hosts text[] not null default '{}',
  config jsonb not null default '{}',
  last_successful_fetch timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 5 and 300),
  summary text not null default '' check (char_length(summary) <= 1200),
  category text not null check (category in (
    'drones','critical_infrastructure','cyber','it_outage','power_outage',
    'telecom_outage','drinking_water','flood','heavy_rain','storm','extreme_heat',
    'wildfire','earthquake','volcano','tsunami','severe_weather','evacuation',
    'major_fire','chemical_incident','hazmat','radiological','transport_outage',
    'supply_disruption','civil_protection','official_warning','international_security'
  )),
  severity text not null check (severity in ('critical','high','medium','low','info')),
  verification_status text not null check (verification_status in ('official','verified','multiple_sources','osint_unconfirmed','unknown')),
  source_trust_level text not null check (source_trust_level in ('official','verified','osint','unknown')),
  country text not null default '',
  region text,
  city text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  geographic_scope text,
  affected_radius_km numeric(10,2) check (affected_radius_km is null or affected_radius_km >= 0),
  organizations text[] not null default '{}',
  tags text[] not null default '{}',
  published_at timestamptz not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  canonical_url text not null check (canonical_url ~ '^https://'),
  title_fingerprint text not null,
  duplicate_group_id uuid,
  source_count integer not null default 1 check (source_count >= 1),
  active boolean not null default true
);

alter table public.news_events
  add constraint news_events_duplicate_group_fk
  foreign key (duplicate_group_id) references public.news_events(id) on delete set null;

create table public.news_event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.news_events(id) on delete cascade,
  source_id uuid not null references public.news_sources(id) on delete restrict,
  source_item_id text not null,
  source_url text not null check (source_url ~ '^https://'),
  source_title text not null,
  source_summary text not null default '',
  source_published_at timestamptz,
  fetched_at timestamptz not null default now(),
  raw_payload jsonb,
  unique (source_id, source_item_id)
);

create table public.news_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.news_sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','partial','failed','skipped')),
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  execution_id text
);

create index news_events_active_published_idx on public.news_events (active, published_at desc);
create index news_events_category_idx on public.news_events (category, severity, published_at desc);
create index news_events_region_idx on public.news_events (country, region, published_at desc);
create index news_events_fingerprint_idx on public.news_events (title_fingerprint);
create index news_event_sources_event_idx on public.news_event_sources (event_id);
create index news_sources_due_idx on public.news_sources (enabled, last_successful_fetch);

create or replace function plans_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger news_sources_set_updated_at before update on public.news_sources
for each row execute function plans_private.set_updated_at();
create trigger news_events_set_updated_at before update on public.news_events
for each row execute function plans_private.set_updated_at();

alter table public.news_sources enable row level security;
alter table public.news_events enable row level security;
alter table public.news_event_sources enable row level security;
alter table public.news_sync_runs enable row level security;

revoke all on public.news_sources, public.news_events, public.news_event_sources, public.news_sync_runs from anon, authenticated;
grant all on public.news_sources, public.news_events, public.news_event_sources, public.news_sync_runs to service_role;

insert into public.news_sources
  (slug, name, base_url, source_type, adapter_key, trust_level, enabled, polling_interval_seconds, allowed_hosts, config)
values
  (
    'dwd-warnungen',
    'Deutscher Wetterdienst',
    'https://www.dwd.de',
    'rest_api',
    'dwd',
    'official',
    true,
    60,
    array['www.dwd.de'],
    jsonb_build_object(
      'endpoint', 'https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json',
      'canonical_url', 'https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html'
    )
  ),
  (
    'gdacs',
    'Global Disaster Alert and Coordination System',
    'https://www.gdacs.org',
    'rss',
    'gdacs',
    'official',
    true,
    300,
    array['www.gdacs.org','gdacs.org'],
    jsonb_build_object(
      'endpoint', 'https://www.gdacs.org/xml/rss.xml',
      'canonical_url', 'https://www.gdacs.org/'
    )
  )
on conflict (slug) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  adapter_key = excluded.adapter_key,
  trust_level = excluded.trust_level,
  polling_interval_seconds = excluded.polling_interval_seconds,
  allowed_hosts = excluded.allowed_hosts,
  config = excluded.config;

comment on table public.news_events is 'Normalized, deduplicated safety and crisis events for the RedScore Live-Lage.';
comment on column public.news_events.verification_status is 'official, verified, multiple_sources, osint_unconfirmed, or unknown; must always be visible in clients.';
comment on column public.news_event_sources.raw_payload is 'Untrusted source payload; never exposed by the public API and only accessible to service_role.';
