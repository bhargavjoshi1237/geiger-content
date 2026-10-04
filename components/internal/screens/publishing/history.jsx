"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileClock, Undo2, X } from "lucide-react";

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
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { ActionMenu } from "@geiger/ui/action-menu";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { formatDate, formatDateTime } from "./constants";
import { listContent } from "@/lib/supabase/content";
import { listRecentVersions, rollbackTo } from "@/lib/supabase/versions";
import { useProject } from "@/context/project-context";

// Cross-entry version log: every publish snapshot, newest first, restorable as a draft.
export function PublishingHistoryScreen() {
  const [versions, setVersions] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listRecentVersions(projectId, 100), listContent(projectId)]).then(
      ([snaps, rows]) => {
        if (!alive) return;
        setVersions(snaps ?? []);
        const map = {};
        for (const e of rows || []) map[e.id] = e;
        setEntries(map);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [projectId]);

  const scopeOptions = useMemo(
    () => [
      { value: "all", label: "All entries" },
      ...Object.values(entries)
        .sort((a, b) => String(a.title).localeCompare(String(b.title)))
        .slice(0, 30)
        .map((e) => ({ value: e.id, label: e.title || "Untitled" })),
    ],
    [entries],
  );

  const filtered = useMemo(() => {
    return versions.filter((v) => {
      if (scope !== "all" && v.entryId !== scope) return false;
      if (!search) return true;
      const entry = entries[v.entryId];
      return `${entry?.title || ""} v${v.version} ${entry?.slug || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [versions, entries, search, scope]);

  const pager = usePagination(filtered, {
    resetKey: `${search}|${scope}`,
  });

  const stats = useMemo(() => {
    const entryIds = new Set(versions.map((v) => v.entryId));
    const latest = versions[0];
    return [
      { label: "Snapshots", value: String(versions.length), footer: "Across all entries" },
      { label: "Entries", value: String(entryIds.size), footer: "With publish history" },
      {
        label: "Latest publish",
        value: latest ? formatDate(latest.publishedAt || latest.createdAt) || "—" : "—",
        footer: latest ? `${entries[latest.entryId]?.title || "Deleted entry"} · v${latest.version}` : "Nothing published yet",
      },
    ];
  }, [versions, entries]);

  const handleRollback = async (version) => {
    const saved = await rollbackTo(version.entryId, version.id);
    if (!saved) {
      toast.error("Couldn't restore that version.");
      return;
    }
    setEntries((prev) => ({ ...prev, [saved.id]: saved }));
    toast.success(`Restored v${version.version} of "${saved.title}" as a draft.`);
  };

  const columns = [
    {
      key: "when",
      header: "When",
      render: (v) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDateTime(v.publishedAt || v.createdAt) || "—"}
        </span>
      ),
    },
    {
      key: "entry",
      header: "Entry",
      render: (v) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="max-w-sm whitespace-normal break-words font-medium text-foreground">
            {entries[v.entryId]?.title || "Deleted entry"}
          </span>
          <span className="truncate font-mono text-xs text-text-secondary">
            {entries[v.entryId] ? `/${entries[v.entryId].slug}` : v.entryId}
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
      key: "title",
      header: "Snapshot title",
      render: (v) => (
        <span className="text-sm text-text-secondary">
          {v.payload?.title || "—"}
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
        title="Publishing History"
        description="Every publish snapshot across every entry — when it went live and what it contained. Restore any of them as a draft."
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <FilterDropdown
            value={scope}
            onValueChange={setScope}
            options={scopeOptions}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search titles, slugs…"
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
                  icon={FileClock}
                  title={versions.length ? "No history matches your filters" : "No publishing history yet"}
                  description={
                    versions.length
                      ? "Try clearing the search or the entry filter."
                      : "Publish an entry and its snapshot starts the log here."
                  }
                  action={
                    versions.length ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("");
                          setScope("all");
                        }}
                      >
                        <X className="h-4 w-4" /> Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="snapshots" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default PublishingHistoryScreen;
