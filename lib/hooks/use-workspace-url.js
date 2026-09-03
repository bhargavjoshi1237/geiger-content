"use client";

import { createContext, useCallback, useContext } from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
  useParams,
} from "next/navigation";
import { tabToSlug, slugToTab } from "@/lib/workspace/tabs";

// Persistent workspace navigation, mirrored to the URL so a refresh (or a shared
// link) lands the user on the exact same place — the active project, sidebar
// tab, open record, and editor section. Mirrors geiger-events'
// use-workspace-url: the project and tab live in the PATH, the open record and
// editor section live in the query string.
//
// Schema:  /project/<uuid>/<tabSlug>?content=<id>&collection=<id>&asset=<id>&slot=<id>&section=<key>
//   - <uuid>    → active project (public.projects). Scopes all data.
//   - <tabSlug> → sidebar tab, lowercased with no spaces/caps
//                 ("All Content" → "allcontent"). The default tab (Overview) is
//                 omitted, so a bare /project/<uuid> is the Overview.
//   - ?content=/?collection=/?asset=/?slot= → open record id (list swaps to its
//     detail screen).
//   - ?section= → editor section key (synced by EditorSections).

export const DEFAULT_TAB = "Overview";
export const DEFAULT_SECTION = "overview";

export const WorkspaceUrlContext = createContext(null);

export function useWorkspaceUrl() {
  const override = useContext(WorkspaceUrlContext);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId = params?.projectId || null;
  // The catch-all segment after the project id ([[...rest]]); rest[0] is the tab.
  const rest = params?.rest;
  const tabSlug = Array.isArray(rest) ? rest[0] : rest || null;
  const tab = (tabSlug && slugToTab(tabSlug)) || DEFAULT_TAB;

  const contentId = searchParams.get("content") || null;
  const collectionId = searchParams.get("collection") || null;
  const assetId = searchParams.get("asset") || null;
  const slotId = searchParams.get("slot") || null;
  const section = searchParams.get("section") || DEFAULT_SECTION;

  const buildUrl = useCallback(
    (next) => {
      const pid = next.project !== undefined ? next.project : projectId;
      if (!pid) return pathname; // no active project — nothing to navigate to
      const nextTab = next.tab !== undefined ? next.tab : tab;
      const slug = nextTab && nextTab !== DEFAULT_TAB ? tabToSlug(nextTab) : "";
      let path = `/project/${pid}`;
      if (slug) path += `/${slug}`;

      const qp = new URLSearchParams();
      const ct = next.content !== undefined ? next.content : contentId;
      const co = next.collection !== undefined ? next.collection : collectionId;
      const as = next.asset !== undefined ? next.asset : assetId;
      const sl = next.slot !== undefined ? next.slot : slotId;
      const sec = next.section !== undefined ? next.section : section;
      if (ct) qp.set("content", ct);
      if (co) qp.set("collection", co);
      if (as) qp.set("asset", as);
      if (sl) qp.set("slot", sl);
      if (sec && sec !== DEFAULT_SECTION) qp.set("section", sec);

      const qs = qp.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [projectId, tab, contentId, collectionId, assetId, slotId, section, pathname],
  );

  const apply = useCallback(
    (next, { replace = false } = {}) => {
      const url = buildUrl(next);
      const movesPath =
        next.project !== undefined || next.tab !== undefined || !projectId;
      if (movesPath) {
        router.push(url, { scroll: false });
        return;
      }
      const at = url.indexOf("?");
      const href = `${window.location.pathname}${at === -1 ? "" : url.slice(at)}`;
      if (replace) window.history.replaceState(null, "", href);
      else window.history.pushState(null, "", href);
    },
    [router, buildUrl, projectId],
  );

  // Switching the active project resets the sidebar tab to the default.
  const setProject = useCallback(
    (id) =>
      apply({
        project: id,
        tab: DEFAULT_TAB,
        content: null,
        collection: null,
        asset: null,
        slot: null,
        section: null,
      }),
    [apply],
  );
  const setTab = useCallback(
    (next) =>
      apply({
        tab: next,
        content: null,
        collection: null,
        asset: null,
        slot: null,
        section: null,
      }),
    [apply],
  );
  const openContent = useCallback(
    (id) => apply({ content: id, section: null }),
    [apply],
  );
  const closeContent = useCallback(
    () => apply({ content: null, section: null }),
    [apply],
  );
  const openCollection = useCallback(
    (id) => apply({ collection: id, section: null }),
    [apply],
  );
  const closeCollection = useCallback(
    () => apply({ collection: null, section: null }),
    [apply],
  );
  const openAsset = useCallback(
    (id) => apply({ asset: id, section: null }),
    [apply],
  );
  const closeAsset = useCallback(
    () => apply({ asset: null, section: null }),
    [apply],
  );
  const openSlot = useCallback(
    (id) => apply({ slot: id, section: null }),
    [apply],
  );
  const closeSlot = useCallback(
    () => apply({ slot: null, section: null }),
    [apply],
  );
  const setSection = useCallback(
    (next) => apply({ section: next }, { replace: true }),
    [apply],
  );

  if (override) return override;

  return {
    projectId,
    tab,
    contentId,
    collectionId,
    assetId,
    slotId,
    section,
    setProject,
    setTab,
    openContent,
    closeContent,
    openCollection,
    closeCollection,
    openAsset,
    closeAsset,
    openSlot,
    closeSlot,
    setSection,
  };
}
