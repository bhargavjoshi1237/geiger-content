-- Content table grants
--
-- Gives anon/authenticated/service_role table access in the content schema.
-- RLS policies alone don't allow reads/writes — Postgres also requires
-- table-level GRANTs, which the table migrations omitted (schema USAGE only).
-- Also sets default privileges so future content tables inherit them.
-- Mirrors the grants in geiger-events' migrations.

-- @up
grant usage on schema content to anon, authenticated, service_role;

grant all on table content.entries to anon, authenticated, service_role;
grant all on table content.collections to anon, authenticated, service_role;
grant all on table content.collection_items to anon, authenticated, service_role;
grant all on table content.assets to anon, authenticated, service_role;
grant all on table content.slots to anon, authenticated, service_role;

alter default privileges in schema content
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema content
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema content
  grant all on routines to anon, authenticated, service_role;

-- @down
alter default privileges in schema content
  revoke all on routines from anon, authenticated, service_role;
alter default privileges in schema content
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges in schema content
  revoke all on tables from anon, authenticated, service_role;

revoke all on table content.slots from anon, authenticated, service_role;
revoke all on table content.assets from anon, authenticated, service_role;
revoke all on table content.collection_items from anon, authenticated, service_role;
revoke all on table content.collections from anon, authenticated, service_role;
revoke all on table content.entries from anon, authenticated, service_role;
