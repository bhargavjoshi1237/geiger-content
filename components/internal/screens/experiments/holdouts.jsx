"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { UsersRound } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { listExperiments, updateExperiment } from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { ExperimentCell } from "./parts";

// Holdout Groups: the % of traffic that receives no treatment, carved out
// before arm assignment so lift can be measured against a true baseline.
export function HoldoutsScreen() {
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
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const stats = useMemo(() => [
    { label: "Experiments", value: String(rows.length), footer: "Holdout coverage" },
    { label: "With holdout", value: String(rows.filter((r) => Number(r.holdoutPct) > 0).length), footer: "> 0% held out" },
    { label: "Median holdout", value: `${median(rows.map((r) => Number(r.holdoutPct) || 0))}%`, footer: "Estimate" },
  ], [rows]);

  function median(nums) {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  const save = async (row) => {
    const holdoutPct = Math.min(50, Math.max(0, Number(drafts[row.id] ?? row.holdoutPct ?? 0)));
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, holdoutPct } : r)));
    const saved = await updateExperiment(row.id, { holdoutPct });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save the holdout.");
    } else {
      toast.success("Holdout updated.");
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
      key: "holdout", header: "Holdout %",
      render: (r) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number" min="0" max="50" step="1" className="h-8 w-24"
            aria-label={`Holdout percentage for ${r.name}`}
            value={drafts[r.id] ?? r.holdoutPct ?? 0}
            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
          />
          <Button size="sm" variant="outline" onClick={() => save(r)}>Save</Button>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Holdout Groups" description="Traffic that sees no variant — the baseline every arm is measured against." />
      <StatsBar stats={stats} />
      <SectionCard title="How it works" description="Assignment hashes each profile first against holdout_pct (0–50%). Held-out profiles record an exposure with no variant; everyone else splits across arms by weight.">
        <p className="text-sm text-text-secondary">Holdout exposures appear as “(holdout)” in Results.</p>
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} experiments</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search experiments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={<EmptyState icon={UsersRound} title="No experiments yet" description="Create one under All Experiments first." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default HoldoutsScreen;
