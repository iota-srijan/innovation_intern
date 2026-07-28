-- Support columns for the Super Admin and Mentor portals.
-- Mentor assignment on equipment requests, and per-user notification targeting
-- (e.g. mentor "Send Reminder") instead of only broadcast notifications.

alter table issue_requests add column if not exists assigned_mentor_email text;
create index if not exists idx_issue_requests_assigned_mentor on issue_requests(assigned_mentor_email);

alter table notifications add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_notifications_target_user on notifications(target_user_id);
