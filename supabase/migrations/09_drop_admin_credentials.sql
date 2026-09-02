-- admin_credentials was a plaintext-password legacy auth system
-- (signInAsAdmin) that has been removed from the app code (AuthContext.tsx
-- no longer has signInAsAdmin). Its edge function (supabase/functions/admin-auth/)
-- is being deleted separately. Drop the now-dead table.
drop table if exists admin_credentials;
