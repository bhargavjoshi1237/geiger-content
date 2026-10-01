"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ListChecks, Rocket, Undo2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { ActionMenu } from "@geiger/ui/action-menu";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  QUEUE_STATUS_FILTER_OPTIONS,
  QUEUE_STATUS_MAP,
  formatDate,
} from "./constants";
import { listContent } from "@/lib/supabase/content";
import { publishEntry, unpublishEntry } from "@/lib/supabase/publishing";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

// Entries awaiting (or holding) a live slot: Scheduled, In review, and
// Published rows that can be pulled back. Publish/Unpublish flip status via
// the app-layer pipeline (status update + version snapshot + webhooks).
const QUEUE_STATUSES = ["Scheduled", "In review", "Published"];

export function PublishingQueueScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setRows((result || []).filter((r) => QUEUE_STATUSES.includes(r.status)));
      setLoading(false);
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (
        search &&
        !`${r.title} ${r.slug} ${r.excerpt}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, status]);

  const pager = usePagination(filtered, {
    resetKey: `${search}|${status}`,
  });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    const due = rows.filter(
      (r) => r.status === "Scheduled" && r.scheduledAt && new Date(r.scheduledAt) <= new Date(),
    ).length;
    return [
      { label: "In queue", value: String(rows.length), footer: `${due} due now` },
      { label: "Scheduled", value: String(count((r) => r.status === "Scheduled")), footer: "Has a go-live date" },
      { label: "In review", value: String(count((r) => r.status === "In review")), footer: "Awaiting approval" },
      { label: "Published", value: String(count((r) => r.status === "Published")), footer: "Live in delivery" },
    ];
  }, [rows]);

  const handlePublish = async (entry) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) =>
        r.id === entry.id
          ? { ...r, status: "Published", publishedAt: new Date().toISOString() }
          : r,
      ),
    );
    const saved = await publishEntry(entry.id, userId);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't publish the entry.");
      return;
    }
    setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.title}" is live.`);
  };

  const handleUnpublish = async (entry) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) => (r.id === entry.id ? { ...r, status: "Draft" } : r)),
    );
    const saved = await unpublishEntry(entry.id);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't unpublish the entry.");
      return;
    }
    // Unpublished rows leave the queue (they fall back to Draft).
    setRows((rows) => rows.filter((r) => r.id !== saved.id));
    toast.success(`"${saved.title}" pulled back to draft.`);
  };

  const handleViewPage = (entry) => {
    if (typeof window !== "undefined") {
      window.open(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/c/${entry.id}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const columns = [
    {
      key: "title",
      header: "Entry",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.title}</span>
          <span className="text-xs text-text-secondary">
            /{r.slug} · {r.type}
            {r.scheduledAt ? ` · goes live ${formatDate(r.scheduledAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={QUEUE_STATUS_MAP} />,
    },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(r.scheduledAt || r.publishedAt || r.updatedAt) || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            label={`Actions for ${r.title}`}
            items={[
              ...(r.status !== "Published"
                ? [{ icon: Rocket, label: "Publish now", onSelect: () => handlePublish(r) }]
                : []),
              ...(r.status === "Published"
                ? [{ icon: Undo2, label: "Unpublish", onSelect: () => handleUnpublish(r) }]
                : []),
              { icon: ExternalLink, label: "View page", onSelect: () => handleViewPage(r) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Publishing Queue"
        description="Entries waiting to go live — scheduled, in review, and currently published. Publishing flips status, snapshots a version, and fires webhooks."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={status}
            onValueChange={setStatus}
            options={QUEUE_STATUS_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search queued entries…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={ListChecks}
                  title={rows.length ? "No entries match your filters" : "Queue is clear"}
                  description={
                    rows.length
                      ? "Try clearing the search or filters."
                      : "Nothing is scheduled or in review. Drafts appear here once they are submitted or scheduled."
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="entries" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default PublishingQueueScreen;
