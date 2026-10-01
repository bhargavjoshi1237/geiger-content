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
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { useProject } from "@/context/project-context";

// Merged read-only view over recent webhook deliveries (Phase 2:
// `content.webhook_deliveries`) and the audit trail (Phase 4:
// `content.audit_log`). Both tables may not exist yet — a missing table
// degrades to "no rows", never a crash.
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
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.kind} ${r.summary} ${r.status}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

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
      render: (r) => (
        <span className="text-sm text-muted-foreground">{r.kind}</span>
      ),
    },
    {
      key: "summary",
      header: "Event",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.summary}</span>
          <span className="text-xs text-text-secondary">{r.status}</span>
        </div>
      ),
    },
    {
      key: "at",
      header: "At",
      render: (r) => (
        <span className="text-sm text-text-secondary">{formatTime(r.at)}</span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Logs & Usage"
        description="Recent webhook deliveries and audit events, newest first. Read-only."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search logs…"
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
                  title="No log events yet"
                  description="Webhook deliveries land with Phase 2 and audit events with Phase 4 — this view lights up automatically."
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

export default LogsScreen;
