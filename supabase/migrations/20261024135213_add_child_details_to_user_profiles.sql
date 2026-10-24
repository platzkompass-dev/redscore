alter table public.user_profiles
  add column children_details jsonb not null default '[]'::jsonb
  constraint user_profiles_children_details_array check (
    case when jsonb_typeof(children_details) = 'array'
      then jsonb_array_length(children_details) <= 12
      else false
    end
  );

comment on column public.user_profiles.children_details is
  'Per-child household image selection metadata. Legacy missing values stay unspecified; no names or dates of birth.';
