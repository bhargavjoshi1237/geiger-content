-- Entry references
--
-- Owns content.entry_references. Directed links between entries
-- (from_entry -> to_entry) for a named field, with reverse-link lookups.
-- Self-contained + idempotent.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

create or replace function content.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists content.entry_references (
  id uuid primary key default gen_random_uuid(),
  from_entry_id uuid references content.entries(id) on delete cascade,
  to_entry_id uuid references content.entries(id) on delete cascade,
  field_key text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.entry_references add column if not exists from_entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_references add column if not exists to_entry_id uuid references content.entries(id) on delete cascade;
alter table content.entry_references add column if not exists field_key text not null default '';
alter table content.entry_references add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.entry_references add column if not exists created_by uuid;
alter table content.entry_references add column if not exists created_at timestamptz not null default now();
alter table content.entry_references add column if not exists updated_at timestamptz not null default now();
alter table content.entry_references add column if not exists deleted_at timestamptz;

create index if not exists entry_references_from_idx
  on content.entry_references (from_entry_id) where deleted_at is null;
create index if not exists entry_references_to_idx
  on content.entry_references (to_entry_id) where deleted_at is null;
create unique index if not exists entry_references_triple_uniq
  on content.entry_references (from_entry_id, to_entry_id, field_key)
  where deleted_at is null;

drop trigger if exists entry_references_touch_updated_at on content.entry_references;
create trigger entry_references_touch_updated_at
before update on content.entry_references
for each row execute function content.touch_updated_at();

alter table content.entry_references enable row level security;
drop policy if exists entry_references_demo_all on content.entry_references;
create policy entry_references_demo_all on content.entry_references
  for all to anon, authenticated using (true) with check (true);

-- @down
drop policy if exists entry_references_demo_all on content.entry_references;
drop trigger if exists entry_references_touch_updated_at on content.entry_references;
drop index if exists content.entry_references_triple_uniq;
drop index if exists content.entry_references_to_idx;
drop index if exists content.entry_references_from_idx;
drop table if exists content.entry_references cascade;
