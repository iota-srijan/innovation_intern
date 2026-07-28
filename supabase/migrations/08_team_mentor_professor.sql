-- Team requests, professor CC, and mentor assignment on service requests.
--
-- team_members shape: [{"name": "...", "email": "..."}, ...] — emails are
-- lowercased client-side before insert so RLS containment checks and
-- application queries can compare case-insensitively without a DB-side
-- lower() on every array element.
--
-- professor_email is captured from the requester at submit time so the
-- Gmail-compose approval flow can autofill CC without a separate lookup.

alter table issue_requests   add column if not exists team_members jsonb not null default '[]'::jsonb;
alter table service_requests add column if not exists team_members jsonb not null default '[]'::jsonb;

alter table issue_requests   add column if not exists professor_email text;
alter table service_requests add column if not exists professor_email text;

-- Mentor assignment previously existed only on issue_requests (see
-- 07_super_admin_mentor_support.sql). service_requests gets the same
-- column so the Super Admin flow can assign/reassign mentors on both.
alter table service_requests add column if not exists assigned_mentor_email text;
create index if not exists idx_service_requests_assigned_mentor on service_requests(assigned_mentor_email);

create index if not exists idx_issue_requests_team_members
  on issue_requests using gin (team_members jsonb_path_ops);
create index if not exists idx_service_requests_team_members
  on service_requests using gin (team_members jsonb_path_ops);
