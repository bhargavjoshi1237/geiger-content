-- Developer API tokens + service accounts
--
-- Owns content.api_tokens (hashed, scoped, revocable bearer tokens for the
-- delivery API) and content.service_accounts (named non-human identities a
-- project uses for automation). Self-contained: creates the schema, the shared
-- updated_at trigger function, both tables, their indexes and RLS.
--
-- GraphQL note (Phase 7): delivery GraphQL is a hand-rolled v1 placeholder in
-- `app/api/content/v1/graphql/route.js`. We deliberately do NOT enable the
-- `pg_graphql` extension on this suite-shared database — an extension install
-- is a cluster-wide change that every product schema would inherit, and its
-- auto-generated schema would bypass our project-scoped RLS review.

-- @up
create extension if not exists pgcrypto;

create schema if not exists content;
grant usage on schema content to anon, authenticated, service_role;

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

create table if not exists content.api_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled token',
  -- SHA-256 hex of the bearer value. The plain token is shown once at mint
  -- time and never stored; lookups compare hashes only.
  token_hash text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  -- Expansion bag: keep not-yet-promoted config here, promote to a real column
  -- once it needs indexing, constraints or its own RLS.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.api_tokens add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.api_tokens add column if not exists name text not null default 'Untitled token';
alter table content.api_tokens add column if not exists token_hash text not null default '';
alter table content.api_tokens add column if not exists scopes text[] not null default '{}';
alter table content.api_tokens add column if not exists expires_at timestamptz;
alter table content.api_tokens add column if not exists revoked_at timestamptz;
alter table content.api_tokens add column if not exists last_used_at timestamptz;
alter table content.api_tokens add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.api_tokens add column if not exists created_by uuid;
alter table content.api_tokens add column if not exists created_at timestamptz not null default now();
alter table content.api_tokens add column if not exists updated_at timestamptz not null default now();
alter table content.api_tokens add column if not exists deleted_at timestamptz;

-- One hash = one token. The default unique index would collide on the '' rows
-- back-filled by the alter above, so scope it to non-empty hashes.
create unique index if not exists api_tokens_hash_uniq
  on content.api_tokens (token_hash) where deleted_at is null and token_hash <> '';
create index if not exists api_tokens_project_idx
  on content.api_tokens (project_id) where deleted_at is null;
create index if not exists api_tokens_created_at_idx
  on content.api_tokens (created_at desc);

drop trigger if exists api_tokens_touch_updated_at on content.api_tokens;
create trigger api_tokens_touch_updated_at
before update on content.api_tokens
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.api_tokens enable row level security;

drop policy if exists api_tokens_demo_all on content.api_tokens;
create policy api_tokens_demo_all on content.api_tokens
  for all
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists content.service_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null default 'Untitled service account',
  role text not null default 'viewer',
  -- Expansion bag: token ids, IP allowlists, per-account limits live here
  -- until promoted to real columns.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table content.service_accounts add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table content.service_accounts add column if not exists name text not null default 'Untitled service account';
alter table content.service_accounts add column if not exists role text not null default 'viewer';
alter table content.service_accounts add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table content.service_accounts add column if not exists created_by uuid;
alter table content.service_accounts add column if not exists created_at timestamptz not null default now();
alter table content.service_accounts add column if not exists updated_at timestamptz not null default now();
alter table content.service_accounts add column if not exists deleted_at timestamptz;

create index if not exists service_accounts_project_idx
  on content.service_accounts (project_id) where deleted_at is null;
create index if not exists service_accounts_created_at_idx
  on content.service_accounts (created_at desc);

drop trigger if exists service_accounts_touch_updated_at on content.service_accounts;
create trigger service_accounts_touch_updated_at
before update on content.service_accounts
for each row execute function content.touch_updated_at();

-- Demo-open RLS (the dashboard runs unauthenticated). Tighten once auth lands.
alter table content.service_accounts enable row level security;

drop policy if exists service_accounts_demo_all on content.service_accounts;
create policy service_accounts_demo_all on content.service_accounts
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Record the delivery-surface decision on the schema itself so a future
-- "just enable pg_graphql" migration has to confront it.
comment on schema content is 'Geiger Content product schema. Delivery GraphQL is a hand-rolled v1 placeholder (see app/api/content/v1/graphql/route.js); pg_graphql is deliberately NOT enabled on this shared database.';

-- @down
drop table if exists content.service_accounts cascade;
drop table if exists content.api_tokens cascade;
