-- ============================================================
-- RLS POLICIES — run each block in Supabase SQL Editor
-- ============================================================
-- Execute table-by-table. Each block drops existing policies
-- first so it is safe to re-run.
-- ============================================================


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
  with check (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can update items"
  on inventory_items for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can delete items"
  on inventory_items for delete
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


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
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can update requests"
  on issue_requests for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


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
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can delete demands"
  on demands for delete
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


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
  using (
    exists (
      select 1 from user_roles ur2
      where ur2.user_id = auth.uid() and ur2.role = 'admin'
    )
  );

create policy "Admin can insert roles"
  on user_roles for insert
  with check (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can update roles"
  on user_roles for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- audit_log
-- ────────────────────────────────────────────────────────────
alter table audit_log enable row level security;

drop policy if exists "Admin can read audit log" on audit_log;
drop policy if exists "Authenticated users can insert audit log" on audit_log;

create policy "Admin can read audit log"
  on audit_log for select
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

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
  with check (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can update categories"
  on categories for update
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin can delete categories"
  on categories for delete
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- faculty_emails
-- ────────────────────────────────────────────────────────────
alter table faculty_emails enable row level security;

drop policy if exists "Admin only: faculty_emails" on faculty_emails;

create policy "Admin only: faculty_emails"
  on faculty_emails for all
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- admin_credentials
-- RLS remains DISABLED on this table intentionally.
-- Access is controlled by the application layer:
--   - signInAsAdmin queries with exact email + password match
--   - The anon key cannot enumerate rows because the WHERE
--     clause requires both email and password to match
-- Do NOT enable RLS here — doing so would require a
-- service-role policy that exposes the secret key in the
-- frontend build.
-- ────────────────────────────────────────────────────────────
-- (no policy changes — leave RLS disabled)
