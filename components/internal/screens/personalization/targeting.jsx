"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";

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
import { listVariants, updateVariant } from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";

const OPS = ["equals", "not_equals", "contains", "in", "gt", "lt"];
const FIELD_HINTS = ["segment", "locale", "device", "country", "profile.tier"];

function toRows(rules) {
  if (Array.isArray(rules)) return rules.map((r) => ({ ...r }));
  if (rules && typeof rules === "object" && Array.isArray(rules.all)) return rules.all.map((r) => ({ ...r }));
  if (rules && typeof rules === "object") {
    return Object.entries(rules).map(([field, value]) => ({ field, op: "equals", value }));
  }
  return [];
}

// Targeting Rules: key/op/value row editor over each variant's `rules`.
// Every row is one clause; all rows must match (AND) at decision time.
export function TargetingScreen() {
  const [variants, setVariants] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listVariants(projectId), listSlots(projectId)]).then(([v, s]) => {
      if (!alive) return;
      setVariants(v ?? []);
      setSlots(s ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) || null,
    [variants, selectedId],
  );

  const select = (v) => {
    setSelectedId(v.id);
    setRows(toRows(v.rules));
  };

  const slotName = (id) => slots.find((s) => s.id === id)?.name || "—";

  const filtered = useMemo(
    () => variants.filter((v) => !search || slotName(v.slotId).toLowerCase().includes(search.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variants, search, slots],
  );

  const stats = useMemo(() => [
    { label: "Variants", value: String(variants.length), footer: "Across all slots" },
    { label: "With rules", value: String(variants.filter((v) => toRows(v.rules).length > 0).length), footer: "Targeted" },
    { label: "Defaults", value: String(variants.filter((v) => toRows(v.rules).length === 0).length), footer: "Catch-all" },
  ], [variants]);

  const setRow = (index, patch) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { field: "segment", op: "equals", value: "" }]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const prev = variants;
    const cleaned = rows.filter((r) => r.field && String(r.value ?? "") !== "");
    setVariants((list) => list.map((v) => (v.id === selected.id ? { ...v, rules: cleaned } : v)));
    const saved = await updateVariant(selected.id, { rules: cleaned });
    setSaving(false);
    if (!saved) {
      setVariants(prev);
      toast.error("Couldn't save the rules.");
    } else {
      toast.success("Targeting rules saved.");
    }
  };

  const columns = [
    {
      key: "variant", header: "Variant",
      render: (v) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{slotName(v.slotId)}</span>
          <span className="text-xs text-text-secondary">
            {toRows(v.rules).length ? toRows(v.rules).map((r) => `${r.field} ${r.op} "${r.value}"`).join(" · ") : "Default (no rules)"}
          </span>
        </div>
      ),
    },
    {
      key: "clauses", header: "Clauses",
      render: (v) => <span className="text-sm text-text-secondary">{toRows(v.rules).length}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Targeting Rules"
        description="Key / operator / value clauses on each variant. All clauses must match (AND) for the variant to win."
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} variants</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by slot…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(v) => v.id}
            onRowClick={(v) => select(v)}
            empty={<EmptyState icon={SlidersHorizontal} title="No variants yet" description="Create variants first, then target them here." />}
          />
          <SectionCard
            title="Rule editor"
            description={selected ? `Editing rules for ${slotName(selected.slotId)}` : "Select a variant to edit its rules."}
            action={selected ? <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save rules"}</Button> : null}
          >
            {!selected ? (
              <p className="text-sm text-text-secondary">Nothing selected.</p>
            ) : (
              <div className="grid gap-3">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                    <Field label={i === 0 ? "Key" : ""}>
                      <Input list="targeting-fields" value={row.field} onChange={(e) => setRow(i, { field: e.target.value })} placeholder="segment" />
                    </Field>
                    <Field label={i === 0 ? "Operator" : ""}>
                      <Select value={row.op} onValueChange={(v) => setRow(i, { op: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{OPS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label={i === 0 ? "Value" : ""}>
                      <Input value={row.value} onChange={(e) => setRow(i, { value: e.target.value })} placeholder="value" />
                    </Field>
                    <Button variant="ghost" size="icon" aria-label="Remove clause" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
                <datalist id="targeting-fields">
                  {FIELD_HINTS.map((f) => <option key={f} value={f} />)}
                </datalist>
                <Button variant="outline" className="w-fit" onClick={addRow}>
                  <Plus className="h-4 w-4" /> Add clause
                </Button>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default TargetingScreen;
