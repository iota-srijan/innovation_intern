-- Daily schedule for the return-reminder edge function (supabase/functions/return-reminder).
-- The function itself already loops over "in 3 days / tomorrow / today / overdue"
-- each time it runs, so one invocation per day covers every reminder category.
--
-- Requires the pg_cron and pg_net extensions (enable both under
-- Database > Extensions in the Supabase dashboard if not already on).
--
-- SETUP (one-time, run manually in the SQL editor — do NOT put the real key
-- in this file or commit it anywhere): store the service_role key in Vault so
-- the cron job can authenticate to the function without the key ever
-- appearing in a migration file or git history:
--   select vault.create_secret('<your service_role key>', 'service_role_key');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('return-reminder-daily')
where exists (select 1 from cron.job where jobname = 'return-reminder-daily');

select cron.schedule(
  'return-reminder-daily',
  '0 3 * * *', -- 03:00 UTC (~08:30 IST) daily
  $$
  select net.http_post(
    url := 'https://ltgqhpnfnscmweckkwye.supabase.co/functions/v1/return-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To remove the schedule later: select cron.unschedule('return-reminder-daily');
