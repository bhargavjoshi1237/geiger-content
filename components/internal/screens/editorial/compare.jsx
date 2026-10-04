"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GitCompareArrows, Undo2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent, updateContent } from "@/lib/supabase/content";
import { listVersionsByEntry } from "@/lib/supabase/locales";
import { useProject } from "@/context/project-context";
import { diffPayloads } from "./constants";

const DIFF_KIND_MAP = {
  added: { label: "Added", variant: "success" },
  removed: { label: "Removed", variant: "danger" },
  changed: { label: "Changed", variant: "info" },
};

// Naive JSON diff between two entry_versions, with rollback to the older one.
export function CompareScreen() {
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [versions, setVersions] = useState([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      const list = result ?? [];
      setEntries(list);
      setLoading(false);
      pickVersions(list[0]?.id || "");
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Entry switches reload versions in the handler so the diff never mixes
  // two entries' snapshots.
  function pickVersions(id) {
    setEntryId(id);
    setVersions([]);
    setLeftId("");
    setRightId("");
    if (!id) return;
    setLoadingVersions(true);
    listVersionsByEntry(id).then((result) => {
      const list = result ?? [];
      setVersions(list);
      setLeftId(list[1]?.id || list[0]?.id || "");
      setRightId(list[0]?.id || "");
      setLoadingVersions(false);
    });
  }

  const selected = useMemo(
    () => entries.find((e) => e.id === entryId) || null,
    [entries, entryId],
  );
  const left = useMemo(
    () => versions.find((v) => v.id === leftId) || null,
    [versions, leftId],
  );
  const right = useMemo(
    () => versions.find((v) => v.id === rightId) || null,
    [versions, rightId],
  );

  const diff = useMemo(
    () =>
      left && right && left.id !== right.id
        ? diffPayloads(left.payload, right.payload)
        : [],
    [left, right],
  );

  const stats = useMemo(
    () => [
      { label: "Versions", value: String(versions.length) },
      {
        label: "Differences",
        value: left && right && left.id !== right.id ? String(diff.length) : "—",
        footer:
          left && right
            ? `v${left.version} → v${right.version}`
            : "Pick two versions",
      },
    ],
    [versions, diff, left, right],
  );

  const handleRollback = async () => {
    if (!left || !selected) return;
    setConfirmOpen(false);
    setRollingBack(true);
    // Apply the snapshot's known keys back onto the live entry.
    const patch = {};
    for (const key of ["title", "slug", "excerpt", "body", "data"]) {
      if (left.payload && key in left.payload) patch[key] = left.payload[key];
    }
    if (Object.keys(patch).length === 0) {
      setRollingBack(false);
      toast.error("That snapshot has nothing to restore.");
      return;
    }
    const saved = await updateContent(selected.id, patch);
    setRollingBack(false);
    if (!saved) {
      toast.error("Couldn't roll back the entry.");
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    toast.success(`Rolled "${saved.title}" back to v${left.version}.`);
  };

  const columns = [
    {
      key: "path",
      header: "Path",
      render: (r) => (
        <span className="font-mono text-xs text-foreground">{r.path}</span>
      ),
    },
    {
      key: "kind",
      header: "Change",
      render: (r) => (
        <Badge variant={DIFF_KIND_MAP[r.kind]?.variant || "neutral"}>
          {DIFF_KIND_MAP[r.kind]?.label || r.kind}
        </Badge>
      ),
    },
    {
      key: "before",
      header: left ? `v${left.version}` : "Before",
      render: (r) => (
        <span className="block max-w-56 truncate font-mono text-xs text-text-secondary" title={r.before}>
          {r.before}
        </span>
      ),
    },
    {
      key: "after",
      header: right ? `v${right.version}` : "After",
      render: (r) => (
        <span className="block max-w-56 truncate font-mono text-xs text-text-secondary" title={r.after}>
          {r.after}
        </span>
      ),
    },
  ];

  const versionLabel = (v) =>
    `v${v.version}${v.publishedAt ? " · published" : ""}`;

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Compare & Rollback"
        description="Diff two snapshots, then restore the older one onto the live entry."
        actions={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <Select value={entryId} onValueChange={pickVersions}>
              <SelectTrigger className="w-full min-w-0 sm:w-56" aria-label="Entry to compare">
                <SelectValue placeholder="Select an entry" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!left || rollingBack}
              onClick={() => setConfirmOpen(true)}
            >
              <Undo2 className="h-4 w-4" />
              {rollingBack ? "Rolling back…" : left ? `Restore v${left.version}` : "Restore"}
            </Button>
          </div>
        }
      />
      <StatsBar stats={stats} />
      {loading || loadingVersions ? (
        <TableSkeleton columns={columns} />
      ) : !selected ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={GitCompareArrows}
            title="No entries yet"
            description="Versions appear once entries are saved from the Structured Editor."
          />
        </div>
      ) : versions.length < 2 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={GitCompareArrows}
            title="Need two versions to compare"
            description={`"${selected.title}" has ${versions.length} snapshot${versions.length === 1 ? "" : "s"} — save again from the Structured Editor.`}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <SectionCard bare
            title="Versions"
            description="Left is the baseline; rollback restores it."
            action={
              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Select value={leftId} onValueChange={setLeftId}>
                  <SelectTrigger className="w-full min-w-0 sm:w-44" aria-label="Baseline version">
                    <SelectValue placeholder="Baseline" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {versionLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="hidden text-xs text-text-secondary sm:inline" aria-hidden="true">→</span>
                <Select value={rightId} onValueChange={setRightId}>
                  <SelectTrigger className="w-full min-w-0 sm:w-44" aria-label="Comparison version">
                    <SelectValue placeholder="Compare to" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {versionLabel(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <DataTable
              columns={columns}
              data={diff}
              getRowKey={(r) => `${r.path}:${r.kind}`}
              empty={
                <p className="text-sm text-text-secondary">
                  {left && right && left.id === right.id
                    ? "Pick two different versions to diff."
                    : "No differences — the payloads are identical."}
                </p>
              }
            />
          </SectionCard>
        </div>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:p-6 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore v{left?.version}?</DialogTitle>
            <DialogDescription>
              This overwrites the live entry&apos;s title, slug, excerpt, body,
              and data with the snapshot. The current state is not snapshotted
              first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleRollback}
            >
              <Undo2 className="h-4 w-4" /> Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default CompareScreen;
