"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CircleGauge, Pause, Play, Plus, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import {
  createFrequencyCap,
  listFrequencyCaps,
  softDeleteFrequencyCap,
  updateFrequencyCap,
} from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";
import { ACTIVE_STATUS_MAP, EmptyPanel } from "./personalization_kit";

// Frequency Caps: max impressions of a slot per profile per window.
export function FrequencyScreen() {
  const [rows, setRows] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [slotId, setSlotId] = useState("");
  const [maxImpressions, setMaxImpressions] = useState(3);
  const [windowHours, setWindowHours] = useState(24);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listFrequencyCaps(projectId), listSlots(projectId)]).then(([caps, slotRows]) => {
      if (!alive) return;
      setRows(caps ?? []);
      setSlots(slotRows ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const slotName = (id) => slots.find((s) => s.id === id)?.name || "—";

  const filtered = useMemo(
    () => rows.filter((r) => !search || slotName(r.slotId).toLowerCase().includes(search.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, search, slots],
  );

  const stats = useMemo(() => [
    { label: "Caps", value: String(rows.length), footer: "Across slots" },
    { label: "Slots capped", value: String(new Set(rows.map((r) => r.slotId)).size), footer: "Distinct slots" },
    { label: "Active", value: String(rows.filter((r) => r.status === "Active").length), footer: "Enforced" },
  ], [rows]);

  const handleCreate = async () => {
    if (!slotId) {
      toast.error("Pick a slot first.");
      return;
    }
    const optimistic = {
      id: crypto.randomUUID(), slotId, projectId,
      maxImpressions: Number(maxImpressions) || 3,
      windowHours: Number(windowHours) || 24,
      status: "Active",
    };
    setRows((prev) => [optimistic, ...prev]);
    setCreateOpen(false);
    const saved = await createFrequencyCap(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the cap.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Frequency cap created.");
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteFrequencyCap(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the cap.");
    } else {
      toast.success("Cap deleted.");
    }
  };

  const toggleStatus = async (row) => {
    const next = row.status === "Active" ? "Paused" : "Active";
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const saved = await updateFrequencyCap(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the cap.");
    }
  };

  const columns = [
    {
      key: "slot", header: "Slot",
      render: (r) => <span className="block max-w-[20rem] truncate font-medium text-foreground">{slotName(r.slotId)}</span>,
    },
    {
      key: "cap", header: "Cap",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground tabular-nums">{r.maxImpressions} impressions</span>
          <span className="text-xs text-text-secondary tabular-nums">per {r.windowHours}h window</span>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.status} map={ACTIVE_STATUS_MAP} />,
    },
    {
      key: "actions", header: "", align: "right", className: "text-right",
      render: (r) => (
        <ActionMenu
          label="Cap actions"
          items={[
            { icon: r.status === "Active" ? Pause : Play, label: r.status === "Active" ? "Pause" : "Activate", onSelect: () => toggleStatus(r) },
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
        title="Frequency Caps"
        description="How often a slot may serve a profile — max impressions per time window."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create cap
          </Button>
        }
      />
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} caps</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by slot…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <EmptyPanel
              icon={CircleGauge}
              title={rows.length ? "No caps match your search" : "No frequency caps yet"}
              description={rows.length ? "Try clearing the search." : "Cap impressions per slot so visitors don't see the same content on repeat."}
              action={rows.length ? (
                <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button>
              ) : (
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create cap
                </Button>
              )}
            />
          }
        />
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create frequency cap</DialogTitle>
            <DialogDescription>Limit impressions of one slot per profile per window.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Slot">
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger><SelectValue placeholder="Select a slot" /></SelectTrigger>
                <SelectContent>
                  {(slots || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Max impressions">
                <Input type="number" min="1" value={maxImpressions} onChange={(e) => setMaxImpressions(e.target.value)} />
              </Field>
              <Field label="Window (hours)">
                <Input type="number" min="1" value={windowHours} onChange={(e) => setWindowHours(e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate}>Create cap</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default FrequencyScreen;
