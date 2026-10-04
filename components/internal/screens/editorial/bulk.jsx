"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileStack, Loader2, X } from "lucide-react";
import { LoadingArea } from "@geiger/ui";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
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
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { listContent, updateContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_FILTER_OPTIONS,
  CONTENT_STATUS_MAP,
  CONTENT_TYPES,
  CONTENT_TYPE_FILTER_OPTIONS,
  CONTENT_TYPE_MAP,
} from "../content/constants";

// Multi-select entries, then batch-update status and/or type.
export function BulkScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
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
      rows.filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (typeFilter !== "all" && r.type !== typeFilter) return false;
        return !search || `${r.title} ${r.slug}`.toLowerCase().includes(search.toLowerCase());
      }),
    [rows, search, statusFilter, typeFilter],
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
      { label: "Entries", value: String(rows.length), footer: "In this project" },
      { label: "In view", value: String(filtered.length), footer: "Matching filters" },
      { label: "Selected", value: String(selected.size), footer: "Kept across filters" },
    ],
    [rows, filtered, selected],
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
      // Reconcile by re-listing rather than per-id rollback.
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
      className: "w-10",
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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground">{r.title}</span>
          <span className="truncate text-xs text-text-secondary">
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

  const hasFilters = Boolean(search) || statusFilter !== "all" || typeFilter !== "all";

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Bulk Editing"
        description="Select entries, then set their status and type in one pass."
      />
      <StatsBar stats={stats} columns={3} />
      <SectionCard
        title="Batch action"
        description={
          selected.size
            ? `${selected.size} selected — the change applies to all of them.`
            : "Nothing selected yet. Tick rows below, or select everything in view."
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Select value={nextStatus || "none"} onValueChange={(v) => setNextStatus(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full" aria-label="New status">
              <SelectValue placeholder="Set status…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Keep status</SelectItem>
              {CONTENT_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={nextType || "none"} onValueChange={(v) => setNextType(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full" aria-label="New type">
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
            className="bg-primary text-primary-foreground hover:bg-primary/90 sm:col-span-2 lg:col-span-1"
            disabled={applying || selected.size === 0}
            onClick={handleApply}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {applying ? "Applying…" : `Apply${selected.size ? ` (${selected.size})` : ""}`}
          </Button>
        </div>
      </SectionCard>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={CONTENT_STATUS_FILTER_OPTIONS}
            height="h-9"
          />
          <FilterDropdown
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={CONTENT_TYPE_FILTER_OPTIONS}
            height="h-9"
          />
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-card px-3 text-sm text-text-secondary">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={toggleAllVisible}
              disabled={filtered.length === 0}
              aria-label="Select all visible entries"
            />
            {allVisibleSelected ? "All in view" : "Select all in view"}
          </label>
          {selected.size > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X className="h-3.5 w-3.5" /> Clear ({selected.size})
            </Button>
          ) : null}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search entries…"
        />
      </Toolbar>
      {loading ? (
        <LoadingArea panel size={48} label="Loading entries" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          onRowClick={(r) => toggle(r.id)}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={FileStack}
                title={rows.length ? "No entries match your filters" : "No entries yet"}
                description={
                  rows.length
                    ? "Try a different search or clear the filters."
                    : "Bulk actions appear once there is content to select."
                }
                action={
                  rows.length && hasFilters ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setTypeFilter("all");
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

export default BulkScreen;
