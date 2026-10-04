"use client";

import React, { useMemo, useState } from "react";
import { Route } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Textarea } from "@geiger/ui/textarea";
import { decideOverVariants, rulesMatch } from "@/lib/supabase/decide";
import { EMPTY_PANEL_CLASS } from "./constants";

// Context-aware Ranking: offline matcher demo over pasted variant rules + context JSON; live decisions run via /api/decide.
export function ContextRankScreen() {
  const [rulesJson, setRulesJson] = useState('[\n  { "id": "a", "entryId": "entry-morning", "priority": 1, "weight": 1, "status": "Active", "rules": [{ "field": "device", "op": "equals", "value": "mobile" }] },\n  { "id": "b", "entryId": "entry-default", "priority": 0, "weight": 1, "status": "Active", "rules": [] }\n]');
  const [contextJson, setContextJson] = useState('{\n  "device": "mobile",\n  "locale": "en"\n}');
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);

  const { rows, decision } = useMemo(() => {
    if (!parsed) return { rows: [], decision: null };
    const { variants, context } = parsed;
    const rows = (Array.isArray(variants) ? variants : []).map((v) => {
      const { matched, clauses } = rulesMatch(v.rules, context);
      return { variant: v, matched, clauses };
    });
    return { rows, decision: decideOverVariants(variants, { profile: {}, context }) };
  }, [parsed]);

  const run = () => {
    setError("");
    try {
      const variants = JSON.parse(rulesJson || "[]");
      const context = JSON.parse(contextJson || "{}");
      setParsed({ variants, context });
    } catch {
      setError("One of the JSON blocks is invalid.");
    }
  };

  const stats = useMemo(() => [
    { label: "Variants tested", value: String(rows.length), footer: parsed ? "Last run" : "Press Run" },
    { label: "Matched", value: String(rows.filter((r) => r.matched).length), footer: "Context matches" },
    { label: "Winner", value: decision?.entryId ? String(decision.entryId).slice(0, 18) : "—", footer: "Top pick" },
  ], [rows, decision, parsed]);

  const columns = [
    {
      key: "variant", header: "Variant",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="truncate font-mono text-sm font-medium text-foreground">{String(r.variant.id)}</span>
          {r.variant.entryId ? <span className="truncate text-xs text-text-secondary">{String(r.variant.entryId)}</span> : null}
        </div>
      ),
    },
    {
      key: "match", header: "Context",
      render: (r) => <Badge variant={r.matched ? "success" : "neutral"}>{r.matched ? "Matches" : "No match"}</Badge>,
    },
    {
      key: "clauses", header: "Clauses", align: "right",
      render: (r) => <span className="text-sm tabular-nums text-text-secondary">{r.clauses}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Context-aware Ranking"
        description="Demo how request context (device, locale, time) re-orders variants — offline, no traffic needed."
        actions={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={run}><Route className="h-4 w-4" /> Run</Button>}
      />
      <StatsBar stats={stats} columns={3} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Input" description="Variant list and context bag as JSON. Same matcher as the live engine.">
          <div className="grid gap-4">
            <Field label="Variants (JSON)">
              <Textarea value={rulesJson} onChange={(e) => setRulesJson(e.target.value)} rows={8} className="font-mono text-xs" />
            </Field>
            <Field label="Context (JSON)">
              <Textarea value={contextJson} onChange={(e) => setContextJson(e.target.value)} rows={4} className="font-mono text-xs" />
            </Field>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-text-tertiary">Try: change device to desktop and re-run — the mobile variant should drop out.</p>
          </div>
        </SectionCard>
        <SectionCard bare title="Outcome" description="Match table plus the winner and its reason.">
          {!parsed ? (
            <EmptyState icon={Route} title="Not evaluated yet" description="Press Run to match the variants against the context." className="py-10" />
          ) : (
            <div className="grid gap-4">
              <DataTable
                columns={columns}
                data={rows}
                getRowKey={(r) => String(r.variant.id)}
                empty={<EmptyState icon={Route} title="No variants" description="Paste a variant list first." className={EMPTY_PANEL_CLASS} />}
              />
              {decision && (
                <div className="rounded-lg border border-border bg-surface-card p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Reason</p>
                  <p className="mt-1 break-words text-sm text-foreground">{decision.reason}</p>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default ContextRankScreen;
