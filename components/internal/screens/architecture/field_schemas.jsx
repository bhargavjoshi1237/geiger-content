"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Braces, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
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
  createField,
  listContentTypes,
  listFieldsByType,
  softDeleteField,
  updateField,
} from "@/lib/supabase/types";
import { useProject } from "@/context/project-context";
import {
  DATA_TYPE_FILTER_OPTIONS,
  DATA_TYPE_MAP,
  DATA_TYPES,
  keyify,
  newId,
} from "./constants";

const EMPTY_DRAFT = {
  key: "",
  label: "",
  dataType: "text",
  localized: false,
  position: 0,
  validationText: "{}",
};

function FieldDialog({ initial, position, onClose, onSave }) {
  const [draft, setDraft] = useState(() =>
    initial
      ? {
          key: initial.key,
          label: initial.label,
          dataType: initial.dataType,
          localized: initial.localized,
          position: initial.position,
          validationText: JSON.stringify(initial.validation || {}, null, 2),
        }
      : { ...EMPTY_DRAFT, position },
  );
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.label.trim()) {
      toast.error("Give the field a label first.");
      return;
    }
    let validation = {};
    try {
      validation = draft.validationText.trim()
        ? JSON.parse(draft.validationText)
        : {};
    } catch {
      toast.error("Validation rules must be valid JSON.");
      return;
    }
    onSave({
      key: draft.key.trim() || keyify(draft.label),
      label: draft.label.trim(),
      dataType: draft.dataType,
      localized: Boolean(draft.localized),
      position: Number(draft.position) || 0,
      validation,
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:p-6 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit field" : "New field"}</DialogTitle>
          <DialogDescription>
            Validation rules are JSON: e.g. {"{"} &quot;required&quot;: true,
            &quot;maxLength&quot;: 120 {"}"}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="field-label">
              <Input
                id="field-label"
                value={draft.label}
                onChange={(e) => set("label")(e.target.value)}
                placeholder="e.g. Standfirst"
                autoFocus
              />
            </Field>
            <Field label="Key" hint="Auto-filled from the label.">
              <Input
                value={draft.key}
                onChange={(e) => set("key")(e.target.value)}
                placeholder="standfirst"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Data type">
              <Select value={draft.dataType} onValueChange={set("dataType")}>
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DATA_TYPE_MAP[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Position">
              <Input
                type="number"
                value={draft.position}
                onChange={(e) => set("position")(e.target.value)}
              />
            </Field>
            <Field label="Localized">
              <Select
                value={draft.localized ? "yes" : "no"}
                onValueChange={(v) => set("localized")(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Validation rules (JSON)">
            <Textarea
              value={draft.validationText}
              onChange={(e) => set("validationText")(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            {initial ? "Save changes" : "Create field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FieldSchemasScreen() {
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState("");
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContentTypes(projectId).then((result) => {
      if (!alive) return;
      const list = result ?? [];
      setTypes(list);
      setLoading(false);
      pickType(list[0]?.id || "");
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Selection changes fetch in the handler (never in an effect), so
  // switching types never flashes the previous schema.
  function pickType(id) {
    setTypeId(id);
    if (!id) {
      setFields([]);
      return;
    }
    setLoadingFields(true);
    listFieldsByType(id).then((result) => {
      setFields(result ?? []);
      setLoadingFields(false);
    });
  }

  const activeType = useMemo(
    () => types.find((t) => t.id === typeId) || null,
    [types, typeId],
  );

  const filtered = useMemo(
    () =>
      fields.filter((f) => {
        if (typeFilter !== "all" && f.dataType !== typeFilter) return false;
        if (
          search &&
          !`${f.label} ${f.key}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [fields, search, typeFilter],
  );

  const stats = useMemo(
    () => [
      {
        label: "Fields",
        value: String(fields.length),
        footer: activeType ? `On ${activeType.name}` : "No type selected",
      },
      {
        label: "Required",
        value: String(fields.filter((f) => f.validation?.required).length),
        footer: "Must have a value",
      },
      {
        label: "Localized",
        value: String(fields.filter((f) => f.localized).length),
        footer: "Vary per locale",
      },
      {
        label: "With rules",
        value: String(fields.filter((f) => Object.keys(f.validation || {}).length).length),
        footer: "Have validation",
      },
    ],
    [fields, activeType],
  );

  const handleSave = async (draft) => {
    if (editing) {
      const prev = fields;
      setFields((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateField(editing.id, draft);
      if (!saved) {
        setFields(prev);
        toast.error("Couldn't save the field.");
        return;
      }
      toast.success(`Field "${saved.label}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), typeId, ...draft };
    setFields((prev) => [...prev, optimistic].sort((a, b) => a.position - b.position));
    const saved = await createField(optimistic);
    if (!saved) {
      setFields((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the field.");
      return;
    }
    setFields((prev) =>
      prev.map((r) => (r.id === saved.id ? saved : r)),
    );
    toast.success(`Field "${saved.label}" created.`);
  };

  const handleDelete = async (row) => {
    const prev = fields;
    setFields((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted field "${row.label}".`);
    const ok = await softDeleteField(row.id);
    if (!ok) {
      setFields(prev);
      toast.error("Couldn't delete the field on the server.");
    }
  };

  const columns = [
    {
      key: "label",
      header: "Field",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground" title={r.label}>{r.label}</span>
          <span className="truncate text-xs text-text-secondary">
            {r.key} · position {r.position}
            {r.validation?.required ? " · required" : ""}
            {r.localized ? " · localized" : ""}
          </span>
        </div>
      ),
    },
    {
      key: "dataType",
      header: "Type",
      render: (r) => (
        <Badge variant={DATA_TYPE_MAP[r.dataType]?.variant || "neutral"}>
          {DATA_TYPE_MAP[r.dataType]?.label || r.dataType}
        </Badge>
      ),
    },
    {
      key: "rules",
      header: "Rules",
      render: (r) => (
        <span className="block max-w-56 truncate font-mono text-xs text-text-secondary" title={JSON.stringify(r.validation || {})}>
          {Object.keys(r.validation || {}).length
            ? JSON.stringify(r.validation)
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <ActionMenu
          label={`Actions for ${r.label}`}
          items={[
            {
              icon: Pencil,
              label: "Edit",
              onSelect: () => {
                setEditing(r);
                setDialogOpen(true);
              },
            },
            { separator: true },
            {
              icon: Trash2,
              label: "Delete",
              variant: "destructive",
              onSelect: () => handleDelete(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Field Schemas"
        description="Fields belong to a content type and validate entries.data on save."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!typeId}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New field
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeId} onValueChange={pickType} disabled={!types.length}>
            <SelectTrigger className="h-9 w-full sm:w-56" aria-label="Content type">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FilterDropdown
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={DATA_TYPE_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search fields…" />
      </Toolbar>
      {loading || loadingFields ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Braces}
                title={
                  !types.length
                    ? "Create a content type first"
                    : fields.length
                      ? "No fields match your filters"
                      : `No fields on ${activeType?.name || "this type"} yet`
                }
                description={
                  !types.length
                    ? "Fields attach to a type — define one under Content Types."
                    : fields.length
                      ? "Try clearing the search or data type filter."
                      : "Add typed, validated fields entries must fill in."
                }
                action={
                  typeId ? (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New field
                    </Button>
                  ) : undefined
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <FieldDialog
          initial={editing}
          position={fields.length}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </MainScreenWrapper>
  );
}

export default FieldSchemasScreen;
