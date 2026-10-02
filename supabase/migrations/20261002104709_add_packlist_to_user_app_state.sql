alter table public.user_app_state
  add column if not exists packlist jsonb not null default '{}'::jsonb;
