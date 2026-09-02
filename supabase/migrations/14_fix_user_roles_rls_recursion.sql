-- Every "is this caller staff" RLS check across the schema was an inline
-- `exists (select 1 from user_roles where user_id = auth.uid() and role
-- in (...))`. Referencing user_roles from within a policy defined on
-- user_roles (directly for its own policies, indirectly for every other
-- table's staff-check) is not reliably short-circuited by Postgres and
-- throws "infinite recursion detected in policy for relation user_roles"
-- in practice — surfaced by PostgREST as a 500 on every affected table.
--
-- Fix: a security definer function bypasses RLS for its own internal
-- query, breaking the cycle. This is the standard fix for this pattern.
-- See supabase/rls_policies.sql for the actual policy definitions using
-- this function — this migration only adds the function itself so a
-- fresh database has it before rls_policies.sql is ever run.

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
