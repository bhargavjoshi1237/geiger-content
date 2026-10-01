"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileJson, Pencil, Plus, Trash2 } from "lucide-react";

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
import { ActionMenu } from "@geiger/ui/action-menu";
import {
  createContentType,
  listContentTypes,
  listFieldsByType,
  softDeleteContentType,
  updateContentType,
} from "@/lib/supabase/types";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { keyify, newId } from "./constants";

const EMPTY_DRAFT = { key: "", name: "", icon: "" };

// Mounted fresh on every open (see `{dialogOpen && ...}` below), so the
// useState initializer seeds the draft — no reset effect is needed.
function TypeDialog({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial || EMPTY_DRAFT);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give the content type a name first.");
      return;
    }
    onSave({ ...draft, key: draft.key.trim() || keyify(draft.name) });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit content type" : "New content type"}</DialogTitle>
          <DialogDescription>
            Types declare the field schema entries are validated against.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="type-name">
            <Input
              id="type-name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Article"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Key" hint="Unique per project. Auto-filled from the name.">
              <Input
                value={draft.key}
                onChange={(e) => set("key")(e.target.value)}
                placeholder="article"
              />
            </Field>
            <Field label="Icon" hint="Lucide icon name, e.g. FileText.">
              <Input
                value={draft.icon}
                onChange={(e) => set("icon")(e.target.value)}
                placeholder="FileText"
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            {initial ? "Save changes" : "Create type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContentTypesScreen() {
  const [rows, setRows] = useState([]);
  const [fieldCounts, setFieldCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listContentTypes(projectId).then(async (result) => {
      if (!alive) return;
      const types = result ?? [];
      setRows(types);
      setLoading(false);
      const counts = await Promise.all(
        types.map(async (t) => [t.id, (await listFieldsByType(t.id)) ?? []]),
      );
      if (!alive) return;
      setFieldCounts(
        Object.fromEntries(counts.map(([id, fields]) => [id, fields.length])),
      );
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          `${r.name} ${r.key}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const stats = useMemo(() => {
    const withFields = rows.filter((r) => (fieldCounts[r.id] || 0) > 0).length;
    return [
      { label: "Content types", value: String(rows.length) },
      { label: "With fields", value: String(withFields), footer: "Have a schema" },
      {
        label: "Total fields",
        value: String(Object.values(fieldCounts).reduce((a, b) => a + b, 0)),
        footer: "Across all types",
      },
    ];
  }, [rows, fieldCounts]);

  const handleSave = async (draft) => {
    if (editing) {
      const prev = rows;
      setRows((rows) => rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)));
      const saved = await updateContentType(editing.id, draft);
      if (!saved) {
        setRows(prev);
        toast.error("Couldn't save the content type.");
        return;
      }
      setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
      toast.success(`"${saved.name}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = {
      id: newId(),
      name: draft.name.trim(),
      key: draft.key,
      icon: draft.icon || "",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createContentType(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the content type.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    const fields = await listFieldsByType(saved.id);
    setFieldCounts((c) => ({ ...c, [saved.id]: (fields ?? []).length }));
    toast.success(`"${saved.name}" created.`);
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteContentType(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the content type on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Content type",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {r.key || "no key"} · {fieldCounts[r.id] ?? 0} fields
          </span>
        </div>
      ),
    },
    {
      key: "icon",
      header: "Icon",
      render: (r) => (
        <span className="text-sm text-text-secondary">{r.icon || "—"}</span>
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
              onSelect: () => setDeleteTarget(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content Types"
        description="Structured models entries are authored against. Fields live under Field Schemas."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New type
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div />
        <SearchInput value={search} onChange={setSearch} placeholder="Search types…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={FileJson}
                title={rows.length ? "No types match your filters" : "No content types yet"}
                description={
                  rows.length
                    ? "Try clearing the search."
                    : "Define your first structured model — Article, Page, Product…"
                }
                action={
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      setEditing(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> New type
                  </Button>
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <TypeDialog
          initial={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete content type</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              Its fields go with it. This can&apos;t be undone.
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

export default ContentTypesScreen;
