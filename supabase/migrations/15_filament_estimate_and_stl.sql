-- Filament-style equipment requests (e.g. 3D printing material) need a way
-- to estimate how much is actually needed and let the student attach the
-- STL so a mentor can sanity-check the request before approving it. The
-- STL side reuses the same 'stl-files' storage bucket already used by
-- service_requests — see src/lib/stlFiles.ts's uploadStlFile().

-- Admin sets this per category (e.g. 'grams' for a filament category).
-- Left null for plain unit-count categories, which is the existing
-- behavior for every category today.
alter table categories add column if not exists unit text;

-- estimated_amount_unit is copied from categories.unit at submission time
-- so a request's display stays accurate even if a category's unit is
-- changed or the category is later deleted.
alter table issue_requests add column if not exists estimated_amount numeric;
alter table issue_requests add column if not exists estimated_amount_unit text;
alter table issue_requests add column if not exists stl_file_url text;
alter table issue_requests add column if not exists stl_file_name text;
