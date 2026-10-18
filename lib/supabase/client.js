import { createBrowserClient } from '@supabase/ssr';
import { trackSupabaseFetch } from './activity';
import { playgroundHandler } from '@/lib/playground/mode';

// The app's single Supabase entry point. While the landing playground is mounted, every caller gets its
// in-memory seeded client instead (see lib/playground/mode.js).
export function createClient() {
  const playground = playgroundHandler('createClient');
  if (playground) return playground();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: trackSupabaseFetch,
      },
    }
  );
}
