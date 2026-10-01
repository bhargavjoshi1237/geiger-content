-- Content webhooks
--
-- Owns content.webhooks + content.webhook_deliveries. Outbound subscriptions
-- fired on publish/unpublish, with a per-attempt delivery log behind the
-- Webhooks screen. Self-contained: creates the schema, the shared updated_at
-- trigger function, both tables, their indexes and RLS.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

-- Table-level GRANTs (RLS policies alone don't allow reads/writes).

-- Shared "touch updated_at" trigger function (suite convention). Defined here
-- so this migration never depends on another having run first.
create or replace function content.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists content.webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled webhook',
  url text not null default '',
  events text[] not null default '{}',
  secret text not null default '',
  status text not null default 'Active',
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.webhooks add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.webhooks add column if not exists name text not null default 'Untitled webhook';
alter table content.webhooks add column if not exists url text not null default '';
alter table content.webhooks add column if not exists events text[] not null default '{}';
alter table content.webhooks add column if not exists secret text not null default '';
alter table content.webhooks add column if not exists status text not null default 'Active';
alter table content.webhooks add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.webhooks add column if not exists created_by uuid;
alter table content.webhooks add column if not exists created_at timestamptz not null default now();
alter table content.webhooks add column if not exists updated_at timestamptz not null default now();
alter table content.webhooks add column if not exists deleted_at timestamptz;

create index if not exists webhooks_project_idx
  on content.webhooks (project_id) where deleted_at is null;
create index if not exists webhooks_status_idx
  on content.webhooks (status) where deleted_at is null;
create index if not exists webhooks_created_at_idx
  on content.webhooks (created_at desc);

drop trigger if exists webhooks_touch_updated_at on content.webhooks;
create trigger webhooks_touch_updated_at
before update on content.webhooks
for each row execute function content.touch_updated_at();

grant all on table content.webhooks to anon, authenticated, service_role;

alter table content.webhooks enable row level security;

drop policy if exists webhooks_demo_all on content.webhooks;
create policy webhooks_demo_all on content.webhooks
  for all
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists content.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  webhook_id uuid references content.webhooks(id) on delete cascade,
  event text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending',
  attempts integer not null default 0,
  response_code integer,
  response_body text not null default '',
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Tolerate older copies of the table by back-filling any missing columns.
alter table content.webhook_deliveries add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.webhook_deliveries add column if not exists webhook_id uuid references content.webhooks(id) on delete cascade;
alter table content.webhook_deliveries add column if not exists event text not null default '';
alter table content.webhook_deliveries add column if not exists payload jsonb not null default '{}'::jsonb;
alter table content.webhook_deliveries add column if not exists status text not null default 'Pending';
alter table content.webhook_deliveries add column if not exists attempts integer not null default 0;
alter table content.webhook_deliveries add column if not exists response_code integer;
alter table content.webhook_deliveries add column if not exists response_body text not null default '';
alter table content.webhook_deliveries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.webhook_deliveries add column if not exists created_by uuid;
alter table content.webhook_deliveries add column if not exists created_at timestamptz not null default now();
alter table content.webhook_deliveries add column if not exists updated_at timestamptz not null default now();
alter table content.webhook_deliveries add column if not exists deleted_at timestamptz;

create index if not exists webhook_deliveries_webhook_idx
  on content.webhook_deliveries (webhook_id) where deleted_at is null;
create index if not exists webhook_deliveries_project_idx
  on content.webhook_deliveries (project_id) where deleted_at is null;
create index if not exists webhook_deliveries_status_idx
  on content.webhook_deliveries (status) where deleted_at is null;
create index if not exists webhook_deliveries_created_at_idx
  on content.webhook_deliveries (created_at desc);

drop trigger if exists webhook_deliveries_touch_updated_at on content.webhook_deliveries;
create trigger webhook_deliveries_touch_updated_at
before update on content.webhook_deliveries
for each row execute function content.touch_updated_at();

grant all on table content.webhook_deliveries to anon, authenticated, service_role;

alter table content.webhook_deliveries enable row level security;

drop policy if exists webhook_deliveries_demo_all on content.webhook_deliveries;
create policy webhook_deliveries_demo_all on content.webhook_deliveries
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- @down
drop table if exists content.webhook_deliveries cascade;
drop table if exists content.webhooks cascade;
