"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import {
  experimentResults,
  listExperiments,
  listExperimentVariants,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { ExperimentCell } from "./parts";

function confidenceNote(exposures, rate, runnerUpRate) {
  if (exposures < 100) return "Low confidence — fewer than 100 exposures. Keep running before acting.";
  const gap = rate - runnerUpRate;
  if (gap < 0.01) return "Low confidence — the top two arms are within 1 point. Keep running.";
  if (exposures < 1000) return "Medium confidence — a clear gap on a few hundred exposures. Consider a ship or a longer run.";
  return "High confidence — a clear gap on substantial traffic. Safe to ship the leader.";
}

// Winner Suggestions: the top arm per experiment plus a plain-language
// confidence note. Notes are heuristic labels, not significance tests.
export function WinnersScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [resultsByExperiment, setResultsByExperiment] = useState({});
  const [loading, setLoading] = useState(true);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    (async () => {
      const exps = (await listExperiments(projectId)) ?? [];
      const arms = {};
      const res = {};
      for (const e of exps) {
        arms[e.id] = (await listExperimentVariants(e.id)) ?? [];
        res[e.id] = await experimentResults(e.id);
      }
      if (!alive) return;
      setExperiments(exps);
      setArmsByExperiment(arms);
      setResultsByExperiment(res);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const suggestions = useMemo(
    () => experiments.map((e) => {
      const arms = armsByExperiment[e.id] || [];
      const sorted = [...(resultsByExperiment[e.id] || [])].sort((a, b) => b.rate - a.rate || b.exposures - a.exposures);
      const top = sorted[0] || null;
      const runnerUp = sorted[1] || { rate: 0 };
      const name = !top ? null : top.variantId ? arms.find((a) => a.id === top.variantId)?.name || "Unknown arm" : "(holdout)";
      return {
        experiment: e,
        top,
        name,
        note: !top || top.exposures === 0 ? "No traffic yet — no suggestion until exposures arrive." : confidenceNote(top.exposures, top.rate, runnerUp.rate),
      };
    }),
    [experiments, armsByExperiment, resultsByExperiment],
  );

  const stats = useMemo(() => [
    { label: "Experiments", value: String(experiments.length), footer: "Reviewed for winners" },
    { label: "With a leader", value: String(suggestions.filter((s) => s.top && s.top.exposures > 0).length), footer: "Non-zero traffic" },
    { label: "High confidence", value: String(suggestions.filter((s) => s.note.startsWith("High")).length), footer: "Estimate, not a test" },
  ], [experiments, suggestions]);

  const columns = [
    {
      key: "exp", header: "Experiment",
      render: (s) => (
        <ExperimentCell name={s.experiment.name} meta={`Goal: ${s.experiment.goalMetric}`} />
      ),
    },
    {
      key: "suggestion", header: "Suggested winner",
      render: (s) => (
        <span className="block max-w-[16rem] whitespace-normal break-words text-sm text-foreground">
          {s.name ? `${s.name} (${(s.top.rate * 100).toFixed(1)}% on ${s.top.exposures})` : "—"}
        </span>
      ),
    },
    {
      key: "confidence", header: "Confidence",
      render: (s) => <span className="block max-w-[20rem] whitespace-normal text-sm text-text-secondary sm:max-w-lg">{s.note}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Winner Suggestions" description="Top arm per experiment with a heuristic confidence note — not a significance test." />
      <StatsBar stats={stats} />
      <SectionCard title="Read this first" description="Suggestions rank by raw conversion rate. Small samples and near-ties are flagged low confidence. Ship only on high confidence, or run longer.">
        <p className="text-sm text-text-secondary">Formal significance testing is nascent — every note here is labeled as an estimate.</p>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={suggestions}
          getRowKey={(s) => s.experiment.id}
          empty={<EmptyState icon={Lightbulb} title="No experiments yet" description="Create one under All Experiments first." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default WinnersScreen;
