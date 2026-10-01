"use client";

import { useEffect } from "react";

import { trackPageView } from "@/lib/supabase/events";

// Fire-and-forget page-view beacon for the public renderer. Renders nothing;
// the collect endpoint + nightly rollups carry the view into Content
// Performance. No Supabase env needed here (trackPageView posts to the
// first-party beacon).
export function PageViewTracker({ entryId = null, projectId = null }) {
  useEffect(() => {
    trackPageView({ entryId, projectId });
  }, [entryId, projectId]);
  return null;
}

export default PageViewTracker;
