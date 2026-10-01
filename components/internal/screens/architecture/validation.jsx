"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCheck, RefreshCw } from "lucide-react";

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
import { listContent } from "@/lib/supabase/content";
import { listContentTypes, listFieldsByType } from "@/lib/supabase/types";
import { useProject } from "@/context/project-context";
import { validateEntryData } from "./constants";

const ISSUE_STATUS_MAP = {
  error: { label: "Invalid", variant: "destructive", dotClass: "bg-red-400" },
  ok: { label: "Valid", variant: "success", dotClass: "bg-emerald-400" },
  untyped: { label: "No schema", variant: "neutral", dotClass: "bg-[#737373]" },
};

// Read-only audit: every entry's `data` checked against its type's field
// schema, plus the full rule list. Fix values in the Structured Editor.
export function ValidationScreen() {
  const [entries, setEntries] = useState([]);
  const [types, setTypes] = useState([]);
  const [fieldsByType, setFieldsByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { projectId } = useProject();

  const load = async () => {
    setLoading(true);
    const [entryRows, typeRows] = await Promise.all([
      listContent(projectId),
      listContentTypes(projectId),
    ]);
    const list = typeRows ?? [];
    setEntries(entryRows ?? []);
    setTypes(list);
    const pairs = await Promise.all(
      list.map(async (t) => [t.id, (await listFieldsByType(t.id)) ?? []]),
    );
    setFieldsByType(Object.fromEntries(pairs));
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const typeByKey = useMemo(() => {
    const map = {};
    for (const t of types) {
      if (t.key) map[String(t.key).toLowerCase()] = t;
      if (t.name) map[String(t.name).toLowerCase()] = t;
    }
    return map;
  }, [types]);

  const issues = useMemo(() => {
    const out = [];
    for (const entry of entries) {
      const type = typeByKey[String(entry.type || "").toLowerCase()];
      if (!type) {
        out.push({
          id: `${entry.id}:untyped`,
          entry,
          key: "—",
          message: `No content type matches entry type "${entry.type}".`,
          kind: "untyped",
        });
        continue;
      }
      for (const err of validateEntryData(fieldsByType[type.id], entry.data)) {
        out.push({
          id: `${entry.id}:${err.key}`,
          entry,
          key: err.key,
          message: err.message,
          kind: "error",
        });
      }
    }
    return out;
  }, [entries, typeByKey, fieldsByType]);

  const rules = useMemo(() => {
    const out = [];
    for (const t of types) {
      for (const f of fieldsByType[t.id] || []) {
        out.push({ id: f.id, type: t, field: f });
      }
    }
    return out;
  }, [types, fieldsByType]);

  const filtered = useMemo(
    () =>
      issues.filter((i) => {
        if (filter !== "all" && i.kind !== filter) return false;
        if (
          search &&
          !`${i.entry.title} ${i.key} ${i.message}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [issues, search, filter],
  );

  const stats = useMemo(
    () => [
      { label: "Entries checked", value: String(entries.length) },
      {
        label: "Violations",
        value: String(issues.filter((i) => i.kind === "error").length),
        footer: "Fail a field rule",
      },
      {
        label: "Rules",
        value: String(rules.length),
        footer: "Across all types",
      },
    ],
    [entries, issues, rules],
  );

  const issueColumns = [
    {
      key: "entry",
      header: "Entry",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.entry.title}</span>
          <span className="text-xs text-text-secondary">
            /{r.entry.slug} · {r.entry.type}
          </span>
        </div>
      ),
    },
    {
      key: "field",
      header: "Field",
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary">{r.key}</span>
      ),
    },
    {
      key: "message",
      header: "Problem",
      render: (r) => (
        <span className="text-sm text-text-secondary">{r.message}</span>
      ),
    },
    {
      key: "status",
      header: "Severity",
      render: (r) => <StatusPill status={r.kind} map={ISSUE_STATUS_MAP} />,
    },
  ];

  const ruleColumns = [
    {
      key: "rule",
      header: "Rule",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {r.type.name} · {r.field.label}
          </span>
          <span className="font-mono text-xs text-text-secondary">
            {r.field.key} ({r.field.dataType})
            {r.field.localized ? " · localized" : ""}
          </span>
        </div>
      ),
    },
    {
      key: "constraints",
      header: "Constraints",
      render: (r) => (
        <span className="max-w-64 truncate font-mono text-xs text-text-secondary">
          {Object.keys(r.field.validation || {}).length
            ? JSON.stringify(r.field.validation)
            : "none"}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Validation Rules"
        description="Entries.data checked against each type's field schema. Fix values in the Structured Editor."
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Re-run
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex items-center gap-2">
          {["all", "error", "untyped"].map((v) => (
            <Badge
              key={v}
              variant={filter === v ? "info" : "neutral"}
              className="cursor-pointer"
              onClick={() => setFilter(v)}
            >
              {v === "all" ? "All" : ISSUE_STATUS_MAP[v].label}
            </Badge>
          ))}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search entries, fields, messages…"
        />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={issueColumns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={issueColumns}
            data={filtered}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={CheckCheck}
                  title={issues.length ? "No issues match your filters" : "Everything validates"}
                  description={
                    issues.length
                      ? "Try clearing the search or severity filter."
                      : "Every entry's data satisfies its type schema."
                  }
                />
              </div>
            }
          />
          <SectionCard
            title="Rule catalog"
            description="Every field constraint currently enforced."
          >
            <DataTable
              columns={ruleColumns}
              data={rules}
              getRowKey={(r) => r.id}
              empty={
                <p className="text-sm text-text-secondary">
                  No rules yet — add fields under Field Schemas.
                </p>
              }
            />
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default ValidationScreen;
