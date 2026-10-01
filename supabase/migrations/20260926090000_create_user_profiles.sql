create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  adults jsonb not null default '[]'::jsonb,
  children_count smallint not null default 0 check (children_count between 0 and 12),
  pets jsonb not null default '[]'::jsonb,
  postal_code text not null default '',
  city text not null default '',
  state text not null default '',
  district text not null default '',
  onboarding_completed boolean not null default false,
  selected_scene text not null default 'neutral-household',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_adults_array check (jsonb_typeof(adults) = 'array'),
  constraint user_profiles_pets_array check (jsonb_typeof(pets) = 'array')
);

create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assessment jsonb not null default '{}'::jsonb,
  task_status jsonb not null default '{}'::jsonb,
  supplies jsonb not null default '{}'::jsonb,
  supply_details jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.user_app_state enable row level security;

create policy "users read own profile" on public.user_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own profile" on public.user_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own profile" on public.user_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own profile" on public.user_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "users read own app state" on public.user_app_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own app state" on public.user_app_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own app state" on public.user_app_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own app state" on public.user_app_state for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on table public.user_profiles from anon;
revoke all on table public.user_app_state from anon;
grant select, insert, update, delete on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_app_state to authenticated;
