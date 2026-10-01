"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GitPullRequest } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  listExperiments,
  listExperimentVariants,
  updateExperimentVariant,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";

// Traffic Allocation: per-arm weights. Assignment is a deterministic hash
// over weights (see assignVariant), so these numbers are the traffic split.
export function TrafficScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState({});
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    (async () => {
      const exps = (await listExperiments(projectId)) ?? [];
      const arms = {};
      for (const e of exps) arms[e.id] = (await listExperimentVariants(e.id)) ?? [];
      if (!alive) return;
      setExperiments(exps);
      setArmsByExperiment(arms);
      if (exps.length > 0) setSelectedId(exps[0].id);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const selected = useMemo(() => experiments.find((e) => e.id === selectedId) || null, [experiments, selectedId]);
  const arms = useMemo(() => (selected ? armsByExperiment[selected.id] || [] : []), [selected, armsByExperiment]);
  const total = arms.reduce((n, a) => n + Number(drafts[a.id] ?? a.weight ?? 1), 0);

  const stats = useMemo(() => [
    { label: "Experiments", value: String(experiments.length), footer: "With traffic to split" },
    { label: "Arms", value: String(arms.length), footer: selected ? selected.name : "Select a test" },
    { label: "Weight total", value: String(Number(total.toFixed(2))), footer: "Shares normalize to 100%" },
  ], [experiments, arms, total, selected]);

  const save = async (arm) => {
    const weight = Number(drafts[arm.id] ?? arm.weight ?? 1);
    if (!(weight >= 0)) {
      toast.error("Weight must be zero or more.");
      return;
    }
    const prev = armsByExperiment;
    setArmsByExperiment((m) => ({ ...m, [selected.id]: (m[selected.id] || []).map((a) => (a.id === arm.id ? { ...a, weight } : a)) }));
    const saved = await updateExperimentVariant(arm.id, { weight });
    if (!saved) {
      setArmsByExperiment(prev);
      toast.error("Couldn't save the weight.");
    } else {
      toast.success(`Traffic updated — ${arm.name} gets ${total ? Math.round((weight / (total - Number(arm.weight) + weight || 1)) * 100) : 0}% (estimate).`);
    }
  };

  const columns = [
    { key: "exp", header: "Experiment", render: (e) => <span className="font-medium text-foreground">{e.name}</span> },
    { key: "arms", header: "Arms", render: (e) => <span className="text-sm text-text-secondary">{(armsByExperiment[e.id] || []).length}</span> },
    { key: "status", header: "Status", render: (e) => <span className="text-sm text-text-secondary">{e.status}</span> },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Traffic Allocation" description="Split traffic across arms by weight. Shares normalize — weights 1:1 mean 50/50." />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            columns={columns}
            data={experiments}
            getRowKey={(e) => e.id}
            onRowClick={(e) => { setSelectedId(e.id); setDrafts({}); }}
            empty={<EmptyState icon={GitPullRequest} title="No experiments yet" description="Create one under All Experiments first." />}
          />
          <SectionCard title="Weights" description={selected ? `${selected.name} — holdout ${selected.holdoutPct}% is carved out first` : "Select an experiment."}>
            {!selected || arms.length === 0 ? (
              <p className="text-sm text-text-secondary">{!selected ? "Nothing selected." : "No arms yet — add arms under A/B Tests."}</p>
            ) : (
              <div className="grid gap-3">
                {arms.map((a) => {
                  const w = Number(drafts[a.id] ?? a.weight ?? 1);
                  const pct = total > 0 ? Math.round((w / total) * 100) : 0;
                  return (
                    <div key={a.id} className="grid grid-cols-[1fr_90px_auto] items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-active">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <Input type="number" min="0" step="0.5" value={drafts[a.id] ?? a.weight ?? 1} onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))} />
                      <Button size="sm" variant="outline" onClick={() => save(a)}>Save</Button>
                    </div>
                  );
                })}
                <p className="text-xs text-text-secondary">Percentages are estimates from current weights, not measured traffic.</p>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default TrafficScreen;
