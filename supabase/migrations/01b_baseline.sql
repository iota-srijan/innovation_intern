-- ============================================================
-- BASELINE: reconstructs tables that were created by hand directly
-- in the Supabase dashboard and were never captured in a migration
-- file (see AUDIT_REPORT.md). Every statement here is idempotent
-- (create table if not exists / add column if not exists / check
-- constraints inline in create table) so it is safe to run against
-- the real Supabase project where these tables already exist — it
-- will no-op there — while also letting a fresh/local database
-- bootstrapped via `supabase db reset` end up with the full schema
-- the app actually reads and writes against.
--
-- Column lists below were derived by reading every .insert(), .update()
-- and .select() call against these tables across src/, not guessed.
--
-- Numbered 01b so it runs right after 01_init.sql (categories must exist
-- first for inventory_items' FK) and before 06/07, which ALTER audit_log,
-- issue_requests, and notifications — tables only this file creates. That
-- ordering lets `supabase db reset` succeed end-to-end on a blank database
-- while remaining a no-op against the real hosted project, where these
-- tables already exist.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- inventory_items
-- (categories already created in 01_init.sql)
-- ────────────────────────────────────────────────────────────
create table if not exists inventory_items (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  sku                text unique,
  category_id        uuid references categories(id) on delete set null,
  quantity           integer not null default 0 check (quantity >= 0),
  reorder_threshold  integer default 10 check (reorder_threshold >= 0),
  supplier           text,
  unit_price         numeric,
  status             text not null default 'in_stock'
                        check (status in ('in_stock', 'low_stock', 'out_of_stock')),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- user_roles
-- (05_add_display_name.sql already ALTERs display_name in; included
-- directly here too so a fresh create is self-sufficient)
-- ────────────────────────────────────────────────────────────
create table if not exists user_roles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users(id) on delete cascade,
  email             text not null unique,
  role              text not null default 'student'
                       check (role in ('student', 'faculty', 'mentor', 'admin', 'super_admin', 'banned')),
  display_name      text,
  last_sign_in_at   timestamptz,
  created_at        timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- issue_requests
-- assigned_mentor_email is also added via ALTER in
-- 07_super_admin_mentor_support.sql — included directly here too
-- (idempotent, harmless overlap) so a fresh create is self-sufficient.
-- item_type is written opportunistically by StudentDashboard.tsx when
-- submitting a consumable request (with a graceful retry-without-it
-- fallback on 42703), so it must be nullable with no default.
-- ────────────────────────────────────────────────────────────
create table if not exists issue_requests (
  id                     uuid primary key default gen_random_uuid(),
  item_id                uuid references inventory_items(id) on delete set null,
  item_name              text,
  item_type              text,
  quantity_requested     integer not null default 1 check (quantity_requested >= 1),
  purpose                text,
  status                 text not null default 'pending'
                            check (status in ('pending', 'approved', 'rejected')),
  student_id             uuid references auth.users(id) on delete set null,
  student_email          text,
  student_name           text,
  return_deadline        date,
  review_note            text,
  reviewed_by            uuid references auth.users(id) on delete set null,
  physical_status        text
                            check (physical_status in ('pending_handover', 'issued', 'returned', 'consumed')),
  issued_at              timestamptz,
  returned_at            timestamptz,
  assigned_mentor_email  text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- Defensive: on a pre-existing issue_requests table (the real project),
-- the create table above is a no-op, so this column may not exist yet if
-- 07_super_admin_mentor_support.sql hasn't run. Add it directly so the
-- index below never fails regardless of run order.
alter table issue_requests add column if not exists assigned_mentor_email text;
create index if not exists idx_issue_requests_assigned_mentor on issue_requests(assigned_mentor_email);


-- ────────────────────────────────────────────────────────────
-- service_machines
-- ────────────────────────────────────────────────────────────
create table if not exists service_machines (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- service_requests
-- student_id is nullable: useServiceRequests.ts submits
-- `student_id: input.student_id` where the input type is
-- `string | null`, and the safe-path builder for STL uploads
-- explicitly falls back to the student's email when student_id is
-- absent — confirming anonymous / no-session submits are supported.
-- ────────────────────────────────────────────────────────────
create table if not exists service_requests (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid references auth.users(id) on delete set null,
  student_email       text,
  student_name        text,
  machine_id          uuid references service_machines(id) on delete set null,
  machine_name        text,
  material_type       text,
  dim_l               numeric,
  dim_w               numeric,
  dim_h               numeric,
  infill_percent      numeric,
  copies              integer default 1,
  purpose             text,
  stl_file_url        text,
  stl_file_name       text,
  status              text not null default 'pending'
                         check (status in ('pending', 'approved', 'rejected')),
  assigned_slot       timestamptz,
  slot_duration_mins  integer,
  review_note         text,
  reviewed_by         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- notifications
-- target_user_id is also added via ALTER in
-- 07_super_admin_mentor_support.sql — included directly here too
-- (idempotent, harmless overlap) so a fresh create is self-sufficient.
-- ────────────────────────────────────────────────────────────
create table if not exists notifications (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  body               text not null,
  created_by_email   text,
  is_active          boolean not null default true,
  target_user_id     uuid references auth.users(id) on delete cascade,
  created_at         timestamptz default now()
);

-- Defensive: same reasoning as assigned_mentor_email above — this column
-- may not exist on a pre-existing notifications table yet.
alter table notifications add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_notifications_target_user on notifications(target_user_id);


-- ────────────────────────────────────────────────────────────
-- notification_reads
-- Not in the originally-scoped table list, but src/pages/NotificationsPage.tsx
-- and src/components/layout/TopBar.tsx both read/write it (per-user
-- read receipts driving the unread bell badge), so it is just as
-- unmigrated as the others and the app cannot function without it.
-- ────────────────────────────────────────────────────────────
create table if not exists notification_reads (
  id               uuid primary key default gen_random_uuid(),
  notification_id  uuid references notifications(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete cascade,
  created_at       timestamptz default now(),
  unique (notification_id, user_id)
);


-- ────────────────────────────────────────────────────────────
-- audit_log
-- item_id / item_name / quantity_change / previous_quantity /
-- new_quantity are also added via ALTER in
-- 06_add_audit_log_item_columns.sql — included directly here too
-- (idempotent, harmless overlap) so a fresh create is self-sufficient.
-- ────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id                  uuid primary key default gen_random_uuid(),
  actor_email         text,
  action              text not null,
  action_type         text not null default 'admin_action'
                          check (action_type in ('CREATE', 'UPDATE', 'DELETE', 'admin_action')),
  item_id             uuid,
  item_name           text,
  quantity_change     integer,
  previous_quantity   integer,
  new_quantity        integer,
  created_at          timestamptz default now()
);

-- Defensive: same reasoning as above — these columns may not exist yet on
-- a pre-existing audit_log table if 06_add_audit_log_item_columns.sql
-- hasn't run.
alter table audit_log add column if not exists item_id uuid;
alter table audit_log add column if not exists item_name text;
alter table audit_log add column if not exists quantity_change integer;
alter table audit_log add column if not exists previous_quantity integer;
alter table audit_log add column if not exists new_quantity integer;
create index if not exists idx_audit_log_item_id on audit_log(item_id);


-- ────────────────────────────────────────────────────────────
-- faculty_emails
-- ────────────────────────────────────────────────────────────
create table if not exists faculty_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- consumable_categories
-- ────────────────────────────────────────────────────────────
create table if not exists consumable_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  unit        text,
  created_at  timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- consumables
-- ────────────────────────────────────────────────────────────
create table if not exists consumables (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  category_id        uuid references consumable_categories(id) on delete set null,
  quantity           integer not null default 0 check (quantity >= 0),
  unit               text,
  reorder_threshold  integer,
  supplier           text,
  unit_price         numeric,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
