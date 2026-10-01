import "server-only";
import { createClient } from "@supabase/supabase-js";

// Only public published reads use this cache; signed-in workspace reads stay uncached.
export function publishedClient({ projectId, entryId } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const tags = ["content-public", ...(projectId ? [`content-project:${projectId}`] : []), ...(entryId ? [`content-entry:${entryId}`] : [])];
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "force-cache", next: { revalidate: 60, tags } }) },
  }).schema("content");
}
