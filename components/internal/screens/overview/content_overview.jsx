"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FilePenLine,
  FilePlus2,
  Hourglass,
  Plus,
  TextQuote,
} from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  RollingNumber,
  ScreenHeader,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { ActivityWidget, StatusMixWidget, PipelineWidget, TypeMixWidget } from "./overview_widgets";
import {
  CONTENT_STATUS_MAP,
  CONTENT_TYPE_MAP,
  formatDate,
} from "../content/constants";
import { getScreenContent } from "../screen_content";
import { listContent } from "@/lib/supabase/content";
import { listCollections } from "@/lib/supabase/collections";
import { listAssets } from "@/lib/supabase/assets";
import { listSlots } from "@/lib/supabase/slots";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { cn } from "@geiger/ui/lib/utils";

const [OVERVIEW_DESCRIPTION] = getScreenContent("Overview");

const DAY_MS = 86400000;
const STALE_DRAFT_DAYS = 30;

const RECENT_COLUMNS = [
  { key: "entry", header: "Entry" },
  { key: "status", header: "Status" },
  { key: "type", header: "Type" },
  { key: "updated", header: "Updated", align: "right" },
];

const toMs = (value) => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

function byRecencyDesc(a, b) {
  return String(b.updatedAt || b.createdAt || "").localeCompare(
    String(a.updatedAt || a.createdAt || ""),
  );
}

function countInWindow(rows, key, start, end) {
  return rows.reduce((n, r) => {
    const ms = toMs(r[key]);
    return ms != null && ms >= start && ms < end ? n + 1 : n;
  }, 0);
}

const pctOf = (part, total) => (total ? Math.round((part / total) * 100) : 0);

// Header-right workspace summary, matching the events overview rhythm.
function WorkspaceSummary({ items }) {
  return (
    <div className="grid w-full grid-cols-3 xl:w-auto">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 flex-col items-center px-4 first:pl-0 last:pr-0 sm:px-6",
            i > 0 && "border-l border-border",
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </span>
          <RollingNumber
            value={item.value}
            className="mt-0.5 text-2xl font-bold text-foreground"
          />
        </div>
      ))}
    </div>
  );
}

function AttentionCard({ items, onOpen }) {
  return (
    <SectionCard
      title="Needs attention"
      description="Work waiting on someone across the workspace."
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              onClick={() => onOpen(item.tab)}
              className="group h-auto min-w-0 justify-start gap-3.5 whitespace-normal rounded-xl p-3.5 text-left hover:bg-surface-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {item.hint}
                </span>
              </span>
              <span className="shrink-0 text-xl font-bold tabular-nums text-foreground">
                {item.value}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-colors group-hover:text-foreground" />
            </Button>
          );
        })}
      </div>
    </SectionCard>
  );
}

export function ContentOverviewScreen() {
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(0);
  const { projectId } = useProject();
  const { setTab, openContentInTab } = useWorkspaceUrl();

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
      setAsOf(Date.now());
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  // The list/detail swap lives on the All Content tab, so open the entry there.
  const openEntry = (id) => {
    if (!projectId || !id) return;
    openContentInTab("All Content", id);
  };

  const summary = [
    { label: "Collections", value: String(collections.length) },
    { label: "Slots", value: String(slots.length) },
    { label: "Assets", value: String(assets.length) },
  ];

  const stats = useMemo(() => {
    const total = entries.length;
    const published = entries.filter((r) => r.status === "Published").length;
    const attention = entries.filter(
      (r) => r.status === "Draft" || r.status === "In review",
    ).length;
    const cur0 = asOf - 30 * DAY_MS;
    const updated = countInWindow(entries, "updatedAt", cur0, asOf);
    return [
      {
        label: "Total entries",
        value: String(total),
        footer: total ? `${pctOf(published, total)}% published` : "No entries yet",
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
        label: "Updated (30d)",
        value: String(asOf ? updated : 0),
        footer: "Entries edited recently",
      },
    ];
  }, [entries, asOf]);

  const recentEntries = useMemo(
    () => [...entries].sort(byRecencyDesc).slice(0, 6),
    [entries],
  );

  const attentionItems = useMemo(() => {
    const count = (fn) => entries.filter(fn).length;
    const staleBefore = asOf - STALE_DRAFT_DAYS * DAY_MS;
    return [
      { key: "review", label: "In review", hint: "Awaiting approval", value: count((r) => r.status === "In review"), icon: ClipboardCheck, tab: "Review Queue" },
      { key: "scheduled", label: "Scheduled", hint: "Queued to go live", value: count((r) => r.status === "Scheduled"), icon: CalendarClock, tab: "Scheduled" },
      { key: "drafts", label: "Drafts", hint: "Not yet submitted", value: count((r) => r.status === "Draft"), icon: FilePenLine, tab: "Drafts" },
      { key: "stale", label: "Stale drafts", hint: `Untouched for ${STALE_DRAFT_DAYS}+ days`, value: asOf ? count((r) => r.status === "Draft" && (toMs(r.updatedAt) ?? asOf) < staleBefore) : 0, icon: Hourglass, tab: "Drafts" },
      { key: "excerpt", label: "Missing excerpt", hint: "No summary for cards and previews", value: count((r) => r.status !== "Archived" && !String(r.excerpt || "").trim()), icon: TextQuote, tab: "All Content" },
      { key: "archived", label: "Archived", hint: "Out of delivery", value: count((r) => r.status === "Archived"), icon: Archive, tab: "Archived" },
    ];
  }, [entries, asOf]);

  const recentColumns = [
    {
      key: "entry",
      header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[14rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground">{r.title || "Untitled"}</span>
          <span className="truncate text-xs text-text-secondary">/{r.slug}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      render: (r) => <StatusPill status={r.status} map={CONTENT_STATUS_MAP} />,
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={CONTENT_TYPE_MAP[r.type]?.variant || "neutral"}>{r.type}</Badge>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      align: "right",
      className: "whitespace-nowrap",
      render: (r) => (
        <span className="text-sm text-text-secondary">{formatDate(r.updatedAt) || "—"}</span>
      ),
    },
  ];

  const empty = !loading && entries.length === 0;

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Overview"
        description={OVERVIEW_DESCRIPTION}
        actions={<WorkspaceSummary items={summary} />}

      />

      <StatsBar stats={stats} />

      {empty ? (
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
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <ActivityWidget entries={entries} asOf={asOf} loading={loading} />
            </div>
            <div className="min-w-0">
              <StatusMixWidget entries={entries} loading={loading} />
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <PipelineWidget entries={entries} loading={loading} />
            <TypeMixWidget entries={entries} loading={loading} />
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">Recent entries</h3>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Newest updates across the workspace.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-text-secondary hover:text-foreground"
                onClick={() => setTab("All Content")}
              >
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {loading ? (
              <TableSkeleton columns={RECENT_COLUMNS} rows={5} />
            ) : (
              <DataTable
                columns={recentColumns}
                data={recentEntries}
                getRowKey={(r) => r.id}
                onRowClick={(r) => openEntry(r.id)}
              />
            )}
          </section>

          {loading ? null : <AttentionCard items={attentionItems} onOpen={setTab} />}
        </>
      )}
    </MainScreenWrapper>
  );
}

export default ContentOverviewScreen;
