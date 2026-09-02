-- Migration 16 enabled RLS on notifications/notification_reads and added
-- properly scoped policies, but a pre-existing "allow_all_authenticated"
-- policy (cmd = ALL, set up directly in the Supabase dashboard at some
-- point, never tracked in this repo) was still present on both tables.
-- Postgres combines permissive policies with OR, so that blanket policy
-- alone re-opened the exact leak 16 was meant to close — any authenticated
-- user could still read/write everything regardless of the new, narrower
-- policies. Dropping it here.

drop policy if exists "allow_all_authenticated" on notifications;
drop policy if exists "allow_all_authenticated" on notification_reads;
