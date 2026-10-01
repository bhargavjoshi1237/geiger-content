"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bot } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  experimentResults,
  listExperiments,
  listExperimentVariants,
  updateExperimentVariant,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";

// Multi-armed Bandits: epsilon-greedy weight adjuster. With probability
// epsilon traffic explores uniformly; otherwise weights follow observed
// conversion rates. Applying writes the new weights back to the arms.
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

  const stats = useMemo(() => [
    { label: "Experiments", value: String(experiments.length), footer: "Bandit candidates" },
    { label: "Arms", value: String(arms.length), footer: selected ? selected.name : "Select a test" },
    { label: "Epsilon", value: String(epsilon), footer: "Exploration share" },
  ], [experiments, arms, epsilon, selected]);

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
    { key: "exp", header: "Experiment", render: (e) => <span className="font-medium text-foreground">{e.name}</span> },
    { key: "arms", header: "Arms", render: (e) => <span className="text-sm text-text-secondary">{(armsByExperiment[e.id] || []).length}</span> },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Multi-armed Bandits"
        description="Shift traffic toward winning arms automatically with epsilon-greedy re-weighting."
        actions={selected ? <Button className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={applying || proposal.length === 0} onClick={apply}>{applying ? "Applying…" : "Apply weights"}</Button> : null}
      />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            columns={columns}
            data={experiments}
            getRowKey={(e) => e.id}
            onRowClick={(e) => setSelectedId(e.id)}
            empty={<EmptyState icon={Bot} title="No experiments yet" description="Create one under All Experiments first." />}
          />
          <SectionCard title="Proposal" description={selected ? `Epsilon-greedy weights for ${selected.name} from observed rates` : "Select an experiment."}>
            {!selected ? (
              <p className="text-sm text-text-secondary">Nothing selected.</p>
            ) : (
              <div className="grid gap-3">
                <Field label="Epsilon (exploration share, 0–0.5)" hint="0.1 = 10% explores uniformly, 90% follows winners.">
                  <Input type="number" min="0" max="0.5" step="0.05" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} className="max-w-40" />
                </Field>
                {proposal.length === 0 && <p className="text-sm text-text-secondary">No arms yet.</p>}
                {proposal.map((p) => (
                  <div key={p.arm.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.arm.name}</p>
                      <p className="text-xs text-text-secondary">{(p.rate * 100).toFixed(1)}% observed → weight {p.weight}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">Experiment</span>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {experiments.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default BanditsScreen;
