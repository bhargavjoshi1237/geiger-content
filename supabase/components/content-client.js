import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/supabase/demo/demo-mode";

// Shared Supabase helpers for the Content product. The single place that pins
// the base browser client to a Postgres schema, so data files don't repeat the
// createClient().schema(...) dance. Pure data-access only: validate,
// console.error on failure, return null / [] / false — never throw, never
// toast (the screen owns UX).

// True only when both public env vars are present, so every DB call can
// degrade to "no DB" (null/[]/false) instead of crashing. The playground's demo client counts as configured.
export function isSupabaseConfigured() {
  return (
    isDemoMode() ||
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  );
}

// Pre-guarded client pinned to this product's schema (null when unconfigured),
// so every `.from("<table>")` resolves inside the content schema.
export function contentClient() {
  return isSupabaseConfigured() ? createClient().schema("content") : null;
}

// Pre-guarded client for the shared suite tables (public.projects,
// public.roles). Read cross-product tables through this, never contentClient().
export function publicClient() {
  return isSupabaseConfigured() ? createClient().schema("public") : null;
}
