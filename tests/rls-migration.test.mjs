import test from "node:test";
import assert from "node:assert/strict";
import { verificationOutcome } from "../scripts/verify-rls.mjs";

test("baseline records legacy security leaks while strict verification fails them", () => {
  assert.equal(verificationOutcome(false, { baseline: true, security: true }), "LEGACY");
  assert.equal(verificationOutcome(false, { security: true }), "FAIL");
  assert.equal(verificationOutcome(true, { baseline: true, security: true }), "PASS");
});

test("baseline never tolerates broken signed-in workspace flows", () => {
  assert.equal(verificationOutcome(false, { baseline: true }), "FAIL");
  assert.equal(verificationOutcome(true), "PASS");
});

test("missing new infrastructure is skipped only before migration", () => {
  assert.equal(verificationOutcome(false, { baseline: true, missing: true }), "SKIP");
  assert.equal(verificationOutcome(false, { missing: true }), "FAIL");
});
