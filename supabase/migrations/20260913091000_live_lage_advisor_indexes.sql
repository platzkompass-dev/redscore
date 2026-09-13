create index if not exists news_events_duplicate_group_idx on public.news_events (duplicate_group_id);
create index if not exists news_sync_runs_source_idx on public.news_sync_runs (source_id, started_at desc);
