import test from "node:test";
import assert from "node:assert/strict";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const moduleUrl = new URL("../lib/vector/consent.mjs", import.meta.url);

async function fixtures({ own = true, override = false, lockError = false, saveError = false, eraseError = false, accessError = false, overrideError = false } = {}) {
  const { saveConsent } = await import(moduleUrl.href);
  const calls = [], rows = [];
  const profile = { id: id(3), project_id: id(1), primary_identifier: own ? id(2) : id(4), identifiers: [] };
  const ctx = { projectId: id(1), user: { id: id(2) }, content: { rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: name === "can_access_project" || override, error: (name === "can_access_project" ? accessError : overrideError) ? { message: "Unavailable" } : null };
  } } };
  const admin = { schema: () => admin, from: (table) => {
    const filters = {};
    const builder = { select: () => builder, eq(column, value) { filters[column] = value; return builder; }, is: () => builder,
      maybeSingle: async () => ({ data: profile.project_id === filters.project_id && profile.id === filters.id ? profile : null, error: null }),
      upsert(row, options) { assert.equal(table, "consent_state"); assert.equal(options.onConflict, "profile_id,purpose"); rows.push(row); calls.push({ name: "save" }); return builder; },
      single: async () => ({ data: { id: id(5), ...rows.at(-1), created_at: "2026-10-01T00:00:00Z" }, error: saveError ? { message: "private connection detail" } : null }),
    };
    return builder;
  } };
  const dependencies = { admin,
    withProfileLock: async (projectId, profileId, operation) => {
      assert.equal(projectId, id(1)); assert.equal(profileId, id(3)); calls.push({ name: "lock" });
      if (lockError) throw new Error("private lock connection detail");
      const result = await operation({ transaction: true });
      calls.push({ name: "unlock" }); return result;
    },
    eraseProfile: async (client, projectId, profileId) => {
      assert.equal(client.transaction, true); assert.equal(projectId, id(1)); assert.equal(profileId, id(3)); calls.push({ name: "erase" });
      if (eraseError) throw new Error("private erase connection detail");
    },
  };
  return { saveConsent, ctx, dependencies, calls, profile };
}

test("own personalization denial and pending revoke vectors within the profile lock", async () => {
  for (const status of ["denied", "pending"]) {
    const fixture = await fixtures();
    const result = await fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "personalization", status }, fixture.dependencies);
    assert.equal(result.profile_id, id(3)); assert.equal(result.status, status);
    const names = fixture.calls.map(call => call.name);
    assert.ok(names.indexOf("lock") < names.indexOf("save"));
    assert.ok(names.indexOf("save") < names.indexOf("erase"));
    assert.ok(names.indexOf("erase") < names.indexOf("unlock"));
  }
});

test("granting personalization or editing analytics and marketing retains vectors", async () => {
  for (const [purpose, status] of [["personalization", "granted"], ["analytics", "denied"], ["marketing", "pending"]]) {
    const fixture = await fixtures();
    const result = await fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose, status }, fixture.dependencies);
    assert.equal(result.purpose, purpose);
    assert.ok(!fixture.calls.some(call => call.name === "erase"));
  }
});

test("foreign-project profiles and profiles owned by another user are denied", async () => {
  const fixture = await fixtures({ own: false });
  await assert.rejects(fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "personalization", status: "denied" }, fixture.dependencies), error => error.code === "forbidden");
  assert.ok(!fixture.calls.some(call => call.name === "save" || call.name === "lock"));
  fixture.profile.project_id = id(9);
  await assert.rejects(fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "personalization", status: "denied" }, fixture.dependencies), error => error.code === "profile_unavailable");
});

test("an override grant permits another profile's consent and identifier ownership permits self-service", async () => {
  const fixture = await fixtures({ own: false, override: true });
  const result = await fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "analytics", status: "denied" }, fixture.dependencies);
  assert.equal(result.status, "denied");
  assert.ok(fixture.calls.some(call => call.args?.p_permission === "content.consent.override"));
  const own = await fixtures({ own: false });
  own.profile.identifiers = [id(2)];
  assert.equal((await own.saveConsent(own.ctx, { profileId: id(3), purpose: "analytics", status: "granted" }, own.dependencies)).status, "granted");
});

test("lock and write failures fail closed with sanitized unavailable errors", async () => {
  for (const options of [{ lockError: true }, { saveError: true }, { eraseError: true }]) {
    const fixture = await fixtures(options);
    await assert.rejects(fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "personalization", status: "denied" }, fixture.dependencies), error => error.status === 503 && !error.message.includes("private"));
    if (options.lockError) assert.ok(!fixture.calls.some(call => call.name === "save"));
  }
});

test("membership and override RPC errors never authorize a consent write", async () => {
  for (const options of [{ accessError: true }, { own: false, override: true, overrideError: true }]) {
    const fixture = await fixtures(options);
    await assert.rejects(fixture.saveConsent(fixture.ctx, { profileId: id(3), purpose: "personalization", status: "denied" }, fixture.dependencies), error => error.code === "forbidden");
    assert.ok(!fixture.calls.some(call => call.name === "save" || call.name === "lock"));
  }
});

test("invalid purpose, status and authentication are rejected before data access", async () => {
  const fixture = await fixtures();
  for (const input of [{ profileId: id(3), purpose: "unknown", status: "denied" }, { profileId: id(3), purpose: "analytics", status: "unknown" }])
    await assert.rejects(fixture.saveConsent(fixture.ctx, input, fixture.dependencies), error => error.code === "invalid_consent");
  await assert.rejects(fixture.saveConsent({}, { profileId: id(3), purpose: "analytics", status: "denied" }, fixture.dependencies), error => error.status === 401);
  assert.deepEqual(fixture.calls, []);
});
