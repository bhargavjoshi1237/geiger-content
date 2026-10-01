-- Seed adoption: attach NULL-project seed rows to a real project.
--
-- Seeds 01_entries, 02_collections, 03_assets, and 04_slots insert with
-- project_id NULL on purpose so they load on a fresh database without
-- depending on a public.projects row. Project-scoped screens filter by
-- project_id, so on a fresh clone those screens render empty until the seeds
-- are adopted. This file adopts them: every row still NULL is assigned to the
-- earliest public.projects row (by created_at).
--
-- Pure data, no DDL. Idempotent: the WHERE project_id IS NULL guard makes
-- re-runs a no-op, and the EXISTS guard makes it a no-op when no project
-- exists yet (run db:seed again after creating one). Runs after 01..04 in
-- path order.

update content.entries
set project_id = (
  select id from public.projects order by created_at asc nulls last, id asc limit 1
)
where project_id is null
  and exists (select 1 from public.projects);

update content.collections
set project_id = (
  select id from public.projects order by created_at asc nulls last, id asc limit 1
)
where project_id is null
  and exists (select 1 from public.projects);

update content.assets
set project_id = (
  select id from public.projects order by created_at asc nulls last, id asc limit 1
)
where project_id is null
  and exists (select 1 from public.projects);

update content.slots
set project_id = (
  select id from public.projects order by created_at asc nulls last, id asc limit 1
)
where project_id is null
  and exists (select 1 from public.projects);
