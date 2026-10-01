"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Split } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
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
import { EXPERIMENT_STATUS_MAP } from "./list";
import {
  createExperimentVariant,
  listExperiments,
  listExperimentVariants,
} from "@/lib/supabase/experiments";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";

// A/B Tests: running experiments with exactly their two-or-more arms.
// Pick a test, see its arms, add an arm (entry + name).
export function AbScreen() {
  const [experiments, setExperiments] = useState([]);
  const [armsByExperiment, setArmsByExperiment] = useState({});
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [armName, setArmName] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    (async () => {
      const exps = (await listExperiments(projectId)) ?? [];
      const entryRows = (await listContent(projectId)) ?? [];
      const arms = {};
      for (const e of exps) {
        arms[e.id] = (await listExperimentVariants(e.id)) ?? [];
      }
      if (!alive) return;
      setExperiments(exps);
      setArmsByExperiment(arms);
      setEntries(entryRows);
      if (exps.length > 0) setSelectedId(exps[0].id);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId]);

  const tests = useMemo(
    () => experiments.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase())),
    [experiments, search],
  );

  const selected = experiments.find((e) => e.id === selectedId) || null;
  const arms = selected ? armsByExperiment[selected.id] || [] : [];

  const stats = useMemo(() => [
    { label: "A/B tests", value: String(experiments.length), footer: "All experiments" },
    { label: "Arms total", value: String(Object.values(armsByExperiment).reduce((n, a) => n + a.length, 0)), footer: "Across tests" },
    { label: "Ready to read", value: String(experiments.filter((e) => (armsByExperiment[e.id] || []).length >= 2).length), footer: "≥ 2 arms" },
  ], [experiments, armsByExperiment]);

  const addArm = async () => {
    if (!selected) return;
    if (!armName.trim()) {
      toast.error("Name the arm first (e.g. Control, Challenger).");
      return;
    }
    const optimistic = {
      id: crypto.randomUUID(), experimentId: selected.id, entryId: entryId || null,
      name: armName.trim(), weight: 1, projectId,
    };
    setArmsByExperiment((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), optimistic] }));
    setArmName("");
    const saved = await createExperimentVariant(optimistic);
    if (!saved) {
      setArmsByExperiment((prev) => ({ ...prev, [selected.id]: (prev[selected.id] || []).filter((a) => a.id !== optimistic.id) }));
      toast.error("Couldn't save the arm.");
      return;
    }
    setArmsByExperiment((prev) => ({ ...prev, [selected.id]: (prev[selected.id] || []).map((a) => (a.id === saved.id ? saved : a)) }));
    toast.success("Arm added.");
  };

  const columns = [
    {
      key: "name", header: "Test",
      render: (e) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{e.name}</span>
          <span className="text-xs text-text-secondary">{(armsByExperiment[e.id] || []).length} arms · goal {e.goalMetric}</span>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (e) => <StatusPill status={e.status} map={EXPERIMENT_STATUS_MAP} />,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="A/B Tests" description="Two-or-more-arm comparisons on content choices. Manage tests under All Experiments; manage arms here." />
      <StatsBar stats={stats} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{tests.length} tests</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tests…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            columns={columns}
            data={tests}
            getRowKey={(e) => e.id}
            onRowClick={(e) => setSelectedId(e.id)}
            empty={<EmptyState icon={Split} title="No tests yet" description="Create an experiment under All Experiments first." />}
          />
          <SectionCard title="Arms" description={selected ? `${selected.name} — click a test to switch` : "Select a test."}>
            {!selected ? (
              <p className="text-sm text-text-secondary">Nothing selected.</p>
            ) : (
              <div className="grid gap-3">
                {arms.length === 0 && <p className="text-sm text-text-secondary">No arms yet — add Control below.</p>}
                {arms.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                      <p className="truncate text-xs text-text-secondary">weight {a.weight}{a.entryId ? ` · entry ${a.entryId.slice(0, 8)}…` : " · no entry"}</p>
                    </div>
                  </div>
                ))}
                <div className="grid gap-2 border-t border-border pt-3">
                  <Field label="New arm name">
                    <Input value={armName} onChange={(e) => setArmName(e.target.value)} placeholder="Control / Challenger" />
                  </Field>
                  <Field label="Entry (optional)">
                    <Select value={entryId} onValueChange={setEntryId}>
                      <SelectTrigger><SelectValue placeholder="Select an entry" /></SelectTrigger>
                      <SelectContent>
                        {(entries || []).map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button className="w-fit bg-primary text-primary-foreground hover:bg-primary/90" onClick={addArm}>
                    <Plus className="h-4 w-4" /> Add arm
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default AbScreen;
