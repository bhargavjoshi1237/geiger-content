"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { tabToSlug, slugToTab } from "@/lib/workspace/tabs";

// Persistent workspace navigation, mirrored to the URL so a refresh (or a shared
// link) lands the user on the exact same place — the active project and sidebar
// tab. Matches the suite pattern (Geiger Events/Flow): the project and tab live
// in the PATH.
//
// Schema:  /project/<uuid>/<tabSlug>
//   - <uuid>    → active project (public.projects). Scopes all data.
//   - <tabSlug> → sidebar tab, lowercased with no spaces/caps
//                 ("All Content" → "allcontent"). The default tab (Overview) is
//                 omitted, so a bare /project/<uuid> is the Overview.
export const DEFAULT_TAB = "Overview";

export function useWorkspaceUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const projectId = params?.projectId || null;
  // The catch-all segment after the project id ([[...rest]]); rest[0] is the tab.
  const rest = params?.rest;
  const tabSlug = Array.isArray(rest) ? rest[0] : rest || null;
  const tab = (tabSlug && slugToTab(tabSlug)) || DEFAULT_TAB;

  // Build the next URL from a partial patch. `undefined` keeps the current
  // value; an explicit value replaces it. The default tab drops from the URL.
  const buildUrl = useCallback(
    (next) => {
      const pid = next.project !== undefined ? next.project : projectId;
      if (!pid) return pathname; // no active project — nothing to navigate to
      const nextTab = next.tab !== undefined ? next.tab : tab;
      const slug = nextTab && nextTab !== DEFAULT_TAB ? tabToSlug(nextTab) : "";
      let path = `/project/${pid}`;
      if (slug) path += `/${slug}`;
      return path;
    },
    [projectId, tab, pathname],
  );

  const apply = useCallback(
    (next) => router.push(buildUrl(next), { scroll: false }),
    [router, buildUrl],
  );

  // Switching the active project resets the sidebar tab to the default.
  const setProject = useCallback(
    (id) => apply({ project: id, tab: DEFAULT_TAB }),
    [apply],
  );
  const setTab = useCallback((next) => apply({ tab: next }), [apply]);

  return { projectId, tab, setProject, setTab };
}
