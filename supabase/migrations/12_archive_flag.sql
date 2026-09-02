-- Semester archive/rollover: a soft-archive flag rather than moving rows to
-- a separate table, so history stays queryable (exports, audit trail) while
-- disappearing from the admin's day-to-day "current requests" views.

alter table issue_requests   add column if not exists archived_at timestamptz;
alter table service_requests add column if not exists archived_at timestamptz;

create index if not exists idx_issue_requests_archived_at   on issue_requests(archived_at);
create index if not exists idx_service_requests_archived_at on service_requests(archived_at);
