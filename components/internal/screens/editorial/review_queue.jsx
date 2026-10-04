"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, ClipboardCheck, Undo2 } from "lucide-react";
import { LoadingArea } from "@geiger/ui";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { updateContent } from "@/lib/supabase/content";
import { listReviewQueue } from "@/lib/supabase/workflow";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { useProject } from "@/context/project-context";
import {
  CONTENT_TYPE_FILTER_OPTIONS,
  CONTENT_TYPE_MAP,
  formatDate,
} from "../content/constants";

// Approval gate: "In review" entries — approve publishes, reject sends back to Draft.
export function ReviewQueueScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
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
      rows.filter((r) => {
        if (type !== "all" && r.type !== type) return false;
        return (
          !search ||
          `${r.title} ${r.slug} ${r.author}`
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }),
    [rows, search, type],
  );

  const stats = useMemo(() => {
    const oldest = rows.reduce((min, r) => {
      const t = r.updatedAt ? new Date(r.updatedAt).getTime() : Infinity;
      return t < min ? t : min;
    }, Infinity);
    return [
      { label: "Awaiting review", value: String(rows.length), footer: "In review now" },
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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground">{r.title}</span>
          <span className="truncate text-xs text-text-secondary">
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
            <Undo2 className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={pendingId === r.id}
            onClick={() => decide(r, true)}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Approve
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
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={type}
            onValueChange={setType}
            options={CONTENT_TYPE_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search the queue…"
        />
      </Toolbar>
      {loading ? (
        <LoadingArea panel size={48} label="Loading review queue" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={ClipboardCheck}
                title={rows.length ? "No entries match your filters" : "Queue is clear"}
                description={
                  rows.length
                    ? "Try a different search or clear the type filter."
                    : "Entries submitted for review land here for approve or reject."
                }
                action={
                  rows.length ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setType("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null
                }
              />
            </div>
          }
        />
      )}
    </MainScreenWrapper>
  );
}

export default ReviewQueueScreen;
