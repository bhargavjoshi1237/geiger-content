-- Delivery v2 type link
--
-- Links every entry to its content type (entries.type_id) and gives each type a
-- URL id (content_types.api_id / api_plural) for /api/content/v2. Owns the
-- content.api_slug / api_pluralize helpers, the content_type_api_ids,
-- entry_type_link and content_type_link_entries trigger functions, and the
-- entries_delivery_idx list index.

-- @up
create schema if not exists content;

alter table content.entries add column if not exists type_id uuid references content.content_types(id) on delete set null;
alter table content.content_types add column if not exists api_id text not null default '';
alter table content.content_types add column if not exists api_plural text not null default '';

-- kebab-case URL id from a key or name ("Blog_Post" -> "blog-post").
create or replace function content.api_slug(p_value text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function content.api_pluralize(p_value text)
returns text language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_value, '') = '' then ''
    when p_value ~ '[^aeiou]y$' then left(p_value, -1) || 'ies'
    when p_value ~ '(s|x|z|ch|sh)$' then p_value || 'es'
    else p_value || 's'
  end;
$$;

-- Backfill URL ids without bumping updated_at; same-project slug clashes get a numeric suffix.
alter table content.content_types disable trigger content_types_touch_updated_at;
with ranked as (
  select id, base, row_number() over (partition by project_id, base order by created_at, id) as n
  from (
    select id, project_id, created_at,
      coalesce(nullif(content.api_slug(coalesce(nullif(key, ''), name)), ''), 'type') as base
    from content.content_types
    where api_id = ''
  ) s
)
update content.content_types t
set api_id = case when r.n = 1 then r.base else r.base || '-' || r.n end
from ranked r
where t.id = r.id;
update content.content_types set api_plural = content.api_pluralize(api_id) where api_plural = '';
alter table content.content_types enable trigger content_types_touch_updated_at;

create unique index if not exists content_types_project_api_id_uniq
  on content.content_types (project_id, api_id) where deleted_at is null and api_id <> '';
create unique index if not exists content_types_project_api_plural_uniq
  on content.content_types (project_id, api_plural) where deleted_at is null and api_plural <> '';

-- New and renamed types derive their URL ids unless the caller sets them.
create or replace function content.content_type_api_ids()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.api_id := content.api_slug(coalesce(nullif(new.api_id, ''), nullif(new.key, ''), new.name));
  if new.api_id = '' then new.api_id := 'type'; end if;
  if coalesce(new.api_plural, '') = ''
    or (tg_op = 'UPDATE' and new.api_id is distinct from old.api_id and new.api_plural is not distinct from old.api_plural) then
    new.api_plural := content.api_pluralize(new.api_id);
  else
    new.api_plural := content.api_slug(new.api_plural);
  end if;
  return new;
end;
$$;
drop trigger if exists content_types_api_ids on content.content_types;
create trigger content_types_api_ids
before insert or update on content.content_types
for each row execute function content.content_type_api_ids();

-- Entries resolve their type from the legacy `type` text (key, then name, then api id) within the project.
create or replace function content.entry_type_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.type_id is not null and (tg_op = 'INSERT' or new.type_id is distinct from old.type_id) then
    if exists (select 1 from content.content_types t where t.id = new.type_id and t.project_id = new.project_id) then
      return new;
    end if;
  elsif tg_op = 'UPDATE' and new.type_id is not null
    and new.type is not distinct from old.type and new.project_id is not distinct from old.project_id then
    return new;
  end if;
  new.type_id := (
    select t.id from content.content_types t
    where t.project_id = new.project_id and t.deleted_at is null and coalesce(new.type, '') <> ''
      and (lower(t.key) = lower(new.type) or lower(t.name) = lower(new.type) or t.api_id = content.api_slug(new.type))
    order by (lower(t.key) = lower(new.type)) desc, (lower(t.name) = lower(new.type)) desc, t.created_at
    limit 1
  );
  return new;
end;
$$;
revoke all on function content.entry_type_link() from public, anon, authenticated;
drop trigger if exists entries_type_link on content.entries;
create trigger entries_type_link
before insert or update on content.entries
for each row execute function content.entry_type_link();

-- A type created after its entries adopts the unlinked entries that name it.
create or replace function content.content_type_link_entries()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is null then
    update content.entries e set type_id = new.id
    where e.project_id = new.project_id and e.type_id is null and e.deleted_at is null and coalesce(e.type, '') <> ''
      and (lower(e.type) = lower(new.key) or lower(e.type) = lower(new.name) or content.api_slug(e.type) = new.api_id);
  end if;
  return null;
end;
$$;
revoke all on function content.content_type_link_entries() from public, anon, authenticated;
drop trigger if exists content_types_link_entries on content.content_types;
create trigger content_types_link_entries
after insert or update of key, name, api_id, deleted_at on content.content_types
for each row execute function content.content_type_link_entries();

-- Backfill existing entries without bumping updated_at or tripping the publish guard.
alter table content.entries disable trigger entries_touch_updated_at;
update content.entries e set type_id = (
  select t.id from content.content_types t
  where t.project_id = e.project_id and t.deleted_at is null
    and (lower(t.key) = lower(e.type) or lower(t.name) = lower(e.type) or t.api_id = content.api_slug(e.type))
  order by (lower(t.key) = lower(e.type)) desc, (lower(t.name) = lower(e.type)) desc, t.created_at
  limit 1
)
where e.type_id is null and coalesce(e.type, '') <> '';
alter table content.entries enable trigger entries_touch_updated_at;

create index if not exists entries_delivery_idx
  on content.entries (project_id, type_id, locale, published_at desc) where deleted_at is null;

-- @down
drop index if exists content.entries_delivery_idx;
drop trigger if exists content_types_link_entries on content.content_types;
drop trigger if exists content_types_api_ids on content.content_types;
drop trigger if exists entries_type_link on content.entries;
drop function if exists content.content_type_link_entries();
drop function if exists content.content_type_api_ids();
drop function if exists content.entry_type_link();
drop index if exists content.content_types_project_api_plural_uniq;
drop index if exists content.content_types_project_api_id_uniq;
alter table content.entries drop column if exists type_id;
alter table content.content_types drop column if exists api_plural;
alter table content.content_types drop column if exists api_id;
drop function if exists content.api_pluralize(text);
drop function if exists content.api_slug(text);
