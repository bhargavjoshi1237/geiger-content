-- Tighten workspace policies and preserve the exact previous policies and grants for rollback.
-- @up
create table if not exists content.rls_tightening_backup (
  id boolean primary key default true check (id),
  payload jsonb not null
);
alter table content.rls_tightening_backup enable row level security;
revoke all on content.rls_tightening_backup from public, anon, authenticated;
insert into content.rls_tightening_backup (id, payload)
select true, jsonb_build_object(
  'policies', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from pg_policies p
    where (schemaname = 'content' and tablename <> 'rls_tightening_backup') or (schemaname = 'public' and tablename = 'roles')),
  'grants', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from information_schema.role_table_grants g
    where grantee in ('anon', 'authenticated') and ((table_schema = 'content' and table_name <> 'rls_tightening_backup') or (table_schema = 'public' and table_name = 'roles'))),
  'functions', (select jsonb_agg(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'content' and p.proname in ('can_access_project', 'rbac_allows', 'rbac_ensure_membership')),
  'table_states', (select jsonb_agg(jsonb_build_object('schema', n.nspname, 'table', c.relname, 'rls', c.relrowsecurity, 'force', c.relforcerowsecurity))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r'
      and ((n.nspname = 'content' and c.relname <> 'rls_tightening_backup') or (n.nspname = 'public' and c.relname = 'roles')))
) on conflict (id) do nothing;

create or replace function content.can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.projects p where p.id = p_project_id and p.deleted_at is null
      and (p.created_by = auth.uid() or exists (
        select 1 from public.organization_users ou
        where ou.organization = p.organization_id and ou."user" = auth.uid()
      ))
  );
$$;

create or replace function content.rbac_allows(p_permission text, p_project uuid default null, p_scope_type text default null, p_scope_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from content.role_grants g join public.roles r on r.id = g.role_id and r.project_id = g.project_id
    where g.user_id = auth.uid() and g.status = 'active' and g.deleted_at is null and r.deleted_at is null
      and content.can_access_project(g.project_id)
      and (p_project is null or g.project_id = p_project)
      and public.rbac_key_matches(r.permissions, p_permission)
      and (p_scope_type is null or not jsonb_exists(g.scope, p_scope_type)
        or (p_scope_id is not null and jsonb_exists(g.scope -> p_scope_type, p_scope_id::text)))
  );
$$;

create or replace function content.is_project_owner(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and content.can_access_project(p_project) and (
    exists (select 1 from public.projects where id = p_project and created_by = auth.uid() and deleted_at is null)
    or exists (select 1 from content.role_grants g join public.roles r on r.id = g.role_id and r.project_id = g.project_id
      where g.project_id = p_project and g.user_id = auth.uid() and g.status = 'active' and g.deleted_at is null
        and r.deleted_at is null and '*' = any(r.permissions))
  );
$$;
revoke all on function content.is_project_owner(uuid) from public, anon;
grant execute on function content.is_project_owner(uuid) to authenticated, service_role;

create or replace function content.rbac_ensure_membership(p_project_id uuid, p_default_role uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_role uuid; v_creator uuid;
begin
  if v_user is null or not content.can_access_project(p_project_id) then return null; end if;
  perform pg_advisory_xact_lock(hashtext('content-membership:' || p_project_id::text || ':' || v_user::text)::bigint);
  select g.role_id into v_role from content.role_grants g join public.roles r on r.id = g.role_id and r.project_id = g.project_id
    where g.project_id = p_project_id and g.user_id = v_user and g.status = 'active' and g.deleted_at is null and r.deleted_at is null limit 1;
  if v_role is not null then return v_role; end if;
  if exists (select 1 from content.role_grants where project_id = p_project_id and user_id = v_user) then return null; end if;
  select created_by into v_creator from public.projects where id = p_project_id and deleted_at is null;
  if v_creator = v_user then
    insert into public.roles (project_id, key, name, permissions, is_system, sort)
      values (p_project_id, 'owner', 'Owner', array['*'], true, 0)
      on conflict (project_id, key) where key is not null and deleted_at is null do nothing;
    select id into v_role from public.roles where project_id = p_project_id and key = 'owner' and deleted_at is null limit 1;
  else
    insert into public.roles (project_id, key, name, permissions, is_system, sort)
      values (p_project_id, 'writer', 'Writer', array['content.overview.view', 'content.content.view', 'content.architecture.view', 'content.editorial.view', 'content.entry.edit'], true, 3)
      on conflict (project_id, key) where key is not null and deleted_at is null do nothing;
    select id into v_role from public.roles where project_id = p_project_id and key = 'writer' and deleted_at is null and not '*' = any(permissions) limit 1;
  end if;
  if v_role is null then return null; end if;
  insert into content.role_grants (project_id, user_id, role_id, status, granted_by)
    values (p_project_id, v_user, v_role, 'active', v_user) on conflict do nothing;
  return v_role;
end;
$$;

-- Status transitions and soft deletion require their specific permissions even through direct clients.
create function content.guard_entry_mutation() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated' or current_setting('role', true) = 'authenticated' then
    if not content.is_project_owner(new.project_id) then
      if new.status in ('Published', 'Scheduled') or (tg_op = 'UPDATE' and old.status in ('Published', 'Scheduled')) then
        if not content.rbac_allows('content.entry.publish', new.project_id) then raise exception 'Publish permission required' using errcode = '42501'; end if;
      end if;
      if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at and not content.rbac_allows('content.entry.delete', new.project_id) then
        raise exception 'Delete permission required' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function content.guard_entry_mutation() from public, anon, authenticated;
create trigger entries_guard_mutation before insert or update on content.entries for each row execute function content.guard_entry_mutation();

create function content.term_parent_scoped(p_taxonomy uuid, p_parent uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p_parent is null or exists (
    select 1 from content.taxonomies own join content.terms parent on parent.id = p_parent
      join content.taxonomies other on other.id = parent.taxonomy_id
    where own.id = p_taxonomy and own.project_id = other.project_id and content.can_access_project(own.project_id)
  );
$$;
revoke all on function content.term_parent_scoped(uuid, uuid) from public, anon;
grant execute on function content.term_parent_scoped(uuid, uuid) to authenticated, service_role;

-- Remove every permissive workspace policy before constructing the scoped access model.
do $$
declare p record; t record;
begin
  for p in select * from pg_policies where (schemaname = 'content' and tablename <> 'rls_tightening_backup') or (schemaname = 'public' and tablename = 'roles') loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
  for t in select tablename from pg_tables where schemaname = 'content' and tablename <> 'rls_tightening_backup' loop
    execute format('alter table content.%I enable row level security', t.tablename);
    execute format('revoke all on content.%I from anon, authenticated', t.tablename);
  end loop;
end;
$$;

-- Direct project tables use membership for reads and catalog permissions for writes.
do $$
declare t record; predicate text; write_predicate text; relation_check text; permission text; creator_check text;
begin
  for t in select table_name from information_schema.columns where table_schema = 'content' and column_name = 'project_id'
    and table_name not in ('role_grants','audit_log','profile_knowledge','assistant_messages','assistant_usage','decision_traces') loop
    predicate := 'content.can_access_project(project_id)';
    permission := case
      when t.table_name in ('entries','assignments','comments','entry_versions','workflow_states') then 'content.entry.edit'
      when t.table_name = 'collections' then 'content.collection.manage'
      when t.table_name = 'assets' then 'content.asset.upload'
      when t.table_name in ('blocks','content_types','entry_embeddings','external_sources','locales','taxonomies') then 'content.type.manage'
      when t.table_name in ('api_tokens','service_accounts') then 'content.token.manage'
      when t.table_name in ('policies','retention_policies') then 'content.policy.override'
      else 'content.settings.manage' end;
    write_predicate := predicate || format(' and (content.is_project_owner(project_id) or content.rbac_allows(%L, project_id))', permission);
    if t.table_name in ('project_settings','sites','data_connections') then
      write_predicate := predicate || ' and content.is_project_owner(project_id)';
    end if;
    relation_check := '';
    creator_check := case when exists (select 1 from information_schema.columns where table_schema = 'content' and table_name = t.table_name and column_name = 'created_by')
      then ' and (created_by is null or created_by = (select auth.uid()))' else '' end;
    case t.table_name
      when 'entries' then relation_check := ' and (environment_id is null or exists (select 1 from content.environments x where x.id = entries.environment_id and x.project_id = entries.project_id))';
      when 'sites' then relation_check := ' and (environment_id is null or exists (select 1 from content.environments x where x.id = sites.environment_id and x.project_id = sites.project_id))';
      when 'assignments' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = assignments.entry_id and x.project_id = assignments.project_id))';
      when 'comments' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = comments.entry_id and x.project_id = comments.project_id))';
      when 'entry_versions' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = entry_versions.entry_id and x.project_id = entry_versions.project_id))';
      when 'entry_embeddings' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = entry_embeddings.entry_id and x.project_id = entry_embeddings.project_id))';
      when 'slots' then relation_check := ' and (fallback_entry_id is null or exists (select 1 from content.entries x where x.id = slots.fallback_entry_id and x.project_id = slots.project_id))';
      when 'variants' then relation_check := ' and (slot_id is null or exists (select 1 from content.slots x where x.id = variants.slot_id and x.project_id = variants.project_id)) and (entry_id is null or exists (select 1 from content.entries x where x.id = variants.entry_id and x.project_id = variants.project_id))';
      when 'experiment_variants' then relation_check := ' and (experiment_id is null or exists (select 1 from content.experiments x where x.id = experiment_variants.experiment_id and x.project_id = experiment_variants.project_id)) and (entry_id is null or exists (select 1 from content.entries x where x.id = experiment_variants.entry_id and x.project_id = experiment_variants.project_id))';
      when 'experiment_exposures' then relation_check := ' and (experiment_id is null or exists (select 1 from content.experiments x where x.id = experiment_exposures.experiment_id and x.project_id = experiment_exposures.project_id)) and (variant_id is null or exists (select 1 from content.experiment_variants x where x.id = experiment_exposures.variant_id and x.project_id = experiment_exposures.project_id and x.experiment_id = experiment_exposures.experiment_id))';
      when 'frequency_caps' then relation_check := ' and (slot_id is null or exists (select 1 from content.slots x where x.id = frequency_caps.slot_id and x.project_id = frequency_caps.project_id))';
      when 'ranking_rules' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = ranking_rules.entry_id and x.project_id = ranking_rules.project_id))';
      when 'events' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = events.entry_id and x.project_id = events.project_id))';
      when 'metrics_daily' then relation_check := ' and (entry_id is null or exists (select 1 from content.entries x where x.id = metrics_daily.entry_id and x.project_id = metrics_daily.project_id))';
      when 'webhook_deliveries' then relation_check := ' and (webhook_id is null or exists (select 1 from content.webhooks x where x.id = webhook_deliveries.webhook_id and x.project_id = webhook_deliveries.project_id))';
      when 'topic_stages' then relation_check := ' and (profile_id is null or exists (select 1 from content.profiles x where x.id::text = topic_stages.profile_id and x.project_id = topic_stages.project_id)) and (term_id is null or exists (select 1 from content.terms x join content.taxonomies y on y.id = x.taxonomy_id where x.id = topic_stages.term_id and y.project_id = topic_stages.project_id))';
      else null;
    end case;
    execute format('grant select, insert, update, delete on content.%I to authenticated', t.table_name);
    execute format('create policy workspace_read on content.%I for select to authenticated using (%s)', t.table_name, predicate);
    execute format('create policy workspace_insert on content.%I for insert to authenticated with check (%s%s%s)', t.table_name, write_predicate, relation_check, creator_check);
    execute format('create policy workspace_update on content.%I for update to authenticated using (%s) with check (%s%s)', t.table_name, write_predicate, write_predicate, relation_check);
    execute format('create policy workspace_delete on content.%I for delete to authenticated using (%s)', t.table_name,
      case when t.table_name = 'entries' then predicate || ' and (content.is_project_owner(project_id) or content.rbac_allows(''content.entry.delete'', project_id))' else write_predicate end);
  end loop;
end;
$$;

-- Child tables authorize through every project-bearing parent, including both ends of links.
do $$
declare t record; predicate text; permission text; write_predicate text;
begin
  for t in select * from (values
    ('fields', 'exists (select 1 from content.content_types p where p.id = fields.type_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.content_types p where p.id = fields.type_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.type.manage'', p.project_id)))'),
    ('terms', 'exists (select 1 from content.taxonomies p where p.id = terms.taxonomy_id and content.can_access_project(p.project_id))', 'content.term_parent_scoped(terms.taxonomy_id, terms.parent_id) and exists (select 1 from content.taxonomies p where p.id = terms.taxonomy_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.type.manage'', p.project_id)))'),
    ('collection_items', 'exists (select 1 from content.collections p join content.entries e on e.project_id = p.project_id where p.id = collection_items.collection_id and e.id = collection_items.entry_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.collections p where p.id = collection_items.collection_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.collection.manage'', p.project_id)))'),
    ('block_instances', 'exists (select 1 from content.blocks p join content.entries e on e.project_id = p.project_id where p.id = block_instances.block_id and e.id = block_instances.entry_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.entries p where p.id = block_instances.entry_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.entry.edit'', p.project_id)))'),
    ('entry_references', 'exists (select 1 from content.entries p join content.entries e on e.project_id = p.project_id where p.id = entry_references.from_entry_id and e.id = entry_references.to_entry_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.entries p where p.id = entry_references.from_entry_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.entry.edit'', p.project_id)))'),
    ('entry_terms', 'exists (select 1 from content.entries p join content.terms t on t.id = entry_terms.term_id join content.taxonomies x on x.id = t.taxonomy_id and x.project_id = p.project_id where p.id = entry_terms.entry_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.entries p where p.id = entry_terms.entry_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.entry.edit'', p.project_id)))'),
    ('profile_traits', 'exists (select 1 from content.profiles p where p.id = profile_traits.profile_id and content.can_access_project(p.project_id))', 'exists (select 1 from content.profiles p where p.id = profile_traits.profile_id and (content.is_project_owner(p.project_id) or content.rbac_allows(''content.settings.manage'', p.project_id)))')
  ) as children(table_name, read_predicate, write_predicate) loop
    predicate := t.read_predicate;
    write_predicate := predicate || ' and ' || t.write_predicate;
    execute format('grant select, insert, update, delete on content.%I to authenticated', t.table_name);
    execute format('create policy workspace_read on content.%I for select to authenticated using (%s)', t.table_name, predicate);
    execute format('create policy workspace_write on content.%I for all to authenticated using (%s) with check (%s)', t.table_name, write_predicate, write_predicate);
  end loop;
end;
$$;

-- Consent mutations use the authenticated server path so profile vector erasure shares its lock.
grant select on content.consent_state to authenticated;
create policy consent_workspace_read on content.consent_state for select to authenticated using (
  exists (select 1 from content.profiles p where p.id = consent_state.profile_id and content.can_access_project(p.project_id))
);

grant select, insert, update, delete on content.profile_knowledge to authenticated;
create policy knowledge_owner on content.profile_knowledge for all to authenticated
  using (owner_id = (select auth.uid()) and content.can_access_project(project_id))
  with check (owner_id = (select auth.uid()) and content.can_access_project(project_id) and exists (
    select 1 from content.profiles p where p.id = profile_id and p.project_id = profile_knowledge.project_id
      and p.deleted_at is null and (p.primary_identifier = (select auth.uid())::text or p.identifiers @> array[(select auth.uid())::text])
  ));

grant select, insert on content.audit_log to authenticated;
create policy audit_workspace_read on content.audit_log for select to authenticated using (content.can_access_project(project_id));
create policy audit_workspace_append on content.audit_log for insert to authenticated
  with check (content.can_access_project(project_id) and actor = (select auth.uid()));

grant select, insert on content.assistant_messages to authenticated;
create policy assistant_owner_read on content.assistant_messages for select to authenticated
  using (created_by = (select auth.uid()) and content.can_access_project(project_id));
create policy assistant_owner_append on content.assistant_messages for insert to authenticated
  with check (created_by = (select auth.uid()) and content.can_access_project(project_id) and (entry_id is null or exists (
    select 1 from content.entries e where e.id = assistant_messages.entry_id and e.project_id = assistant_messages.project_id and e.deleted_at is null
  )));
grant select on content.decision_traces to authenticated;
create policy decision_workspace_read on content.decision_traces for select to authenticated using (content.can_access_project(project_id));

-- Published entries remain readable through anonymous delivery; private workspace tables do not.
grant select on content.entries to anon;
create policy published_delivery on content.entries for select to anon
  using (status = 'Published' and deleted_at is null and coalesce(metadata ->> 'visibility', '') <> 'private');

-- Authorization writes cannot accept a role from a different project or mint wildcard ownership.
revoke all on public.roles from anon, authenticated;
grant select, insert, update, delete on public.roles to authenticated;
create policy roles_workspace_read on public.roles for select to authenticated
  using (project_id is null or content.can_access_project(project_id));
create policy roles_workspace_write on public.roles for all to authenticated
  using (content.can_access_project(project_id) and (content.is_project_owner(project_id) or (content.rbac_allows('content.role.manage', project_id) and not '*' = any(permissions))))
  with check (content.can_access_project(project_id) and (content.is_project_owner(project_id) or (content.rbac_allows('content.role.manage', project_id) and not '*' = any(permissions))));
grant select, insert, update, delete on content.role_grants to authenticated;
create policy grants_workspace_read on content.role_grants for select to authenticated
  using (content.can_access_project(project_id) and (user_id = (select auth.uid()) or content.is_project_owner(project_id) or content.rbac_allows('content.team.assign', project_id)));
create policy grants_workspace_write on content.role_grants for all to authenticated
  using (content.can_access_project(project_id) and (content.is_project_owner(project_id) or (content.rbac_allows('content.team.assign', project_id)
    and exists (select 1 from public.roles r where r.id = role_id and r.project_id = role_grants.project_id and not '*' = any(r.permissions)))))
  with check (content.can_access_project(project_id) and (content.is_project_owner(project_id) or content.rbac_allows('content.team.assign', project_id))
    and exists (select 1 from public.roles r where r.id = role_id and r.project_id = role_grants.project_id and r.deleted_at is null
      and (not '*' = any(r.permissions) or content.is_project_owner(role_grants.project_id))));

-- @down
drop trigger if exists entries_guard_mutation on content.entries;
drop function if exists content.guard_entry_mutation();
do $$
declare saved jsonb; p jsonb; g jsonb; f jsonb; current_policy record; t record; role_list text;
begin
  select payload into saved from content.rls_tightening_backup where id = true;
  if saved is null then raise exception 'RLS rollback snapshot is unavailable'; end if;
  for current_policy in select * from pg_policies where (schemaname = 'content' and tablename <> 'rls_tightening_backup') or (schemaname = 'public' and tablename = 'roles') loop
    execute format('drop policy %I on %I.%I', current_policy.policyname, current_policy.schemaname, current_policy.tablename);
  end loop;
  for f in select value from jsonb_array_elements(saved -> 'functions') loop
    execute f #>> '{}';
  end loop;
  for p in select value from jsonb_array_elements(saved -> 'policies') loop
    select string_agg(quote_ident(value), ',') into role_list from jsonb_array_elements_text(p -> 'roles');
    execute format('create policy %I on %I.%I as %s for %s to %s%s%s',
      p ->> 'policyname', p ->> 'schemaname', p ->> 'tablename', p ->> 'permissive', p ->> 'cmd', role_list,
      case when p ->> 'qual' is not null then ' using (' || (p ->> 'qual') || ')' else '' end,
      case when p ->> 'with_check' is not null then ' with check (' || (p ->> 'with_check') || ')' else '' end);
  end loop;
  for t in select schemaname, tablename from pg_tables where (schemaname = 'content' and tablename <> 'rls_tightening_backup') or (schemaname = 'public' and tablename = 'roles') loop
    execute format('revoke all on %I.%I from anon, authenticated', t.schemaname, t.tablename);
  end loop;
  for g in select value from jsonb_array_elements(saved -> 'grants') loop
    execute format('grant %s on %I.%I to %I%s', g ->> 'privilege_type', g ->> 'table_schema', g ->> 'table_name', g ->> 'grantee',
      case when g ->> 'is_grantable' = 'YES' then ' with grant option' else '' end);
  end loop;
  for g in select value from jsonb_array_elements(saved -> 'table_states') loop
    execute format('alter table %I.%I %s row level security', g ->> 'schema', g ->> 'table', case when (g ->> 'rls')::boolean then 'enable' else 'disable' end);
    execute format('alter table %I.%I %s row level security', g ->> 'schema', g ->> 'table', case when (g ->> 'force')::boolean then 'force' else 'no force' end);
  end loop;
end;
$$;
drop function if exists content.is_project_owner(uuid);
drop function if exists content.term_parent_scoped(uuid, uuid);
drop table if exists content.rls_tightening_backup;
