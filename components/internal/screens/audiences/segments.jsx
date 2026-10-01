"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Filter, Pencil, Plus, Trash2, X } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
  Field,
  SectionCard,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
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
import { SEGMENT_OPERATORS, formatDate, newId } from "./constants";
import {
  EMPTY_RULE,
  countSegmentMembers,
  createSegment,
  evaluateSegment,
  listSegments,
  softDeleteSegment,
  updateSegment,
} from "@/lib/supabase/segments";
import { listEvents } from "@/lib/supabase/events";
import { getTraitsMap, listProfiles } from "@/lib/supabase/profiles";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

function parseValue(raw) {
  if (raw === "" || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stringifyValue(value) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function RuleBuilder({ rule, onChange, fieldHints }) {
  const setOp = (op) => onChange({ ...rule, op });
  const setCondition = (index, patch) => {
    const conditions = rule.conditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c,
    );
    onChange({ ...rule, conditions });
  };
  const removeCondition = (index) => {
    onChange({ ...rule, conditions: rule.conditions.filter((_, i) => i !== index) });
  };
  const addCondition = () => {
    onChange({
      ...rule,
      conditions: [
        ...rule.conditions,
        { field: "", operator: "equals", value: "" },
      ],
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">Match</span>
        <Select value={rule.op || "and"} onValueChange={setOp}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">ALL</SelectItem>
            <SelectItem value="or">ANY</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-text-secondary">of these rules</span>
      </div>
      {(rule.conditions || []).map((c, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-border bg-surface-card p-3 md:grid-cols-[1fr_160px_1fr_auto]">
          <Field label={i === 0 ? "Field" : ""}>
            <Input
              value={c.field || ""}
              onChange={(e) => setCondition(i, { field: e.target.value })}
              placeholder="trait.plan or events.page_view"
              list="segment-field-hints"
            />
          </Field>
          <Field label={i === 0 ? "Operator" : ""}>
            <Select
              value={c.operator || "equals"}
              onValueChange={(v) => setCondition(i, { operator: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={i === 0 ? "Value" : ""}>
            <Input
              value={stringifyValue(c.value)}
              onChange={(e) => setCondition(i, { value: parseValue(e.target.value) })}
              placeholder="pro, 5, true…"
              disabled={c.operator === "exists" || c.operator === "not_exists"}
            />
          </Field>
          <div className="flex items-end pb-0.5">
            <Button
              variant="ghost"
              aria-label={`Remove rule ${i + 1}`}
              onClick={() => removeCondition(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <datalist id="segment-field-hints">
        {(fieldHints || []).map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <div>
        <Button variant="outline" onClick={addCondition}>
          <Plus className="h-4 w-4" /> Add rule
        </Button>
      </div>
    </div>
  );
}

export function SegmentsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draftRule, setDraftRule] = useState({ ...EMPTY_RULE });
  const [saving, setSaving] = useState(false);
  // Evaluation scope for the member-count preview.
  const [contexts, setContexts] = useState([]);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [fieldHints, setFieldHints] = useState([]);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listSegments(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Load the evaluation scope (profiles × traits × event counts) when the
  // builder opens so the preview counts real members.
  const openEditor = async (segment) => {
    setEditing(segment);
    setDraftRule(
      segment.rule && typeof segment.rule === "object"
        ? segment.rule
        : { ...EMPTY_RULE },
    );
    setScopeLoading(true);
    const [profiles, events] = await Promise.all([
      listProfiles(projectId),
      listEvents(projectId),
    ]);
    const list = profiles ?? [];
    const traitMaps = await Promise.all(list.map((p) => getTraitsMap(p.id)));
    const keys = new Set();
    const built = list.map((p, i) => {
      const traits = traitMaps[i] || {};
      Object.keys(traits).forEach((k) => {
        keys.add(`trait.${k}`);
        keys.add(k);
      });
      const ids = new Set([p.primaryIdentifier, ...(p.identifiers || [])]);
      const eventCounts = {};
      for (const e of events ?? []) {
        if (ids.has(e.anonymousId) || (e.userId && ids.has(e.userId))) {
          eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
        }
      }
      Object.keys(eventCounts).forEach((t) => keys.add(`events.${t}`));
      return { traits, eventCounts };
    });
    setContexts(built);
    setFieldHints(Array.from(keys).sort());
    setScopeLoading(false);
  };

  const previewCount = useMemo(
    () => (scopeLoading ? null : countSegmentMembers(draftRule, contexts)),
    [draftRule, contexts, scopeLoading],
  );

  const stats = useMemo(() => {
    const withRules = rows.filter(
      (r) => (r.rule?.conditions || []).length > 0,
    ).length;
    return [
      { label: "Total segments", value: String(rows.length), footer: `${withRules} with rules` },
      { label: "Profiles in scope", value: String(contexts.length), footer: "Builder preview" },
      { label: "Preview matches", value: previewCount === null ? "—" : String(previewCount), footer: editing?.name || "Open a segment" },
    ];
  }, [rows, contexts.length, previewCount, editing]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [rows, search]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give your segment a name first.");
      return;
    }
    const optimistic = {
      id: newId(),
      name: name.trim(),
      rule: { ...EMPTY_RULE },
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    setName("");
    setCreateOpen(false);
    const saved = await createSegment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the segment to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleSaveRules = async () => {
    if (!editing) return;
    setSaving(true);
    const saved = await updateSegment(editing.id, { rule: draftRule });
    setSaving(false);
    if (!saved) {
      toast.error("Couldn't save the rules to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    setEditing(saved);
    toast.success("Segment rules saved.");
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) setEditing(null);
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteSegment(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the segment on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Segment",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {(r.rule?.conditions || []).length} rules · {r.rule?.op || "and"}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <ActionMenu
          label={`Actions for ${r.name}`}
          items={[
            { icon: Pencil, label: "Edit rules", onSelect: () => openEditor(r) },
            { separator: true },
            {
              icon: Trash2,
              label: "Delete",
              variant: "destructive",
              onSelect: () => setDeleteTarget(r),
            },
          ]}
        />
      ),
    },
  ];

  if (editing) {
    return (
      <MainScreenWrapper>
        <ScreenHeader
          title={editing.name}
          description="Stored as a rule tree (rule jsonb); the member count previews against live profiles."
          actions={
            <Button variant="outline" onClick={() => setEditing(null)}>
              <ArrowLeft className="h-4 w-4" /> All segments
            </Button>
          }
        />
        <StatsBar stats={stats} />
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Rules"
            description="Field is trait.<key>, a bare trait key, or events.<type>."
            className="lg:col-span-2"
          >
            <RuleBuilder
              rule={draftRule}
              onChange={setDraftRule}
              fieldHints={fieldHints}
            />
            <div className="mt-4">
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSaveRules}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save rules"}
              </Button>
            </div>
          </SectionCard>
          <SectionCard title="Member preview" description="Live match count.">
            <p className="text-4xl font-semibold tabular-nums text-foreground">
              {scopeLoading || previewCount === null ? "…" : previewCount}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              of {contexts.length} profiles match
              {draftRule?.op === "or" ? " any" : " all"} of{" "}
              {(draftRule?.conditions || []).length} rules.
            </p>
            {(draftRule?.conditions || []).length === 0 ? (
              <div className="mt-3">
                <Badge variant="neutral">Empty rule matches everyone</Badge>
              </div>
            ) : null}
          </SectionCard>
        </div>
      </MainScreenWrapper>
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Segments"
        description="Reusable audience groups defined by trait and behavior rules."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create segment
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search segments…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          onRowClick={(r) => openEditor(r)}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Filter}
                title={rows.length ? "No segments match" : "No segments yet"}
                description={
                  rows.length
                    ? "Try clearing the search."
                    : "Create your first segment, then add trait and behavior rules."
                }
                action={
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> Create segment
                  </Button>
                }
              />
            </div>
          }
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl bg-background">
          <DialogHeader>
            <DialogTitle>Create segment</DialogTitle>
            <DialogDescription>
              Name it now — you add the matching rules in the builder.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Name" htmlFor="segment-name">
              <Input
                id="segment-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="e.g. Power users"
                autoFocus
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreate}
            >
              Create segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => handleDelete(deleteTarget)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

// Re-exported for unit tests and the builder preview.
export { evaluateSegment };

export default SegmentsScreen;
