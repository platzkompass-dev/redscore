-- Owner-only SQL (Supabase MCP / SQL Editor), not a public API.
-- Recorded days only: a missing day does not establish zero traffic.
-- These are tab sessions, not unique people. Measurement starts 2026-11-04.
select day,pageviews,visits as tab_visits
from redscore_private.web_daily_counts
where route='*' and day>=(now() at time zone 'Europe/Berlin')::date-29
order by day;

-- Per-page visits overlap; do not sum them as unique visitors.
select route,sum(pageviews) as pageviews,sum(visits) as daily_tab_visits
from redscore_private.web_daily_counts
where route<>'*' and day>=(now() at time zone 'Europe/Berlin')::date-29
group by route order by pageviews desc;
