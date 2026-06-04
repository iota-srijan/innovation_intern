-- admin_credentials: stores admin login credentials outside of Supabase Auth.
-- RLS is intentionally disabled — this table is never surfaced as a PostgREST endpoint
-- to unauthenticated users and is only accessed server-side via service_role.
create table if not exists admin_credentials (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  password   text not null,
  created_at timestamptz default now()
);

alter table admin_credentials disable row level security;

-- Seed default admin accounts (only inserts when table is empty)
insert into admin_credentials (email, password)
select v.email, v.password
from (
  values
    ('admin1@stockpilot.inc', 'Pilot@001'),
    ('admin2@stockpilot.inc', 'Pilot@002'),
    ('admin3@stockpilot.inc', 'Pilot@003'),
    ('admin4@stockpilot.inc', 'Pilot@004'),
    ('admin5@stockpilot.inc', 'Pilot@005')
) as v(email, password)
where not exists (select 1 from admin_credentials limit 1);
