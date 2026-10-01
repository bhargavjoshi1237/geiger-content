"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileClock } from "lucide-react";

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
  ACTION_MAP,
  formatDateTime,
  shortId,
} from "./constants";
import { listAudit } from "@/lib/supabase/audit";
import { useProject } from "@/context/project-context";

const ENTITY_FILTER_OPTIONS = [
  { value: "all", label: "All entities" },
  { value: "entry", label: "Entries" },
  { value: "collection", label: "Collections" },
  { value: "asset", label: "Assets" },
  { value: "slot", label: "Slots" },
];

function DiffCell({ diff }) {
  const pairs = Object.entries(diff || {}).slice(0, 3);
  if (pairs.length === 0) return <span className="text-sm text-text-secondary">—</span>;
  return (
    <span className="block max-w-64 truncate font-mono text-xs text-text-secondary">
      {pairs.map(([k, v]) => `${k}=${v}`).join(" · ")}
    </span>
  );
}

export function AuditLogsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listAudit(projectId, { limit: 200 }).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return rows.filter((e) => {
      if (entity !== "all" && e.entity !== entity) return false;
      if (
        search &&
        !`${e.actor || ""} ${e.action} ${e.entity} ${e.entityId || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, entity]);

  const pager = usePagination(filtered, { resetKey: `${search}|${entity}` });

  const stats = useMemo(() => {
    const count = (action) => rows.filter((e) => e.action === action).length;
    return [
      { label: "Total events", value: String(rows.length), footer: "Latest 200" },
      { label: "Creates", value: String(count("create")), footer: "New records" },
      { label: "Updates", value: String(count("update")), footer: "Edits saved" },
      { label: "Deletes", value: String(count("delete")), footer: "Soft deletes" },
    ];
  }, [rows]);

  const columns = [
    {
      key: "at",
      header: "When",
      render: (e) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDateTime(e.at)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (e) => (
        <span className="font-mono text-sm text-foreground">
          {shortId(e.actor)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (e) => <StatusPill status={e.action} map={ACTION_MAP} />,
    },
    {
      key: "entity",
      header: "Entity",
      render: (e) => (
        <span className="text-sm capitalize text-text-secondary">
          {e.entity}
        </span>
      ),
    },
    {
      key: "entityId",
      header: "Record",
      render: (e) => (
        <span className="font-mono text-xs text-text-secondary">
          {shortId(e.entityId)}
        </span>
      ),
    },
    {
      key: "diff",
      header: "Change",
      render: (e) => <DiffCell diff={e.diff} />,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Audit Logs"
        description="Append-only history of every create, update, and delete across entries, collections, assets, and slots."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={entity}
            onValueChange={setEntity}
            options={ENTITY_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search actors, actions…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(e) => e.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={FileClock}
                  title={rows.length ? "No events match your filters" : "No audit events yet"}
                  description={
                    rows.length
                      ? "Try clearing the search or picking a different entity."
                      : "Events appear here the moment anyone creates, edits, or deletes content."
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

export default AuditLogsScreen;
