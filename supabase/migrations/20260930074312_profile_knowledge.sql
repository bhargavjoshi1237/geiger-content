-- @up
create table if not exists content.profile_knowledge (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references content.profiles(id) on delete cascade,
  owner_id uuid not null default auth.uid(), title text not null default '', body text not null default '',
  topic_label text not null default '', evidence text not null default '',
  kind text not null default 'self_declared' check (kind in ('self_declared','assessment','learning')),
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  metadata jsonb not null default '{}'::jsonb, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index if not exists profile_knowledge_owner_idx on content.profile_knowledge (project_id, owner_id) where deleted_at is null;
create index if not exists profile_knowledge_profile_idx on content.profile_knowledge (profile_id) where deleted_at is null;
drop trigger if exists profile_knowledge_updated on content.profile_knowledge;
create trigger profile_knowledge_updated before update on content.profile_knowledge for each row execute function content.touch_updated_at();
alter table content.profile_knowledge enable row level security;
drop policy if exists profile_knowledge_owner on content.profile_knowledge;
create policy profile_knowledge_owner on content.profile_knowledge for all to authenticated
using (owner_id = auth.uid() and content.can_access_project(project_id))
with check (owner_id = auth.uid() and content.can_access_project(project_id) and exists (
  select 1 from content.profiles p where p.id = profile_id and p.project_id = profile_knowledge.project_id
    and p.deleted_at is null and (p.primary_identifier = auth.uid()::text or p.identifiers @> array[auth.uid()::text])
));
grant select, insert, update on content.profile_knowledge to authenticated;
grant all on content.profile_knowledge to service_role;
-- @down
drop table if exists content.profile_knowledge;

