create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

select cron.schedule(
  'plans-live-lage-import-every-minute',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'plans_project_url')
        || '/functions/v1/live-lage-import',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'plans_cron_anon_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'plans_cron_anon_key')
      ),
      body := jsonb_build_object('scheduled_at', now())
    ) as request_id;
  $$
);
