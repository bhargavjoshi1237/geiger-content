"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  listExperiments,
  listExperimentVariants,
  results as getExperimentResults,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";

// Results: conversion table per experiment + winner = the arm with the
// highest conversion rate (ties broken by exposures).
export function ResultsScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [resultsByExperiment, setResultsByExperiment] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    (async () => {
      const exps = (await listExperiments(projectId)) ?? [];
      const arms = {};
      const res = {};
      for (const e of exps) {
        arms[e.id] = (await listExperimentVariants(e.id)) ?? [];
        res[e.id] = await getExperimentResults(e.id);
      }
      if (!alive) return;
      setExperiments(exps);
      setArmsByExperiment(arms);
      setResultsByExperiment(res);
      if (exps.length > 0) setSelectedId(exps[0].id);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const selected = useMemo(() => experiments.find((e) => e.id === selectedId) || null, [experiments, selectedId]);
  const arms = useMemo(() => (selected ? armsByExperiment[selected.id] || [] : []), [selected, armsByExperiment]);
  const results = useMemo(() => (selected ? resultsByExperiment[selected.id] || [] : []), [selected, resultsByExperiment]);

  const table = useMemo(() => {
    const sorted = [...results].sort((a, b) => b.rate - a.rate || b.exposures - a.exposures);
    return sorted.map((r, i) => {
      const name = !r.variantId ? "(holdout)" : arms.find((a) => a.id === r.variantId)?.name || `${String(r.variantId).slice(0, 8)}…`;
      return { ...r, name, winner: i === 0 && r.exposures > 0 };
    });
  }, [results, arms]);

  const stats = useMemo(() => {
    const exposures = results.reduce((n, r) => n + r.exposures, 0);
    const conversions = results.reduce((n, r) => n + r.conversions, 0);
    const best = table.find((r) => r.winner);
    return [
      { label: "Exposures", value: String(exposures), footer: selected ? selected.name : "Select a test" },
      { label: "Conversions", value: String(conversions), footer: exposures ? `${((conversions / exposures) * 100).toFixed(1)}% overall` : "No traffic yet" },
      { label: "Leader", value: best ? best.name : "—", footer: best ? `${(best.rate * 100).toFixed(1)}% rate` : "No data" },
    ];
  }, [results, table, selected]);

  const columns = [
    {
      key: "arm", header: "Arm",
      render: (r) => (
        <span className="font-medium text-foreground">
          {r.name} {r.winner ? "· winner" : ""}
        </span>
      ),
    },
    { key: "exposures", header: "Exposures", render: (r) => <span className="text-sm text-text-secondary">{r.exposures}</span> },
    { key: "conversions", header: "Conversions", render: (r) => <span className="text-sm text-text-secondary">{r.conversions}</span> },
    { key: "rate", header: "Rate", render: (r) => <span className="text-sm text-foreground">{(r.rate * 100).toFixed(1)}%</span> },
    {
      key: "significance", header: "Significance",
      render: (r) => {
        if (r.isControl) {
          return <span className="text-sm text-muted-foreground">Control</span>;
        }
        const s = r.significance;
        if (!s) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span className="flex flex-col gap-1">
            {s.significant ? (
              <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Significant
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Needs more data</span>
            )}
            <span className="text-xs text-text-tertiary">p = {Number(s.p).toFixed(3)}</span>
          </span>
        );
      },
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Results"
        description="Conversion rate per arm. The leader is the highest rate (heuristic) — p-values come from a two-proportion z-test of each arm vs the control (first arm)."
        actions={
          experiments.length > 0 ? (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select experiment" /></SelectTrigger>
              <SelectContent>
                {experiments.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null
        }
      />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : !selected ? (
        <EmptyState icon={BarChart3} title="No experiments yet" description="Create one under All Experiments first." />
      ) : (
        <SectionCard title={selected.name} description={`Goal: ${selected.goalMetric} · holdout ${selected.holdoutPct}%`}>
          <DataTable
            columns={columns}
            data={table}
            getRowKey={(r) => String(r.variantId || "holdout")}
            empty={<EmptyState icon={BarChart3} title="No exposures yet" description="Record exposures as profiles are assigned — rates appear here." />}
          />
        </SectionCard>
      )}
    </MainScreenWrapper>
  );
}

export default ResultsScreen;
