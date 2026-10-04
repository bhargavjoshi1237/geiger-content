"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { listExperiments, updateExperiment } from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { ExperimentCell } from "./parts";

const GOAL_HINTS = ["conversion", "click", "signup", "purchase", "retention"];

// Goals & Metrics: what each experiment optimizes for. The goal names the
// conversion event recorded via recordConversion.
export function GoalsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listExperiments(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const filtered = useMemo(
    () => rows.filter((r) => !search || `${r.name} ${r.goalMetric}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const stats = useMemo(() => {
    const goals = new Set(rows.map((r) => r.goalMetric));
    return [
      { label: "Experiments", value: String(rows.length), footer: "With goals" },
      { label: "Distinct goals", value: String(goals.size), footer: [...goals].slice(0, 3).join(", ") || "—" },
      { label: "Default goal", value: String(rows.filter((r) => r.goalMetric === "conversion").length), footer: "Still on conversion" },
    ];
  }, [rows]);

  const save = async (row) => {
    const goalMetric = String(drafts[row.id] ?? row.goalMetric ?? "conversion").trim() || "conversion";
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, goalMetric } : r)));
    const saved = await updateExperiment(row.id, { goalMetric });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save the goal.");
    } else {
      toast.success("Goal updated.");
    }
  };

  const columns = [
    {
      key: "exp", header: "Experiment",
      render: (r) => (
        <ExperimentCell name={r.name} meta={r.status} />
      ),
    },
    {
      key: "goal", header: "Goal metric",
      render: (r) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            list="goal-hints"
            className="h-8 min-w-32 max-w-52"
            aria-label={`Goal metric for ${r.name}`}
            value={drafts[r.id] ?? r.goalMetric ?? "conversion"}
            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
          />
          <Button size="sm" variant="outline" onClick={() => save(r)}>Save</Button>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Goals & Metrics" description="The conversion event each experiment optimizes for — recorded per exposure." />
      <StatsBar stats={stats} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} experiments</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search experiments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <>
          <datalist id="goal-hints">{GOAL_HINTS.map((g) => <option key={g} value={g} />)}</datalist>
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            empty={<EmptyState icon={Target} title="No experiments yet" description="Create one under All Experiments first." />}
          />
        </>
      )}
      <div className="flex gap-2">
        <Field label="" hint="Conversions are recorded with recordConversion(exposureId); results divide conversions by exposures per arm."><span /></Field>
      </div>
    </MainScreenWrapper>
  );
}

export default GoalsScreen;
