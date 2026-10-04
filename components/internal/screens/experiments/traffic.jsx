"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GitPullRequest } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  ScreenHeader,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Progress } from "@geiger/ui/progress";
import {
  listExperiments,
  listExperimentVariants,
  updateExperimentVariant,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { EXPERIMENT_STATUS_MAP, EmptyCard, ExperimentCell, InfoNote } from "./parts";

// Traffic Allocation: per-arm weights; assignVariant hashes over them, so they are the traffic split.
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
    { label: "Holdout", value: selected ? `${selected.holdoutPct}%` : "—", footer: "Carved out before arms" },
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
    {
      key: "exp", header: "Experiment",
      render: (e) => (
        <ExperimentCell
          name={e.name}
          meta={`${(armsByExperiment[e.id] || []).length} arms · holdout ${e.holdoutPct}%`}
          badge={e.id === selectedId ? <Badge variant="outline">Selected</Badge> : null}
        />
      ),
    },
    { key: "status", header: "Status", render: (e) => <StatusPill status={e.status} map={EXPERIMENT_STATUS_MAP} /> },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Traffic Allocation" description="Split traffic across arms by weight. Shares normalize — weights 1:1 mean 50/50." />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DataTable

            columns={columns}
            data={experiments}
            getRowKey={(e) => e.id}
            onRowClick={(e) => { setSelectedId(e.id); setDrafts({}); }}
            empty={<EmptyCard icon={GitPullRequest} title="No experiments yet" description="Create one under All Experiments first." />}
          />
          <SectionCard title="Weights" description={selected ? `${selected.name} — holdout ${selected.holdoutPct}% is carved out first` : "Select an experiment."}>
            {!selected || arms.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">{!selected ? "Nothing selected." : "No arms yet — add arms under A/B Tests."}</p>
            ) : (
              <div className="space-y-5">
                <div className="divide-y divide-border">
                  {arms.map((a) => {
                    const w = Number(drafts[a.id] ?? a.weight ?? 1);
                    const share = total > 0 ? Math.round((w / total) * 100) : 0;
                    return (
                      <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_5rem_auto]">
                        <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{share}%</span>
                          </div>
                          <Progress value={share} className="h-1.5" />
                        </div>
                        <Input
                          type="number" min="0" step="0.5" className="h-8 w-20 shrink-0"
                          aria-label={`Weight for ${a.name}`}
                          value={drafts[a.id] ?? a.weight ?? 1}
                          onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => save(a)}>Save</Button>
                      </div>
                    );
                  })}
                </div>
                <InfoNote>Percentages are estimates from current weights, not measured traffic.</InfoNote>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default TrafficScreen;
