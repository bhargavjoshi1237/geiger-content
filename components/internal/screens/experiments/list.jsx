"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, TestTubes, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { ActionMenu } from "@geiger/ui/action-menu";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  createExperiment,
  listExperiments,
  softDeleteExperiment,
  updateExperiment,
} from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";

export const EXPERIMENT_STATUS_MAP = {
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-[#737373]" },
  Running: { label: "Running", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "info", dotClass: "bg-sky-400" },
  Completed: { label: "Completed", variant: "outline", dotClass: "bg-[#525252]" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(EXPERIMENT_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

// All Experiments: full CRUD over content.experiments.
export function ExperimentsListScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
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
    () => rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (search && !`${r.name} ${r.goalMetric}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [rows, search, status],
  );

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Total experiments", value: String(rows.length), footer: `${count((r) => r.status === "Running")} running` },
      { label: "Running", value: String(count((r) => r.status === "Running")), footer: "Collecting exposures" },
      { label: "Draft", value: String(count((r) => r.status === "Draft")), footer: "Not started" },
      { label: "Completed", value: String(count((r) => r.status === "Completed")), footer: "Ready for readout" },
    ];
  }, [rows]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give your experiment a name first.");
      return;
    }
    const optimistic = { id: crypto.randomUUID(), name: name.trim(), status: "Draft", goalMetric: "conversion", holdoutPct: 0, projectId };
    setRows((prev) => [optimistic, ...prev]);
    setName("");
    setCreateOpen(false);
    const saved = await createExperiment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the experiment.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Experiment created.");
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteExperiment(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the experiment.");
    } else {
      toast.success("Experiment deleted.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = { ...row, id: crypto.randomUUID(), name: `${row.name} (copy)`, status: "Draft" };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createExperiment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the experiment.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Experiment duplicated.");
  };

  const cycleStatus = async (row) => {
    const order = ["Draft", "Running", "Paused", "Completed"];
    const next = order[(order.indexOf(row.status) + 1) % order.length];
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const saved = await updateExperiment(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the experiment.");
    }
  };

  const columns = [
    {
      key: "name", header: "Experiment",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">goal: {r.goalMetric} · holdout {r.holdoutPct}%</span>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.status} map={EXPERIMENT_STATUS_MAP} />,
    },
    {
      key: "actions", header: "", align: "right", className: "text-right",
      render: (r) => (
        <ActionMenu
          label={`Actions for ${r.name}`}
          items={[
            { icon: Pencil, label: "Advance status", onSelect: () => cycleStatus(r) },
            { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
            { separator: true },
            { icon: Trash2, label: "Delete", variant: "destructive", onSelect: () => handleDelete(r) },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="All Experiments"
        description="A/B tests, bandits and holdouts — every experiment in this project."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create experiment
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <FilterDropdown value={status} onValueChange={setStatus} options={STATUS_FILTER_OPTIONS} height="h-9" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search experiments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <EmptyState
              icon={TestTubes}
              title={rows.length ? "No experiments match your filters" : "No experiments yet"}
              description={rows.length ? "Try clearing the search or filters." : "Create your first experiment to start testing content choices."}
              action={
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create experiment
                </Button>
              }
            />
          }
        />
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Create experiment</DialogTitle>
            <DialogDescription>Add variants and traffic next — this just opens the test.</DialogDescription>
          </DialogHeader>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hero headline test" autoFocus />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate}>Create experiment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default ExperimentsListScreen;
