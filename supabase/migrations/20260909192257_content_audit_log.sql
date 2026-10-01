-- Content audit log
--
-- Owns content.audit_log. Append-only record of who changed what: every
-- create/update/delete in lib/supabase/{content,collections,assets,slots}.js
-- best-effort writes one row via lib/supabase/audit.js (logAction). The row
-- carries the actor, the action, the entity + entity id, a small diff bag, the
-- project it belongs to, and when it happened.
--
-- INSERT-ONLY BY DESIGN. RLS exposes select + insert to anon/authenticated and
-- deliberately no update/delete policy, so a row can never be rewritten or
-- removed through the API. There is likewise no update/delete path in the data
-- layer (audit.js exports only logAction + listAudit).
--
-- project_id is NULLABLE on purpose: update/delete call sites often know only
-- the row id, and a best-effort log must never block the mutation it records.
-- listAudit(projectId) scopes to one project; rows with a null project simply
-- don't appear there.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

create table if not exists content.audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  actor uuid,
  action text not null default '',
  entity text not null default '',
  entity_id uuid,
  diff jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.audit_log add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.audit_log add column if not exists actor uuid;
alter table content.audit_log add column if not exists action text not null default '';
alter table content.audit_log add column if not exists entity text not null default '';
alter table content.audit_log add column if not exists entity_id uuid;
alter table content.audit_log add column if not exists diff jsonb not null default '{}'::jsonb;
alter table content.audit_log add column if not exists at timestamptz not null default now();

create index if not exists audit_log_project_at_idx
  on content.audit_log (project_id, at desc);
create index if not exists audit_log_entity_idx
  on content.audit_log (entity, entity_id);

-- Insert-only RLS (the dashboard runs unauthenticated). No update/delete
-- policy exists on purpose: with RLS enabled, anything without a policy is
-- denied, so rows are append-only. Tighten select/insert to a
-- project-scoped check once auth lands (see rls_hardening_template).
alter table content.audit_log enable row level security;

drop policy if exists audit_log_read on content.audit_log;
create policy audit_log_read on content.audit_log
  for select
  to anon, authenticated
  using (true);

drop policy if exists audit_log_append on content.audit_log;
create policy audit_log_append on content.audit_log
  for insert
  to anon, authenticated
  with check (true);

grant select, insert on content.audit_log to anon, authenticated;
grant all on content.audit_log to service_role;

-- @down
drop table if exists content.audit_log cascade;
