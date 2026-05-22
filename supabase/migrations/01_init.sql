-- Create extension for UUIDs if not exists
create extension if not exists "uuid-ossp";

-- Create categories table
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inventory items table
create table items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text not null unique,
  category_id uuid references categories(id) on delete set null,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_threshold integer not null default 10 check (reorder_threshold >= 0),
  supplier text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table categories enable row level security;
alter table items enable row level security;

-- Create policies for public access (since no auth is implemented yet)
create policy "Allow public read access on categories"
  on categories for select
  using (true);

create policy "Allow public read access on items"
  on items for select
  using (true);

create policy "Allow public insert on items"
  on items for insert
  with check (true);

create policy "Allow public update on items"
  on items for update
  using (true);

create policy "Allow public delete on items"
  on items for delete
  using (true);
