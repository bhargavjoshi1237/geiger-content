// Shared Supabase config guard. True only when both public env vars are present,
// so every DB call can degrade to "no DB" (null/[]/false) instead of crashing.
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
