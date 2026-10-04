"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { LoadingArea } from "@geiger/ui";
import { Button } from "@geiger/ui/button";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { useProject } from "@/context/project-context";

// Read-only merge of webhook deliveries (Phase 2) and the audit log (Phase 4); a missing table degrades to no rows.
async function fetchRecent(table, orderColumn) {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = contentClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from(table)
      .select("*")
      .order(orderColumn, { ascending: false })
      .limit(100);
    if (error) {
      console.error(`[logs.${table}]`, error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error(`[logs.${table}]`, e);
    return [];
  }
}

const KIND_MAP = {
  Webhook: { label: "Webhook", variant: "info", dotClass: "bg-sky-400" },
  Audit: { label: "Audit", variant: "purple", dotClass: "bg-violet-300" },
};

const KIND_FILTER_OPTIONS = [
  { value: "all", label: "All kinds" },
  { value: "Webhook", label: "Webhooks" },
  { value: "Audit", label: "Audits" },
];

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function LogsScreen() {
  const { projectId } = useProject();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [deliveries, audits] = await Promise.all([
        fetchRecent("webhook_deliveries", "created_at"),
        fetchRecent("audit_log", "created_at"),
      ]);
      if (!alive) return;
      const merged = [
        ...deliveries.map((d) => ({
          id: `webhook:${d.id}`,
          kind: "Webhook",
          projectId: d.project_id ?? null,
          summary:
            d.url || d.event || d.webhook_id
              ? `${d.event || "event"} → ${d.url || d.webhook_id}`
              : "Webhook delivery",
          status: d.status || (d.succeeded === false ? "failed" : "delivered"),
          at: d.delivered_at || d.created_at,
        })),
        ...audits.map((a) => ({
          id: `audit:${a.id}`,
          kind: "Audit",
          projectId: a.project_id ?? null,
          summary:
            a.action && a.entity
              ? `${a.action} ${a.entity}`
              : a.action || "Audit event",
          status: a.action || "recorded",
          at: a.at || a.created_at,
        })),
      ]
        .filter((r) => !projectId || !r.projectId || r.projectId === projectId)
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
        .slice(0, 100);
      setRows(merged);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (q && !`${r.kind} ${r.summary} ${r.status}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, kind]);

  const pager = usePagination(filtered, { resetKey: `${search}|${kind}` });
  const hasFilters = Boolean(search.trim()) || kind !== "all";

  const stats = useMemo(
    () => [
      { label: "Events", value: String(rows.length), footer: "Last 100 merged" },
      {
        label: "Webhooks",
        value: String(rows.filter((r) => r.kind === "Webhook").length),
        footer: "Delivery attempts",
      },
      {
        label: "Audits",
        value: String(rows.filter((r) => r.kind === "Audit").length),
        footer: "Recorded actions",
      },
    ],
    [rows],
  );

  const columns = [
    {
      key: "kind",
      header: "Kind",
      render: (r) => <StatusPill status={r.kind} map={KIND_MAP} />,
    },
    {
      key: "summary",
      header: "Event",
      render: (r) => (
        <div className="flex min-w-0 max-w-md flex-col gap-1">
          <span className="truncate font-medium text-foreground" title={r.summary}>
            {r.summary}
          </span>
          <span className="truncate text-xs text-text-secondary">{r.status}</span>
        </div>
      ),
    },
    {
      key: "at",
      header: "At",
      align: "right",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatTime(r.at)}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Logs & Usage"
        description="Recent webhook deliveries and audit events, newest first. Read-only."
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <FilterDropdown
          value={kind}
          onValueChange={setKind}
          options={KIND_FILTER_OPTIONS}
          height="h-9"
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search logs…"
        />
      </Toolbar>

      {loading ? (
        <LoadingArea panel size={48} label="Loading logs" />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                {rows.length > 0 && hasFilters ? (
                  <EmptyState
                    icon={Activity}
                    title="No events match your filters"
                    description="Try a different kind or clear the search."
                    action={
                      <Button
                        variant="outline"
                        className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                        onClick={() => {
                          setSearch("");
                          setKind("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="No log events yet"
                    description="Webhook deliveries land with Phase 2 and audit events with Phase 4 — this view lights up automatically."
                  />
                )}
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="events" />
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default LogsScreen;
