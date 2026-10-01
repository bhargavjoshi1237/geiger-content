-- Persist delivery sites, private assistant history and real decision traces.

-- @up
create table if not exists content.sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  hostname text not null,
  brand_name text not null default '',
  environment_id uuid references content.environments(id) on delete set null,
  status text not null default 'Draft' check (status in ('Draft', 'Active', 'Paused')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists sites_project_hostname_unique
  on content.sites (project_id, hostname) where deleted_at is null;
create index if not exists sites_project_idx on content.sites (project_id);
drop trigger if exists sites_touch_updated_at on content.sites;
create trigger sites_touch_updated_at before update on content.sites
  for each row execute function content.touch_updated_at();
alter table content.sites enable row level security;
grant select, insert, update, delete on content.sites to authenticated;
grant all on content.sites to service_role;
drop policy if exists sites_workspace on content.sites;
create policy sites_workspace on content.sites for all to authenticated
  using (content.can_access_project(project_id))
  with check (content.can_access_project(project_id));

create table if not exists content.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null,
  prompt text not null,
  response text not null,
  model text not null,
  entry_id uuid references content.entries(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists assistant_messages_owner_idx
  on content.assistant_messages (project_id, created_by, created_at desc);
alter table content.assistant_messages enable row level security;
grant select, insert on content.assistant_messages to authenticated;
grant all on content.assistant_messages to service_role;
drop policy if exists assistant_messages_read on content.assistant_messages;
create policy assistant_messages_read on content.assistant_messages for select to authenticated
  using (created_by = (select auth.uid()) and content.can_access_project(project_id));
drop policy if exists assistant_messages_append on content.assistant_messages;
create policy assistant_messages_append on content.assistant_messages for insert to authenticated
  with check (created_by = (select auth.uid()) and content.can_access_project(project_id)
    and (entry_id is null or exists (select 1 from content.entries e
      where e.id = entry_id and e.project_id = assistant_messages.project_id and e.deleted_at is null)));

create table if not exists content.assistant_usage (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  bucket timestamptz not null,
  requests integer not null default 0 check (requests between 0 and 5),
  primary key (project_id, user_id, bucket)
);
alter table content.assistant_usage enable row level security;
revoke all on content.assistant_usage from public, anon, authenticated;
grant all on content.assistant_usage to service_role;
create or replace function content.reserve_assistant_request(p_project uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_bucket timestamptz := date_trunc('minute', now()); v_requests integer;
begin
  if v_user is null or not content.can_access_project(p_project)
    or not content.rbac_allows('content.entry.edit', p_project) then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('content-assistant:' || p_project::text || ':' || v_user::text)::bigint);
  delete from content.assistant_usage where project_id = p_project and user_id = v_user and bucket < now() - interval '1 day';
  insert into content.assistant_usage (project_id, user_id, bucket, requests)
    values (p_project, v_user, v_bucket, 1)
    on conflict (project_id, user_id, bucket) do update
      set requests = content.assistant_usage.requests + 1 where content.assistant_usage.requests < 5
    returning requests into v_requests;
  return v_requests is not null;
end;
$$;
revoke all on function content.reserve_assistant_request(uuid) from public, anon;
grant execute on function content.reserve_assistant_request(uuid) to authenticated;

create table if not exists content.decision_traces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slot_id uuid references content.slots(id) on delete set null,
  entry_id uuid references content.entries(id) on delete set null,
  variant_id uuid references content.variants(id) on delete set null,
  reason text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists decision_traces_project_idx
  on content.decision_traces (project_id, created_at desc);
alter table content.decision_traces enable row level security;
grant select on content.decision_traces to authenticated;
grant all on content.decision_traces to service_role;
drop policy if exists decision_traces_read on content.decision_traces;
create policy decision_traces_read on content.decision_traces for select to authenticated
  using (content.can_access_project(project_id));


-- @down
drop function if exists content.reserve_assistant_request(uuid);
drop table if exists content.assistant_usage;
drop table if exists content.decision_traces;
drop table if exists content.assistant_messages;
drop table if exists content.sites;

