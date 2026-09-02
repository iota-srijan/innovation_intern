-- notifications/notification_reads never had RLS enabled, so any
-- authenticated user could read every notification regardless of who it
-- was actually targeted at — NotificationsPage.tsx and TopBar.tsx select
-- all active notifications and only ever used target_user_id as a hint,
-- never as a real access boundary.
--
-- This locks it down properly: a user only sees broadcast notifications
-- (target_user_id is null) or ones targeted at them, with admin/super_admin
-- able to see everything (needed for AdminNotificationsPage's management
-- view). No frontend query changes needed — the existing "select all
-- active notifications" queries get narrowed down transparently by RLS.

alter table notifications enable row level security;

drop policy if exists "Users can read own or broadcast notifications" on notifications;
drop policy if exists "Authenticated users can insert notifications" on notifications;
drop policy if exists "Admin can update notifications" on notifications;

create policy "Users can read own or broadcast notifications"
  on notifications for select
  using (
    target_user_id is null
    or target_user_id = auth.uid()
    or is_staff(array['admin', 'super_admin'])
  );

create policy "Authenticated users can insert notifications"
  on notifications for insert
  with check (auth.role() = 'authenticated');

create policy "Admin can update notifications"
  on notifications for update
  using (is_staff(array['admin', 'super_admin']));


alter table notification_reads enable row level security;

drop policy if exists "Users can read own notification reads" on notification_reads;
drop policy if exists "Users can insert own notification reads" on notification_reads;

create policy "Users can read own notification reads"
  on notification_reads for select
  using (user_id = auth.uid());

create policy "Users can insert own notification reads"
  on notification_reads for insert
  with check (user_id = auth.uid());
