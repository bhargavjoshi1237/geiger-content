"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, Loader2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Progress } from "@geiger/ui/progress";
import { Slider } from "@geiger/ui/slider";
import {
  experimentResults,
  listExperiments,
  listExperimentVariants,
  updateExperimentVariant,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { EXPERIMENT_STATUS_MAP, EmptyCard, ExperimentCell, InfoNote, pct } from "./parts";

// Multi-armed Bandits: epsilon-greedy re-weighting from observed rates; Apply writes weights back to the arms.
export function BanditsScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [resultsByExperiment, setResultsByExperiment] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [epsilon, setEpsilon] = useState(0.1);
  const [applying, setApplying] = useState(false);
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
      if (exps.length > 0) setSelectedId(exps[0].id);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const selected = useMemo(() => experiments.find((e) => e.id === selectedId) || null, [experiments, selectedId]);
  const arms = useMemo(() => (selected ? armsByExperiment[selected.id] || [] : []), [selected, armsByExperiment]);
  const results = useMemo(() => (selected ? resultsByExperiment[selected.id] || [] : []), [selected, resultsByExperiment]);

  const proposal = useMemo(() => {
    if (!selected || arms.length === 0) return [];
    const eps = Math.min(0.5, Math.max(0, Number(epsilon) || 0));
    const rateOf = (id) => results.find((r) => r.variantId === id)?.rate ?? 0;
    const totalRate = arms.reduce((n, a) => n + rateOf(a.id), 0);
    return arms.map((a) => {
      const exploit = totalRate > 0 ? rateOf(a.id) / totalRate : 1 / arms.length;
      const weight = Number((eps * (1 / arms.length) + (1 - eps) * exploit).toFixed(3));
      return { arm: a, rate: rateOf(a.id), weight };
    });
  }, [selected, arms, results, epsilon]);

  const stats = useMemo(() => {
    const eps = Math.min(0.5, Math.max(0, Number(epsilon) || 0));
    const top = proposal.reduce((best, p) => (!best || p.weight > best.weight ? p : best), null);
    return [
      { label: "Experiments", value: String(experiments.length), footer: "Bandit candidates" },
      { label: "Arms", value: String(arms.length), footer: selected ? selected.name : "Select a test" },
      { label: "Exploration", value: `${Math.round(eps * 100)}%`, footer: `Epsilon ${eps}` },
      { label: "Top weight", value: top ? `${Math.round(top.weight * 100)}%` : "—", footer: top ? top.arm.name : "No arms yet" },
    ];
  }, [experiments, arms, epsilon, selected, proposal]);

  const currentTotal = arms.reduce((n, a) => n + (Number(a.weight) || 0), 0);

  const apply = async () => {
    if (!selected || proposal.length === 0) return;
    setApplying(true);
    const prev = armsByExperiment;
    setArmsByExperiment((m) => ({
      ...m,
      [selected.id]: (m[selected.id] || []).map((a) => ({ ...a, weight: proposal.find((p) => p.arm.id === a.id)?.weight ?? a.weight })),
    }));
    try {
      for (const p of proposal) {
        const saved = await updateExperimentVariant(p.arm.id, { weight: p.weight });
        if (!saved) throw new Error(p.arm.name);
      }
      toast.success("Bandit weights applied.");
    } catch {
      setArmsByExperiment(prev);
      toast.error("Couldn't apply the weights — rolled back.");
    } finally {
      setApplying(false);
    }
  };

  const columns = [
    {
      key: "exp", header: "Experiment",
      render: (e) => (
        <ExperimentCell
          name={e.name}
          meta={`${(armsByExperiment[e.id] || []).length} arms · goal ${e.goalMetric}`}
          badge={e.id === selectedId ? <Badge variant="outline">Selected</Badge> : null}
        />
      ),
    },
    { key: "status", header: "Status", render: (e) => <StatusPill status={e.status} map={EXPERIMENT_STATUS_MAP} /> },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Multi-armed Bandits"
        description="Shift traffic toward winning arms automatically with epsilon-greedy re-weighting."
        actions={selected ? (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={applying || proposal.length === 0} onClick={apply}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {applying ? "Applying…" : "Apply weights"}
          </Button>
        ) : null}
      />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DataTable

            columns={columns}
            data={experiments}
            getRowKey={(e) => e.id}
            onRowClick={(e) => setSelectedId(e.id)}
            empty={<EmptyCard icon={Bot} title="No experiments yet" description="Create one under All Experiments first." />}
          />
          <SectionCard title="Proposal" description={selected ? `Epsilon-greedy weights for ${selected.name} from observed rates` : "Select an experiment."}>
            {!selected ? (
              <p className="py-6 text-center text-sm text-text-secondary">Nothing selected.</p>
            ) : (
              <div className="space-y-5">
                <Field label="Exploration (epsilon)" hint={`${Math.round((Number(epsilon) || 0) * 100)}% explores uniformly, the rest follows winners. Range 0–0.5.`}>
                  <div className="flex items-center gap-3 pt-1">
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.05}
                      value={[Number(epsilon) || 0]}
                      onValueChange={([v]) => setEpsilon(Math.round(v * 100) / 100)}
                      aria-label="Epsilon"
                    />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{Number(epsilon).toFixed(2)}</span>
                  </div>
                </Field>
                {proposal.length === 0 ? (
                  <p className="text-sm text-text-secondary">No arms yet — add arms under A/B Tests.</p>
                ) : (
                  <div className="divide-y divide-border border-t border-border">
                    {proposal.map((p) => {
                      const current = currentTotal > 0 ? Math.round(((Number(p.arm.weight) || 0) / currentTotal) * 100) : 0;
                      const next = Math.round(p.weight * 100);
                      return (
                        <div key={p.arm.id} className="space-y-2 py-3 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{p.arm.name}</p>
                              <p className="text-xs text-text-secondary">{pct(p.rate)} observed · weight {p.weight}</p>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 text-sm tabular-nums">
                              <span className="text-text-secondary">{current}%</span>
                              <ArrowRight className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
                              <span className={next > current ? "font-semibold text-emerald-400" : next < current ? "font-semibold text-red-400" : "font-semibold text-foreground"}>{next}%</span>
                            </span>
                          </div>
                          <Progress value={next} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
                <InfoNote>Shares show current traffic → proposed traffic. Nothing changes until you apply.</InfoNote>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default BanditsScreen;
