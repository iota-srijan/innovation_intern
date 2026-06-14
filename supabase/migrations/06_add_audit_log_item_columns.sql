-- Add per-item tracking columns to audit_log so inventory changes can be
-- traced back to a specific item and quantity delta.
alter table audit_log add column if not exists item_id uuid;
alter table audit_log add column if not exists item_name text;
alter table audit_log add column if not exists quantity_change integer;
alter table audit_log add column if not exists previous_quantity integer;
alter table audit_log add column if not exists new_quantity integer;

create index if not exists idx_audit_log_item_id on audit_log(item_id);
