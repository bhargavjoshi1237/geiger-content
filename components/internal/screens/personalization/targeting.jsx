"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  Field,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
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
import { ClauseChips, EmptyPanel } from "./personalization_kit";

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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
          <span className="truncate font-medium text-foreground" title={slotName(v.slotId)}>{slotName(v.slotId)}</span>
          <ClauseChips clauses={toRows(v.rules)} />
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
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} variants</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by slot…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DataTable

            columns={columns}
            data={filtered}
            getRowKey={(v) => v.id}
            onRowClick={(v) => select(v)}
            empty={<EmptyPanel icon={SlidersHorizontal} title={variants.length ? "No variants match your search" : "No variants yet"} description={variants.length ? "Try a different slot name." : "Create variants first, then target them here."} />}
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
                  <div key={i} className="grid min-w-0 gap-3 rounded-lg border border-border bg-surface-card p-3 sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Field label="Key" htmlFor={`targeting-key-${i}`} className="min-w-0">
                      <Input id={`targeting-key-${i}`} list="targeting-fields" value={row.field} onChange={(e) => setRow(i, { field: e.target.value })} placeholder="segment" />
                    </Field>
                    <Field label="Operator" htmlFor={`targeting-operator-${i}`} className="min-w-0">
                      <Select value={row.op} onValueChange={(v) => setRow(i, { op: v })}>
                        <SelectTrigger id={`targeting-operator-${i}`}><SelectValue/></SelectTrigger>
                        <SelectContent>{OPS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Value" htmlFor={`targeting-value-${i}`} className="min-w-0">
                      <Input id={`targeting-value-${i}`} value={row.value} onChange={(e) => setRow(i, { value: e.target.value })} placeholder="value" />
                    </Field>
                    <Button variant="ghost" size="icon" className="self-end justify-self-end" aria-label={`Remove clause ${i + 1}`} onClick={() => removeRow(i)}>
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
