-- Rounds out the analytics RPC surface from migration 10 so
-- AdminAnalyticsPage never has to download raw analytics_sessions rows:
-- get_analytics_summary (10) covers the daily chart, but neither a
-- range-wide distinct user count nor a per-user breakdown can be derived
-- from per-day rollups alone (summing per-day unique_users double-counts
-- anyone active on more than one day). These two functions cover that gap.
--
-- Both are security invoker (default) so the "Staff read sessions" RLS
-- policy on analytics_sessions still gates who gets non-empty results.

create or replace function get_analytics_overview(from_date date, to_date date)
returns table(total_sessions bigint, unique_users bigint, sessions_today bigint)
language sql
security invoker
stable
as $$
  select
    count(*) as total_sessions,
    count(distinct user_id) as unique_users,
    count(*) filter (where started_at::date = current_date) as sessions_today
  from analytics_sessions
  where started_at::date between from_date and to_date;
$$;

create or replace function get_analytics_top_users(from_date date, to_date date, limit_n int default 15)
returns table(user_id uuid, user_email text, user_role text, session_count bigint)
language sql
security invoker
stable
as $$
  select
    user_id,
    -- most-recent email/role for this user in range, in case either changed mid-range
    (array_agg(user_email order by started_at desc))[1] as user_email,
    (array_agg(user_role order by started_at desc))[1] as user_role,
    count(*) as session_count
  from analytics_sessions
  where started_at::date between from_date and to_date
  group by user_id
  order by session_count desc
  limit limit_n;
$$;
