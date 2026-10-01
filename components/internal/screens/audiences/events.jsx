"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";

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
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  EVENT_TYPE_FILTER_OPTIONS,
  EVENT_TYPE_MAP,
  formatDateTime,
} from "./constants";
import { listEvents } from "@/lib/supabase/events";
import { useProject } from "@/context/project-context";

// Append-only event log — intentionally read-only (no create/edit/delete;
// rows are written by the collect beacon, never by hand).
export function EventsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listEvents(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (
        search &&
        !`${r.anonymousId || ""} ${r.userId || ""} ${r.entryId || ""} ${r.type}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, type]);

  const pager = usePagination(filtered, { resetKey: `${search}|${type}` });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    const actors = new Set(
      rows.map((r) => r.userId || r.anonymousId).filter(Boolean),
    );
    return [
      { label: "Total events", value: String(rows.length), footer: `${actors.size} actors` },
      { label: "Page views", value: String(count((r) => r.type === "page_view")), footer: "Content views" },
      { label: "Conversions", value: String(count((r) => r.type === "conversion")), footer: "Attributed outcomes" },
      { label: "Unique actors", value: String(actors.size), footer: "Anonymous + known" },
    ];
  }, [rows]);

  const columns = [
    {
      key: "type",
      header: "Event",
      render: (r) => (
        <StatusPill
          status={r.type}
          map={{
            ...EVENT_TYPE_MAP,
            [r.type]: EVENT_TYPE_MAP[r.type] || {
              label: r.type,
              variant: "neutral",
            },
          }}
        />
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {r.userId || r.anonymousId || "—"}
          </span>
          {r.userId && r.anonymousId ? (
            <span className="text-xs text-text-secondary">
              via {r.anonymousId}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "entry",
      header: "Entry",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {r.entryId ? r.entryId.slice(0, 8) : "—"}
        </span>
      ),
    },
    {
      key: "at",
      header: "Time",
      align: "right",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDateTime(r.at) || "—"}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Behavior Events"
        description="Append-only log of every tracked event. Rows are written by the collect beacon, never by hand."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={type}
            onValueChange={setType}
            options={EVENT_TYPE_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search actors, entries, types…"
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
                  icon={Activity}
                  title={
                    rows.length
                      ? "No events match your filters"
                      : "No events yet"
                  }
                  description={
                    rows.length
                      ? "Try clearing the search or filters."
                      : "Fire the collect beacon (trackPageView) to see the first events land here."
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="events" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default EventsScreen;
