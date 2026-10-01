import test from "node:test";
import assert from "node:assert/strict";
import { authorizeProject, assertSameOrigin } from "../lib/vector/auth.mjs";

const projectId = "22222222-2222-4222-8222-222222222222";
const client = (access = true, permission = true, user = { id: "u" }) => ({
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  schema: () => ({
    rpc: async (name) => ({
      data: name === "can_access_project" ? access : permission,
      error: null,
    }),
  }),
});

test("missing sessions, foreign projects, and missing permissions are rejected", async () => {
  await assert.rejects(
    authorizeProject(client(true, true, null), projectId),
    (e) => e.status === 401,
  );
  await assert.rejects(
    authorizeProject(client(false), projectId),
    (e) => e.status === 403,
  );
  await assert.rejects(
    authorizeProject(client(true, false), projectId),
    (e) => e.status === 403,
  );
  await assert.rejects(
    authorizeProject(client(), "injected"),
    (e) => e.status === 400,
  );
  const result = await authorizeProject(client(), projectId);
  assert.equal(result.projectId, projectId);
});

test("RPC errors fail closed even if a truthy result is present", async () => {
  const broken = client();
  broken.schema = () => ({
    rpc: async () => ({ data: true, error: { message: "failed" } }),
  });
  await assert.rejects(
    authorizeProject(broken, projectId),
    (e) => e.status === 403,
  );
});

test("write origin validation uses the public host when Next reconstructs an internal URL", () => {
  const request = (origin, host = "127.0.0.1:3010") => new Request("http://localhost:3010/api/vector/sync", {
    headers: { host, ...(origin ? { origin } : {}) },
  });
  assert.doesNotThrow(() => assertSameOrigin(request("http://127.0.0.1:3010")));
  assert.doesNotThrow(() => assertSameOrigin(request(null)));
  assert.throws(() => assertSameOrigin(request("https://evil.example")), e => e.status === 403);
  assert.throws(() => assertSameOrigin(request("http://localhost:3010")), e => e.status === 403);
  assert.throws(() => assertSameOrigin(request("https://127.0.0.1:3010")), e => e.status === 403);
  assert.doesNotThrow(() => assertSameOrigin(request("https://studio.example"), "https://studio.example"));
});
