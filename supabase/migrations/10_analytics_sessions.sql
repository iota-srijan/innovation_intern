-- Cookieless session analytics: one row per authenticated app load per
-- browser tab (see src/hooks/useSessionTracking.ts — guarded by
-- sessionStorage, not a cookie, so it counts real sessions without any
-- tracking cookie or third-party script).

create table if not exists analytics_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  user_role   text,
  started_at  timestamptz not null default now()
);

create index if not exists idx_analytics_sessions_started on analytics_sessions(started_at);
create index if not exists idx_analytics_sessions_user on analytics_sessions(user_id);

alter table analytics_sessions enable row level security;

drop policy if exists "Users insert own session" on analytics_sessions;
drop policy if exists "Staff read sessions" on analytics_sessions;

create policy "Users insert own session"
  on analytics_sessions for insert
  with check (auth.uid() = user_id);

create policy "Staff read sessions"
  on analytics_sessions for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- No update/delete policies: sessions are append-only, immutable once logged.

-- Per-day rollup so the analytics page never has to download raw rows.
-- security invoker (default) so the "Staff read sessions" policy above
-- still gates who can call this.
create or replace function get_analytics_summary(from_date date, to_date date)
returns table(day date, sessions bigint, unique_users bigint)
language sql
security invoker
stable
as $$
  select
    started_at::date as day,
    count(*) as sessions,
    count(distinct user_id) as unique_users
  from analytics_sessions
  where started_at::date between from_date and to_date
  group by started_at::date
  order by started_at::date;
$$;
