-- Add voter_role to demand_votes to distinguish student vs faculty votes.
-- Existing rows (if any) default to 'student'.
alter table demand_votes
  add column if not exists voter_role text default 'student';
