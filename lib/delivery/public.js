import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicFetchOptions } from "./core.mjs";

// Public lists use a short cache; individual pages always read current publication state.
export function publishedClient({ projectId, entryId } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const fetchOptions = publicFetchOptions({ projectId, entryId });
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, ...fetchOptions }) },
  }).schema("content");
}
