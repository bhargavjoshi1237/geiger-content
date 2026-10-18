// The playground's in-memory database: every seeded table, built lazily the
// first time the playground queries it and kept for the rest of the page
// session, so edits survive tab switches but a reload starts fresh.
//
// Content tables are keyed "content.<table>" (the data layer reaches them through
// `client.schema("content")`); the shared suite tables (projects, roles) are bare.

import { createMemoryDb } from "./memory_client.js";
import { PLAYGROUND_PERSON } from "./cast.js";
import { fixtureTables } from "./seed/fixtures.js";

// Shaped like a Supabase auth user so the app's session parsing reads it
// unchanged.
export const PLAYGROUND_USER = {
  id: PLAYGROUND_PERSON.id,
  email: PLAYGROUND_PERSON.email,
  user_metadata: { full_name: PLAYGROUND_PERSON.name, avatar_url: PLAYGROUND_PERSON.avatar_url },
  app_metadata: {},
  aud: "authenticated",
  role: "authenticated",
};

export const getPlaygroundDb = createMemoryDb(() => fixtureTables());
