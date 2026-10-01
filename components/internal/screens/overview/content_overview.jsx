"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Blocks,
  CalendarClock,
  FilePlus2,
  FolderOpen,
  Plus,
} from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { CONTENT_STATUS_MAP, formatDate } from "../content/constants";
import { getScreenContent } from "../screen_content";
import { listContent } from "@/lib/supabase/content";
import { listCollections } from "@/lib/supabase/collections";
import { listAssets } from "@/lib/supabase/assets";
import { listSlots } from "@/lib/supabase/slots";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { tabToSlug } from "@/lib/workspace/tabs";

const [OVERVIEW_DESCRIPTION] = getScreenContent("Overview");

const SKELETON_COLUMNS = [
  { key: "entry", header: "Entry" },
  { key: "status", header: "Status" },
  { key: "updated", header: "Updated" },
];

function byRecencyDesc(a, b) {
  return String(b.updatedAt || b.createdAt || "").localeCompare(
    String(a.updatedAt || a.createdAt || ""),
  );
}

function EntryRow({ entry, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(entry.id)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-hover"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.title}
          </p>
          <p className="truncate text-xs text-text-secondary">
            /{entry.slug} · {entry.type}
            {entry.updatedAt ? ` · ${formatDate(entry.updatedAt)}` : ""}
          </p>
        </div>
        <StatusPill
          status={entry.status}
          map={CONTENT_STATUS_MAP}
          className="shrink-0"
        />
      </button>
    </li>
  );
}

export function ContentOverviewScreen() {
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const { projectId } = useProject();
  const { setTab } = useWorkspaceUrl();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    Promise.all([
      listContent(projectId),
      listCollections(projectId),
      listAssets(projectId),
      listSlots(projectId),
    ]).then(([entryRows, collectionRows, assetRows, slotRows]) => {
      if (!alive) return;
      setEntries(entryRows ?? []);
      setCollections(collectionRows ?? []);
      setAssets(assetRows ?? []);
      setSlots(slotRows ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  // The list/detail swap lives on the All Content tab (?content=<id>), so open
  // an entry by deep-linking there — setTab alone would drop the open record.
  const openEntry = (id) => {
    if (!projectId || !id) return;
    router.push(
      `/project/${projectId}/${tabToSlug("All Content")}?content=${encodeURIComponent(id)}`,
    );
  };

  const stats = useMemo(() => {
    const total = entries.length;
    const published = entries.filter((r) => r.status === "Published").length;
    const attention = entries.filter(
      (r) => r.status === "Draft" || r.status === "In review",
    ).length;
    const pct = total ? Math.round((published / total) * 100) : 0;
    return [
      {
        label: "Total entries",
        value: String(total),
        footer: total ? `${pct}% published` : "No entries yet",
      },
      {
        label: "Published",
        value: String(published),
        footer: "Live in delivery",
      },
      {
        label: "Drafts & in review",
        value: String(attention),
        footer: "Needs attention",
      },
      {
        label: "Assets",
        value: String(assets.length),
        footer: "Media files",
      },
    ];
  }, [entries, assets.length]);

  const recentEntries = useMemo(
    () => [...entries].sort(byRecencyDesc).slice(0, 5),
    [entries],
  );

  const needsAttention = useMemo(
    () =>
      entries
        .filter((r) => r.status === "In review" || r.scheduledAt)
        .sort(byRecencyDesc)
        .slice(0, 5),
    [entries],
  );

  const scheduledCount = useMemo(
    () => entries.filter((r) => r.scheduledAt).length,
    [entries],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Overview"
        description={OVERVIEW_DESCRIPTION}
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setTab("All Content")}
          >
            View all content <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <StatsBar stats={stats} />

      {loading ? (
        <TableSkeleton columns={SKELETON_COLUMNS} />
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FilePlus2}
            title="No content yet"
            description="Create your first entry to populate this workspace."
            action={
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setTab("All Content")}
              >
                <Plus className="h-4 w-4" /> Go to All Content
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              {collections.length} collections
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Blocks className="h-3.5 w-3.5" />
              {slots.length} slots
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {scheduledCount} scheduled
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Recent entries"
              description="Newest updates across the workspace."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary hover:text-foreground"
                  onClick={() => setTab("All Content")}
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              }
            >
              {recentEntries.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nothing here yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentEntries.map((r) => (
                    <EntryRow key={r.id} entry={r} onOpen={openEntry} />
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Needs attention"
              description="Entries in review or waiting on a schedule."
            >
              {needsAttention.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nothing waiting — every entry is published or still drafting.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {needsAttention.map((r) => (
                    <EntryRow key={r.id} entry={r} onOpen={openEntry} />
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </MainScreenWrapper>
  );
}

export default ContentOverviewScreen;
