alter table public.user_app_state
  add column if not exists custom_supplies jsonb not null default '[]'::jsonb;

alter table public.user_app_state
  drop constraint if exists user_app_state_custom_supplies_is_array;

alter table public.user_app_state
  add constraint user_app_state_custom_supplies_is_array
  check (jsonb_typeof(custom_supplies) = 'array');
