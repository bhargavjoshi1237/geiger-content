// Demo mode for the landing playground (ported from geiger-flow's supabase/demo/demo-mode.js).
// While a demo client is registered, createClient() returns it instead of a real Supabase client, so the
// real workspace screens run on fixtures with no session and no network. The flag is module-scoped
// because createClient() is a plain module; registering (not importing) the client keeps the fixtures
// out of every bundle except the playground's.

let demoClient = null;
let writeHandler = null;

export function isDemoMode() {
  return demoClient !== null;
}

export function getDemoClient() {
  return demoClient;
}

// Pass the demo client to arm demo mode, null to disarm it.
export function setDemoClient(client) {
  demoClient = client;
}

// The playground registers here so every rejected write surfaces as one "read-only demo" message.
export function setDemoWriteHandler(handler) {
  writeHandler = handler;
}

export function notifyDemoWrite() {
  if (writeHandler) writeHandler();
}

// A query shape the demo client doesn't implement is a fixture gap, not an empty result — say so loudly.
export function warnDemoGap(where, detail) {
  console.error(`[demo] unsupported query — ${where}`, detail);
}

// Result for features that call the app's own API routes, which have no demo backing.
export const DEMO_UNAVAILABLE = {
  ok: false,
  error: "Not available in the playground. Open the workspace to use it.",
  code: "demo_unavailable",
};
