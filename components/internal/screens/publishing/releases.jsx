"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Undo2, X } from "lucide-react";

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
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import { ActionMenu } from "@geiger/ui/action-menu";
import { formatDate, formatDateTime } from "./constants";
import { listContent } from "@/lib/supabase/content";
import { listRecentVersions, rollbackTo } from "@/lib/supabase/versions";
import { useProject } from "@/context/project-context";

// Rollback surface: restoring a snapshot rewrites the entry as a Draft (never auto-publishes).
export function ReleasesScreen() {
  const [versions, setVersions] = useState([]);
  const [titles, setTitles] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listRecentVersions(projectId, 100), listContent(projectId)]).then(
      ([snaps, entries]) => {
        if (!alive) return;
        setVersions(snaps ?? []);
        const map = {};
        for (const e of entries || []) map[e.id] = e.title;
        setTitles(map);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return versions.filter((v) => {
      if (!search) return true;
      const title = titles[v.entryId] || "";
      return `${title} v${v.version}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [versions, titles, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const entries = new Set(versions.map((v) => v.entryId));
    const latest = versions[0]?.createdAt || null;
    return [
      { label: "Total versions", value: String(versions.length), footer: "Publish snapshots" },
      { label: "Versioned entries", value: String(entries.size), footer: "Entries with history" },
      {
        label: "Latest snapshot",
        value: latest ? formatDate(latest) || "—" : "—",
        footer: latest ? formatDateTime(latest) : "No snapshots yet",
      },
    ];
  }, [versions]);

  const handleRollback = async (version) => {
    const saved = await rollbackTo(version.entryId, version.id);
    if (!saved) {
      toast.error("Couldn't restore that version.");
      return;
    }
    setTitles((prev) => ({ ...prev, [saved.id]: saved.title }));
    toast.success(`Restored v${version.version} as a draft.`);
  };

  const columns = [
    {
      key: "entry",
      header: "Entry",
      render: (v) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="max-w-sm whitespace-normal break-words font-medium text-foreground">
            {titles[v.entryId] || "Deleted entry"}
          </span>
          <span className="whitespace-nowrap text-xs text-text-secondary">
            {formatDateTime(v.publishedAt || v.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "version",
      header: "Version",
      render: (v) => <Badge variant="neutral">v{v.version}</Badge>,
    },
    {
      key: "payload",
      header: "Snapshot",
      render: (v) => (
        <span className="block max-w-sm whitespace-normal break-words text-sm text-text-secondary">
          {v.payload?.title || titles[v.entryId] || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (v) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            label={`Actions for version ${v.version}`}
            items={[
              { icon: Undo2, label: "Restore as draft", onSelect: () => handleRollback(v) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Releases"
        description="Every publish snapshot — what went live, when, and what it contained. Restore any version as a draft."
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search entries, versions…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(v) => v.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Boxes}
                  title={versions.length ? "No versions match your filters" : "No releases yet"}
                  description={
                    versions.length
                      ? "Try clearing the search."
                      : "Publish an entry from the queue and its first snapshot lands here."
                  }
                  action={
                    versions.length ? (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        <X className="h-4 w-4" /> Clear search
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="versions" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default ReleasesScreen;
