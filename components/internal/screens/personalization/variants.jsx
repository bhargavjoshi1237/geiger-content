"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Split, Trash2 } from "lucide-react";

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
import { ActionMenu } from "@geiger/ui/action-menu";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  createVariant,
  listVariants,
  softDeleteVariant,
  updateVariant,
} from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";

const VARIANT_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-[#737373]" },
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-[#525252]" },
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(VARIANT_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

function newId() {
  return crypto.randomUUID();
}

function CreateVariantDialog({ open, onOpenChange, slots, entries, onCreate }) {
  const [slotId, setSlotId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [priority, setPriority] = useState(0);
  const [weight, setWeight] = useState(1);

  const submit = () => {
    if (!slotId) {
      toast.error("Pick a slot first.");
      return;
    }
    onCreate({ slotId, entryId: entryId || null, priority: Number(priority) || 0, weight: Number(weight) || 1 });
    setSlotId("");
    setEntryId("");
    setPriority(0);
    setWeight(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>Create variant</DialogTitle>
          <DialogDescription>
            Attach a candidate entry to a slot. Targeting rules are edited under Targeting Rules.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Slot">
            <Select value={slotId} onValueChange={setSlotId}>
              <SelectTrigger><SelectValue placeholder="Select a slot" /></SelectTrigger>
              <SelectContent>
                {(slots || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.key})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Entry">
            <Select value={entryId} onValueChange={setEntryId}>
              <SelectTrigger><SelectValue placeholder="Select an entry" /></SelectTrigger>
              <SelectContent>
                {(entries || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority" hint="Higher wins first">
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </Field>
            <Field label="Weight" hint="Share within a priority tie">
              <Input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit}>
            Create variant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VariantsScreen() {
  const [rows, setRows] = useState([]);
  const [slots, setSlots] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listVariants(projectId), listSlots(projectId), listContent(projectId)]).then(
      ([variantRows, slotRows, entryRows]) => {
        if (!alive) return;
        setRows(variantRows ?? []);
        setSlots(slotRows ?? []);
        setEntries(entryRows ?? []);
        setLoading(false);
      },
    );
    return () => { alive = false; };
  }, [projectId]);

  const slotName = (id) => slots.find((s) => s.id === id)?.name || "—";
  const entryTitle = (id) => entries.find((e) => e.id === id)?.title || "—";

  const filtered = useMemo(
    () => rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (search && !`${slotName(r.slotId)} ${entryTitle(r.entryId)}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, search, status, slots, entries],
  );

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Total variants", value: String(rows.length), footer: `${count((r) => r.status === "Active")} active` },
      { label: "Slots covered", value: String(new Set(rows.map((r) => r.slotId)).size), footer: "Distinct slots" },
      { label: "With rules", value: String(count((r) => r.rules && Object.keys(r.rules).length > 0)), footer: "Targeted" },
      { label: "Paused", value: String(count((r) => r.status === "Paused")), footer: "Temporarily off" },
    ];
  }, [rows]);

  const handleCreate = async (draft) => {
    const optimistic = { id: newId(), status: "Active", rules: {}, projectId, ...draft };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createVariant(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the variant.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Variant created.");
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteVariant(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the variant.");
    } else {
      toast.success("Variant deleted.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = { ...row, id: newId(), status: "Paused", priority: (row.priority || 0) };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createVariant(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the variant.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Variant duplicated.");
  };

  const toggleStatus = async (row) => {
    const next = row.status === "Active" ? "Paused" : "Active";
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const saved = await updateVariant(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the variant.");
    }
  };

  const columns = [
    {
      key: "variant", header: "Variant",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{entryTitle(r.entryId)}</span>
          <span className="text-xs text-text-secondary">slot: {slotName(r.slotId)} · priority {r.priority} · weight {r.weight}</span>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.status} map={VARIANT_STATUS_MAP} />,
    },
    {
      key: "actions", header: "", align: "right", className: "text-right",
      render: (r) => (
        <ActionMenu
          label="Variant actions"
          items={[
            { icon: Pencil, label: r.status === "Active" ? "Pause" : "Activate", onSelect: () => toggleStatus(r) },
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
        title="Content Variants"
        description="Candidate entries attached to slots — the decision surface the edge resolver picks from."
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create variant
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <FilterDropdown value={status} onValueChange={setStatus} options={STATUS_FILTER_OPTIONS} height="h-9" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search variants…" />
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
              icon={Split}
              title={rows.length ? "No variants match your filters" : "No variants yet"}
              description={rows.length ? "Try clearing the search or filters." : "Create your first variant to give a slot a choice of content."}
              action={
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Create variant
                </Button>
              }
            />
          }
        />
      )}
      <CreateVariantDialog open={createOpen} onOpenChange={setCreateOpen} slots={slots} entries={entries} onCreate={handleCreate} />
    </MainScreenWrapper>
  );
}

export default VariantsScreen;
