-- ============================================================
-- RLS POLICIES — run each block in Supabase SQL Editor
-- ============================================================
-- Execute table-by-table. Each block drops existing policies
-- first so it is safe to re-run.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- is_staff() — security definer helper
-- Every "is this caller admin/super_admin/mentor" check below used to be
-- an inline `exists (select 1 from user_roles where user_id = auth.uid()
-- and role in (...))`. That inline form queries user_roles from WITHIN a
-- policy defined ON user_roles (directly for user_roles' own policies,
-- and indirectly for every other table's staff-check), which Postgres
-- does not reliably short-circuit — in practice it throws "infinite
-- recursion detected in policy for relation user_roles" (surfaced by
-- PostgREST as a 500 on every affected table). A security definer
-- function bypasses RLS for its own internal query, breaking the cycle.
-- This is the standard fix for this exact, well-known pattern.
-- ────────────────────────────────────────────────────────────
create or replace function is_staff(required_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid() and role = any(required_roles)
  );
$$;


-- ────────────────────────────────────────────────────────────
-- inventory_items
-- ────────────────────────────────────────────────────────────
alter table inventory_items enable row level security;

drop policy if exists "Authenticated users can read items" on inventory_items;
drop policy if exists "Admin can insert items" on inventory_items;
drop policy if exists "Admin can update items" on inventory_items;
drop policy if exists "Admin can delete items" on inventory_items;

create policy "Authenticated users can read items"
  on inventory_items for select
  using (auth.role() = 'authenticated');

create policy "Admin can insert items"
  on inventory_items for insert
  with check (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Admin can update items"
  on inventory_items for update
  using (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Admin can delete items"
  on inventory_items for delete
  using (is_staff(array['admin', 'super_admin', 'mentor']));


-- ────────────────────────────────────────────────────────────
-- issue_requests
-- ────────────────────────────────────────────────────────────
alter table issue_requests enable row level security;

drop policy if exists "Users can insert own requests" on issue_requests;
drop policy if exists "Users can read own requests" on issue_requests;
drop policy if exists "Admin can read all requests" on issue_requests;
drop policy if exists "Admin can update requests" on issue_requests;

create policy "Users can insert own requests"
  on issue_requests for insert
  with check (auth.uid() = student_id);

create policy "Users can read own requests"
  on issue_requests for select
  using (
    auth.uid() = student_id
    or exists (
      select 1 from jsonb_array_elements(team_members) m
      where lower(m->>'email') = lower(auth.jwt()->>'email')
    )
    or is_staff(array['admin', 'super_admin', 'mentor'])
  );

create policy "Admin can update requests"
  on issue_requests for update
  using (is_staff(array['admin', 'super_admin', 'mentor']));


-- ────────────────────────────────────────────────────────────
-- demands
-- ────────────────────────────────────────────────────────────
alter table demands enable row level security;

drop policy if exists "Authenticated users can read demands" on demands;
drop policy if exists "Authenticated users can insert demands" on demands;
drop policy if exists "Admin can update demands" on demands;
drop policy if exists "Admin can delete demands" on demands;

create policy "Authenticated users can read demands"
  on demands for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert demands"
  on demands for insert
  with check (auth.uid() = created_by);

create policy "Admin can update demands"
  on demands for update
  using (is_staff(array['admin', 'super_admin']));

create policy "Admin can delete demands"
  on demands for delete
  using (is_staff(array['admin', 'super_admin']));


-- ────────────────────────────────────────────────────────────
-- demand_votes
-- ────────────────────────────────────────────────────────────
alter table demand_votes enable row level security;

drop policy if exists "Authenticated users can read votes" on demand_votes;
drop policy if exists "Authenticated users can insert own vote" on demand_votes;
drop policy if exists "Users can delete own vote" on demand_votes;

create policy "Authenticated users can read votes"
  on demand_votes for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert own vote"
  on demand_votes for insert
  with check (auth.uid() = student_id);

create policy "Users can delete own vote"
  on demand_votes for delete
  using (auth.uid() = student_id);


-- ────────────────────────────────────────────────────────────
-- user_roles
-- ────────────────────────────────────────────────────────────
alter table user_roles enable row level security;

drop policy if exists "Users can read own role" on user_roles;
drop policy if exists "Admin can read all roles" on user_roles;
drop policy if exists "Admin can insert roles" on user_roles;
drop policy if exists "Admin can update roles" on user_roles;

create policy "Users can read own role"
  on user_roles for select
  using (auth.uid() = user_id);

create policy "Admin can read all roles"
  on user_roles for select
  using (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Admin can insert roles"
  on user_roles for insert
  with check (is_staff(array['admin', 'super_admin']));

create policy "Admin can update roles"
  on user_roles for update
  using (is_staff(array['admin', 'super_admin', 'mentor']));


-- ────────────────────────────────────────────────────────────
-- audit_log
-- ────────────────────────────────────────────────────────────
alter table audit_log enable row level security;

drop policy if exists "Admin can read audit log" on audit_log;
drop policy if exists "Authenticated users can insert audit log" on audit_log;

create policy "Admin can read audit log"
  on audit_log for select
  using (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Authenticated users can insert audit log"
  on audit_log for insert
  with check (auth.role() = 'authenticated');

-- No UPDATE or DELETE policies — audit records are immutable


-- ────────────────────────────────────────────────────────────
-- categories
-- ────────────────────────────────────────────────────────────
alter table categories enable row level security;

drop policy if exists "Authenticated users can read categories" on categories;
drop policy if exists "Admin can insert categories" on categories;
drop policy if exists "Admin can update categories" on categories;
drop policy if exists "Admin can delete categories" on categories;

create policy "Authenticated users can read categories"
  on categories for select
  using (auth.role() = 'authenticated');

create policy "Admin can insert categories"
  on categories for insert
  with check (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Admin can update categories"
  on categories for update
  using (is_staff(array['admin', 'super_admin', 'mentor']));

create policy "Admin can delete categories"
  on categories for delete
  using (is_staff(array['admin', 'super_admin', 'mentor']));


-- ────────────────────────────────────────────────────────────
-- faculty_emails
-- ────────────────────────────────────────────────────────────
alter table faculty_emails enable row level security;

drop policy if exists "Admin only: faculty_emails" on faculty_emails;

create policy "Admin only: faculty_emails"
  on faculty_emails for all
  using (is_staff(array['admin', 'super_admin']));


-- ────────────────────────────────────────────────────────────
-- service_requests
-- ────────────────────────────────────────────────────────────
alter table service_requests enable row level security;

drop policy if exists "Users can insert own requests" on service_requests;
drop policy if exists "Users can read own requests" on service_requests;
drop policy if exists "Admin can update requests" on service_requests;

create policy "Users can insert own requests"
  on service_requests for insert
  with check (auth.uid() = student_id or student_id is null);

create policy "Users can read own requests"
  on service_requests for select
  using (
    auth.uid() = student_id
    or exists (
      select 1 from jsonb_array_elements(team_members) m
      where lower(m->>'email') = lower(auth.jwt()->>'email')
    )
    or is_staff(array['admin', 'super_admin', 'mentor'])
  );

create policy "Admin can update requests"
  on service_requests for update
  using (is_staff(array['admin', 'super_admin', 'mentor']));


-- ────────────────────────────────────────────────────────────
-- notifications
-- Never had RLS — any authenticated user could read every notification
-- regardless of target_user_id. A user now only sees broadcast
-- notifications (target_user_id is null) or ones targeted at them;
-- admin/super_admin see everything (needed for AdminNotificationsPage).
-- ────────────────────────────────────────────────────────────
alter table notifications enable row level security;

drop policy if exists "Users can read own or broadcast notifications" on notifications;
drop policy if exists "Authenticated users can insert notifications" on notifications;
drop policy if exists "Admin can update notifications" on notifications;

create policy "Users can read own or broadcast notifications"
  on notifications for select
  using (
    target_user_id is null
    or target_user_id = auth.uid()
    or is_staff(array['admin', 'super_admin'])
  );

create policy "Authenticated users can insert notifications"
  on notifications for insert
  with check (auth.role() = 'authenticated');

create policy "Admin can update notifications"
  on notifications for update
  using (is_staff(array['admin', 'super_admin']));


-- ────────────────────────────────────────────────────────────
-- notification_reads
-- ────────────────────────────────────────────────────────────
alter table notification_reads enable row level security;

drop policy if exists "Users can read own notification reads" on notification_reads;
drop policy if exists "Users can insert own notification reads" on notification_reads;

create policy "Users can read own notification reads"
  on notification_reads for select
  using (user_id = auth.uid());

create policy "Users can insert own notification reads"
  on notification_reads for insert
  with check (user_id = auth.uid());
