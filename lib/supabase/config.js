// Shared Supabase config guard. True only when both public env vars are present,
// so every DB call can degrade to "no DB" (null/[]/false) instead of crashing.
//
// Backwards-compat re-export shim — new code imports from
// "@/supabase/components/content-client" directly.
export { isSupabaseConfigured } from "@/supabase/components/content-client";
