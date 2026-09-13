alter schema plans_private rename to redscore_private;

comment on table public.news_events is
  'Normalized, deduplicated safety and crisis events for the RedScore Live-Lage.';

select vault.update_secret(id, new_name := 'redscore_project_url')
from vault.decrypted_secrets where name = 'plans_project_url';
select vault.update_secret(id, new_name := 'redscore_cron_anon_key')
from vault.decrypted_secrets where name = 'plans_cron_anon_key';

select cron.unschedule('plans-live-lage-import-every-minute');

select cron.schedule(
  'redscore-live-lage-import-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'redscore_project_url')
        || '/functions/v1/live-lage-import',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'redscore_cron_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'redscore_cron_anon_key')
      ),
      body := jsonb_build_object('scheduled_at', now(), 'service', 'RedScore Live-Lage')
    ) as request_id;
  $$
);
