"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { listExperiments, listExperimentVariants } from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";

// Collision Control: overlap detector. Two running experiments collide when
// they share an entry across arms — a profile could see both tests' versions
// of the same content, muddying both readouts.
export function CollisionsScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const collisions = useMemo(() => {
    const live = experiments.filter((e) => e.status === "Running");
    const entryOwners = new Map();
    for (const e of live) {
      for (const a of armsByExperiment[e.id] || []) {
        if (!a.entryId) continue;
        if (!entryOwners.has(a.entryId)) entryOwners.set(a.entryId, []);
        entryOwners.get(a.entryId).push({ experiment: e, arm: a });
      }
    }
    const out = [];
    for (const [entryId, owners] of entryOwners) {
      const expIds = new Set(owners.map((o) => o.experiment.id));
      if (expIds.size > 1) out.push({ entryId, owners });
    }
    return out;
  }, [experiments, armsByExperiment]);

  const stats = useMemo(() => [
    { label: "Running", value: String(experiments.filter((e) => e.status === "Running").length), footer: "Checked for overlap" },
    { label: "Collisions", value: String(collisions.length), footer: "Shared entries" },
    { label: "Clean", value: String(experiments.filter((e) => e.status === "Running").length - new Set(collisions.flatMap((c) => c.owners.map((o) => o.experiment.id))).size), footer: "Running, no overlap" },
  ], [experiments, collisions]);

  const columns = [
    {
      key: "entry", header: "Shared entry",
      render: (c) => <span className="block max-w-[16rem] truncate font-mono text-xs text-foreground" title={c.entryId}>{c.entryId}</span>,
    },
    {
      key: "owners", header: "Claimed by",
      render: (c) => (
        <span className="block max-w-[20rem] whitespace-normal break-words text-sm text-text-secondary sm:max-w-lg">
          {c.owners.map((o) => `${o.experiment.name} (${o.arm.name})`).join(" · ")}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Collision Control" description="Running experiments that share an entry across arms — fix by pausing one test or swapping the entry." />
      <StatsBar stats={stats} />
      <SectionCard title="How it works" description="Overlap is detected live: any entry appearing in arms of two or more Running experiments is a collision. Draft and paused tests are ignored.">
        <p className="text-sm text-text-secondary">Detection is exact (shared entry ids), not estimated.</p>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={collisions}
          getRowKey={(c) => c.entryId}
          empty={<EmptyState icon={ShieldCheck} title="No collisions" description="No running experiments share entries. Ship with confidence." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default CollisionsScreen;
