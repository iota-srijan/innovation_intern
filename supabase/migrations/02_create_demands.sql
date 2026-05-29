-- Demands table
create table if not exists demands (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text default 'Other',
  status text default 'pending',
  faculty_note text,
  created_by uuid references auth.users(id),
  created_by_name text,
  created_by_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Votes table
create table if not exists demand_votes (
  id uuid default gen_random_uuid() primary key,
  demand_id uuid references demands(id) on delete cascade,
  student_id uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(demand_id, student_id)
);

-- RLS
alter table demands enable row level security;
alter table demand_votes enable row level security;

create policy "Authenticated users can read demands"
  on demands for select using (auth.role() = 'authenticated');

create policy "Students can insert demands"
  on demands for insert with check (auth.uid() = created_by);

create policy "Faculty/admin can update demands"
  on demands for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read votes"
  on demand_votes for select using (auth.role() = 'authenticated');

create policy "Students can insert own votes"
  on demand_votes for insert with check (auth.uid() = student_id);

-- SECURITY DEFINER function called once from the frontend on first load.
-- Creates tables if they don't exist yet (handles fresh deployments).
create or replace function setup_demands()
returns void
language plpgsql
security definer
as $$
begin
  create table if not exists demands (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    category text default 'Other',
    status text default 'pending',
    faculty_note text,
    created_by uuid references auth.users(id),
    created_by_name text,
    created_by_email text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table if not exists demand_votes (
    id uuid default gen_random_uuid() primary key,
    demand_id uuid references demands(id) on delete cascade,
    student_id uuid references auth.users(id),
    created_at timestamptz default now(),
    unique(demand_id, student_id)
  );
end;
$$;
