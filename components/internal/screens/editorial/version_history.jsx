"use client";

import React, { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Badge } from "@geiger/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { listVersionsByEntry } from "@/lib/supabase/locales";
import { useProject } from "@/context/project-context";
import { formatDateTime } from "./constants";

// Read-only history of entry_versions snapshots for one entry. Rollback
// lives in Compare & Rollback.
export function VersionHistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
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

  // Entry switches reload versions in the handler so the list never shows
  // the previous entry's snapshots.
  function pickVersions(id) {
    setEntryId(id);
    setVersions([]);
    setSelectedVersion(null);
    if (!id) return;
    setLoadingVersions(true);
    listVersionsByEntry(id).then((result) => {
      const list = result ?? [];
      setVersions(list);
      setSelectedVersion(list[0] || null);
      setLoadingVersions(false);
    });
  }

  const selected = useMemo(
    () => entries.find((e) => e.id === entryId) || null,
    [entries, entryId],
  );

  const stats = useMemo(
    () => [
      { label: "Versions", value: String(versions.length) },
      {
        label: "Latest",
        value: versions.length ? `v${versions[0].version}` : "—",
        footer: versions.length ? formatDateTime(versions[0].createdAt) : "No snapshots yet",
      },
      {
        label: "Published snapshots",
        value: String(versions.filter((v) => v.publishedAt).length),
        footer: "Taken at publish time",
      },
    ],
    [versions],
  );

  const columns = [
    {
      key: "version",
      header: "Version",
      render: (v) => (
        <div className="flex items-center gap-2">
          <Badge variant={v.id === selectedVersion?.id ? "info" : "neutral"}>
            v{v.version}
          </Badge>
          {v.publishedAt ? <Badge variant="success">published</Badge> : null}
        </div>
      ),
    },
    {
      key: "created",
      header: "Snapshotted",
      render: (v) => (
        <span className="text-sm text-text-secondary">
          {formatDateTime(v.createdAt)}
        </span>
      ),
    },
    {
      key: "summary",
      header: "Payload",
      render: (v) => (
        <span className="max-w-72 truncate font-mono text-xs text-text-secondary">
          {v.payload?.title || "—"}
          {v.payload?.data ? ` · ${Object.keys(v.payload.data).length} fields` : ""}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Version History"
        description="Snapshotted payloads per entry. Compare or roll back under Compare & Rollback."
        actions={
          <Select value={entryId} onValueChange={pickVersions}>
            <SelectTrigger className="w-64">
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
        }
      />
      <StatsBar stats={stats} />
      {loading || loadingVersions ? (
        <TableSkeleton columns={columns} />
      ) : !selected ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={History}
            title="No entries yet"
            description="Versions appear once entries are saved from the Structured Editor."
          />
        </div>
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={versions}
            getRowKey={(v) => v.id}
            onRowClick={setSelectedVersion}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={History}
                  title={`No versions of "${selected.title}" yet`}
                  description="Saving from the Structured Editor snapshots a version each time."
                />
              </div>
            }
          />
          {selectedVersion ? (
            <SectionCard
              title={`Payload · v${selectedVersion.version}`}
              description={`Snapshotted ${formatDateTime(selectedVersion.createdAt)}.`}
            >
              <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-card p-3 font-mono text-xs text-text-secondary">
                {JSON.stringify(selectedVersion.payload, null, 2)}
              </pre>
            </SectionCard>
          ) : null}
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default VersionHistoryScreen;
