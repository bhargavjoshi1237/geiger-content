"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Split } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  Field,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Progress } from "@geiger/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { EXPERIMENT_STATUS_MAP, EmptyCard, ExperimentCell } from "./parts";
import {
  createExperimentVariant,
  listExperiments,
  listExperimentVariants,
} from "@/lib/supabase/experiments";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";

// A/B Tests: pick a test, see its arms, add an arm (entry + name).
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

  const entryLabel = (id) => {
    const entry = entries.find((e) => e.id === id);
    return entry ? entry.title || entry.slug : `${String(id).slice(0, 8)}…`;
  };
  const weightTotal = arms.reduce((n, a) => n + (Number(a.weight) || 0), 0);

  const columns = [
    {
      key: "name", header: "Test",
      render: (e) => (
        <ExperimentCell
          name={e.name}
          meta={`${(armsByExperiment[e.id] || []).length} arms · goal ${e.goalMetric}`}
          badge={e.id === selectedId ? <Badge variant="outline">Selected</Badge> : null}
        />
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
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{tests.length} {tests.length === 1 ? "test" : "tests"}</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search tests…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DataTable

            columns={columns}
            data={tests}
            getRowKey={(e) => e.id}
            onRowClick={(e) => setSelectedId(e.id)}
            empty={
              <EmptyCard
                icon={Split}
                title={experiments.length ? "No tests match your search" : "No tests yet"}
                description={experiments.length ? "Try a different name." : "Create an experiment under All Experiments first."}
              />
            }
          />
          <SectionCard title="Arms" description={selected ? `${selected.name} — click a test to switch` : "Select a test to manage its arms."}>
            {!selected ? (
              <p className="py-6 text-center text-sm text-text-secondary">Nothing selected.</p>
            ) : (
              <div className="space-y-5">
                {arms.length === 0 ? (
                  <p className="text-sm text-text-secondary">No arms yet — add Control below.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {arms.map((a) => {
                      const share = weightTotal > 0 ? Math.round(((Number(a.weight) || 0) / weightTotal) * 100) : 0;
                      return (
                        <div key={a.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                              <p className="truncate text-xs text-text-secondary">
                                {a.entryId ? entryLabel(a.entryId) : "No entry"} · weight {a.weight}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{share}%</span>
                          </div>
                          <Progress value={share} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid gap-4 border-t border-border pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="New arm name" htmlFor="ab-arm-name">
                      <Input id="ab-arm-name" value={armName} onChange={(e) => setArmName(e.target.value)} placeholder="Control / Challenger" />
                    </Field>
                    <Field label="Entry (optional)">
                      <Select value={entryId} onValueChange={setEntryId}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select an entry" /></SelectTrigger>
                        <SelectContent>
                          {(entries || []).map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-fit" onClick={addArm}>
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
