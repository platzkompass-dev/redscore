-- Owner-only SQL (Supabase MCP / SQL Editor), not a public API.
-- Last 30 calendar days, including zero days. These are tab sessions, not people.
with days as (
  select generate_series((now() at time zone 'Europe/Berlin')::date-29,
    (now() at time zone 'Europe/Berlin')::date,interval '1 day')::date as day
)
select days.day,coalesce(c.pageviews,0) as pageviews,coalesce(c.visits,0) as tab_visits
from days left join redscore_private.web_daily_counts c on c.day=days.day and c.route='*'
order by days.day;

-- Per-page visits overlap; do not sum them as unique visitors.
select route,sum(pageviews) as pageviews,sum(visits) as daily_tab_visits
from redscore_private.web_daily_counts
where route<>'*' and day>=(now() at time zone 'Europe/Berlin')::date-29
group by route order by pageviews desc;
