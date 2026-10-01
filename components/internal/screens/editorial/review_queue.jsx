"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, ClipboardCheck, Undo2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { updateContent } from "@/lib/supabase/content";
import { listReviewQueue } from "@/lib/supabase/workflow";
import { useProject } from "@/context/project-context";
import { CONTENT_TYPE_MAP, formatDate } from "../content/constants";

// Approval gate: entries with status "In review". Approve publishes,
// reject sends back to Draft.
export function ReviewQueueScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listReviewQueue(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          `${r.title} ${r.slug} ${r.author}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const stats = useMemo(() => {
    const oldest = rows.reduce((min, r) => {
      const t = r.updatedAt ? new Date(r.updatedAt).getTime() : Infinity;
      return t < min ? t : min;
    }, Infinity);
    return [
      { label: "Awaiting review", value: String(rows.length) },
      {
        label: "Oldest wait",
        value: rows.length && oldest !== Infinity ? formatDate(new Date(oldest).toISOString()) : "—",
        footer: "Longest-waiting entry",
      },
      {
        label: "Types",
        value: String(new Set(rows.map((r) => r.type)).size),
        footer: "Distinct content types",
      },
    ];
  }, [rows]);

  const decide = async (row, approve) => {
    setPendingId(row.id);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    const patch = approve
      ? { status: "Published", publishedAt: new Date().toISOString() }
      : { status: "Draft" };
    const saved = await updateContent(row.id, patch);
    setPendingId(null);
    if (!saved) {
      setRows(prev);
      toast.error(`Couldn't ${approve ? "approve" : "reject"} "${row.title}".`);
      return;
    }
    toast.success(
      approve ? `Published "${row.title}".` : `Sent "${row.title}" back to drafts.`,
    );
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
            {r.author ? ` · ${r.author}` : ""}
            {r.updatedAt ? ` · updated ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={CONTENT_TYPE_MAP[r.type]?.variant || "neutral"}>
          {r.type}
        </Badge>
      ),
    },
    {
      key: "decide",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <div
          className="flex items-center justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="outline"
            disabled={pendingId === r.id}
            onClick={() => decide(r, false)}
          >
            <Undo2 className="h-3 w-3" /> Reject
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={pendingId === r.id}
            onClick={() => decide(r, true)}
          >
            <CheckCheck className="h-3 w-3" /> Approve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Review Queue"
        description="Entries in review, oldest first. Approve to publish, reject to draft."
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search the queue…"
        />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={ClipboardCheck}
                title={rows.length ? "No entries match your search" : "Queue is clear"}
                description="Entries submitted for review land here for approve or reject."
              />
            </div>
          }
        />
      )}
    </MainScreenWrapper>
  );
}

export default ReviewQueueScreen;
