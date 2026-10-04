import { createBrowserClient } from '@supabase/ssr';
import { trackSupabaseFetch } from './activity';
import { getDemoClient } from '@/supabase/demo/demo-mode';

// The app's single Supabase entry point. While the landing playground has a demo client registered,
// every caller gets that fixture-backed client instead (see supabase/demo/demo-mode.js).
export function createClient() {
  const demo = getDemoClient();
  if (demo) return demo;

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
