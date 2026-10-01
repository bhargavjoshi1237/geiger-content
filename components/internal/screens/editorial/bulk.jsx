"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileStack } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent, updateContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_MAP,
  CONTENT_TYPES,
  CONTENT_TYPE_MAP,
} from "../content/constants";

// Multi-select entries, then batch-update status and/or type.
export function BulkScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [nextStatus, setNextStatus] = useState("");
  const [nextType, setNextType] = useState("");
  const [applying, setApplying] = useState(false);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
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
          `${r.title} ${r.slug}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of filtered) next.delete(r.id);
      } else {
        for (const r of filtered) next.add(r.id);
      }
      return next;
    });
  };

  const stats = useMemo(
    () => [
      { label: "Entries", value: String(rows.length) },
      {
        label: "Selected",
        value: String(selected.size),
        footer: "Across all pages",
      },
    ],
    [rows, selected],
  );

  const handleApply = async () => {
    const patch = {};
    if (nextStatus) patch.status = nextStatus;
    if (nextType) patch.type = nextType;
    if (selected.size === 0) {
      toast.error("Select at least one entry first.");
      return;
    }
    if (Object.keys(patch).length === 0) {
      toast.error("Pick a new status and/or type to apply.");
      return;
    }
    setApplying(true);
    const ids = Array.from(selected);
    const prev = rows;
    setRows((rows) => rows.map((r) => (selected.has(r.id) ? { ...r, ...patch } : r)));
    const results = await Promise.all(ids.map((id) => updateContent(id, patch)));
    const failed = results.filter((r) => !r).length;
    if (failed > 0) {
      // Reconcile: reload truth for the failed ids by keeping optimistic for
      // successes and rolling back failures is overkill — re-list instead.
      const fresh = await listContent(projectId);
      if (fresh) setRows(fresh);
      else setRows(prev);
      toast.error(`${failed} of ${ids.length} updates failed — list refreshed.`);
    } else {
      const parts = [];
      if (patch.status) parts.push(`status → ${patch.status}`);
      if (patch.type) parts.push(`type → ${patch.type}`);
      toast.success(`Updated ${ids.length} entries (${parts.join(", ")}).`);
      setSelected(new Set());
    }
    setApplying(false);
  };

  const columns = [
    {
      key: "select",
      header: "",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected.has(r.id)}
            onCheckedChange={() => toggle(r.id)}
            aria-label={`Select ${r.title}`}
          />
        </div>
      ),
    },
    {
      key: "title",
      header: "Entry",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.title}</span>
          <span className="text-xs text-text-secondary">
            /{r.slug} · {r.type}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={CONTENT_STATUS_MAP} />,
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
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Bulk Editing"
        description="Select entries, then set their status and type in one pass."
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search entries…"
        />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <SectionCard
            title="Batch action"
            description={
              selected.size
                ? `${selected.size} selected — applies to all of them.`
                : "Nothing selected yet. Tick rows below (header ticks the view)."
            }
            action={
              <div className="flex items-center gap-2">
                <Select value={nextStatus || "none"} onValueChange={(v) => setNextStatus(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Set status…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keep status</SelectItem>
                    {CONTENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={nextType || "none"} onValueChange={(v) => setNextType(v === "none" ? "" : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Set type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keep type</SelectItem>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={applying || selected.size === 0}
                  onClick={handleApply}
                >
                  {applying ? "Applying…" : `Apply${selected.size ? ` (${selected.size})` : ""}`}
                </Button>
              </div>
            }
          >
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleAllVisible}
                aria-label="Select all visible entries"
              />
              <span className="text-xs text-text-secondary">
                {allVisibleSelected ? "All visible selected" : "Select all visible"}
                {selected.size > 0 ? (
                  <button
                    type="button"
                    className="ml-2 underline underline-offset-2"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear ({selected.size})
                  </button>
                ) : null}
              </span>
            </div>
          </SectionCard>
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            onRowClick={(r) => toggle(r.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={FileStack}
                  title={rows.length ? "No entries match your search" : "No entries yet"}
                  description="Bulk actions appear once there is content to select."
                />
              </div>
            }
          />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default BulkScreen;
