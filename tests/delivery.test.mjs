import test from "node:test";
import assert from "node:assert/strict";
import { eligibleVariants, publicScope, safeDecisionContext } from "../lib/delivery/core.mjs";
import { assetContentHash } from "../lib/delivery/asset_hash.mjs";
import { normalizeVariant } from "../lib/decide-core.js";

const project = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";

test("public decisions require a valid project and bounded slot key", () => {
  assert.equal(publicScope({ projectId: project, slotKey: "hero" }), true);
  assert.equal(publicScope({ slotKey: "hero" }), false);
  assert.equal(publicScope({ projectId: "wrong", slotKey: "hero" }), false);
  assert.equal(publicScope({ projectId: project, slotKey: "a".repeat(201) }), false);
});

test("same-sized replacement uploads change image content identity", async () => {
  const first = new Blob(["first"]);
  const second = new Blob(["other"]);
  assert.equal(first.size, second.size);
  assert.notEqual(await assetContentHash(first), await assetContentHash(second));
  assert.equal(await assetContentHash(first), await assetContentHash(new Blob(["first"])));
});

test("decisions exclude drafts, removed entries and foreign projects", () => {
  const entries = [
    { id: "live", project_id: project, status: "Published", deleted_at: null },
    { id: "draft", project_id: project, status: "Draft", deleted_at: null },
    { id: "foreign", project_id: foreign, status: "Published", deleted_at: null },
    { id: "removed", project_id: project, status: "Published", deleted_at: "today" },
    { id: "private", project_id: project, status: "Published", metadata: { visibility: "private" } },
  ];
  const variants = entries.map((e) => ({ id: e.id, entry_id: e.id, project_id: project, status: "Active" }));
  variants.push({ id: "inactive", entry_id: "live", project_id: project, status: "Inactive" });
  assert.deepEqual(eligibleVariants(variants, entries, project).map((v) => v.id), ["live"]);
});

test("variant metadata cannot replace checked entry and project identities", () => {
  const normalized = normalizeVariant({ id: "actual", entry_id: "live", project_id: project, metadata: { id: "fake", entryId: "foreign", projectId: foreign } });
  assert.equal(normalized.id, "actual");
  assert.equal(normalized.entryId, "live");
  assert.equal(normalized.projectId, project);
});

test("decision traces contain only bounded context counters and no identifiers", () => {
  const context = { anonymousId: "private", email: "private@example.test", nested: { token: "private" }, locale: "en", device: "desktop", path: "/personal/profile", experimentId: "secret" };
  const sanitized = safeDecisionContext(context);
  assert.deepEqual(sanitized, { locale: "en", device: "desktop" });
  assert.deepEqual(safeDecisionContext({ locale: "x".repeat(100), device: {} }), {});
});
