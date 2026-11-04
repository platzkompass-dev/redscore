-- Execute using the owner SQL connection. All test writes are rolled back.
begin;
set local role service_role;
do $$
declare
  test_day date := (now() at time zone 'Europe/Berlin')::date;
  session_a uuid := gen_random_uuid();
  session_b uuid := gen_random_uuid();
  baseline_views bigint;
  baseline_visits bigint;
  measured record;
begin
  -- Serialize only while testing so concurrent real arrivals cannot affect assertions.
  lock table redscore_private.web_daily_counts in share row exclusive mode;
  select coalesce(sum(pageviews),0),coalesce(sum(visits),0) into baseline_views,baseline_visits
    from redscore_private.web_daily_counts where day=test_day and route='*';
  perform public.record_redscore_visit('/',session_a);
  perform public.record_redscore_visit('/',session_a); -- immediate duplicate ignored
  perform public.record_redscore_visit('/angebote',session_a); -- same visit, second page
  perform public.record_redscore_visit('/',session_b); -- second visit
  select pageviews,visits into measured from redscore_private.web_daily_counts where day=test_day and route='*';
  if measured.pageviews<>baseline_views+3 or measured.visits<>baseline_visits+2 then
    raise exception 'Counting or deduplication incorrect';
  end if;
end;
$$;
reset role;
select 'PASS: service-role writes, duplicate protection, per-site visits; rolled back' as verification;
rollback;
