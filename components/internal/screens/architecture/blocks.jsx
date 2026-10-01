"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Component, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  createBlock,
  createInstance,
  listBlocks,
  listInstancesByEntry,
  softDeleteBlock,
  softDeleteInstance,
  updateBlock,
} from "@/lib/supabase/blocks";
import { listContent } from "@/lib/supabase/content";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { keyify, newId } from "./constants";

import { LoadingArea } from "@geiger/ui";
const EMPTY_DRAFT = { key: "", name: "", schemaText: "{}" };

function BlockDialog({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() =>
    initial
      ? {
          key: initial.key,
          name: initial.name,
          schemaText: JSON.stringify(initial.schema || {}, null, 2),
        }
      : EMPTY_DRAFT,
  );
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give the block a name first.");
      return;
    }
    let schema = {};
    try {
      schema = draft.schemaText.trim() ? JSON.parse(draft.schemaText) : {};
    } catch {
      toast.error("Block schema must be valid JSON.");
      return;
    }
    onSave({
      key: draft.key.trim() || keyify(draft.name),
      name: draft.name.trim(),
      schema,
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit block" : "New block"}</DialogTitle>
          <DialogDescription>
            Reusable chunks — hero, quote, CTA — pinned to entries as instances.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" htmlFor="block-name">
              <Input
                id="block-name"
                value={draft.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="e.g. Hero"
                autoFocus
              />
            </Field>
            <Field label="Key" hint="Auto-filled from the name.">
              <Input
                value={draft.key}
                onChange={(e) => set("key")(e.target.value)}
                placeholder="hero"
              />
            </Field>
          </div>
          <Field label="Schema (JSON)" hint="Shape of the instance data payload.">
            <Textarea
              value={draft.schemaText}
              onChange={(e) => set("schemaText")(e.target.value)}
              rows={5}
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
            {initial ? "Save changes" : "Create block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BlocksScreen() {
  const [blocks, setBlocks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listBlocks(projectId), listContent(projectId)]).then(
      ([blockRows, entryRows]) => {
        if (!alive) return;
        setBlocks(blockRows ?? []);
        const list = entryRows ?? [];
        setEntries(list);
        setLoading(false);
        pickEntry(list[0]?.id || "");
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Entry switches reload instances in the handler so the previous entry's
  // pins never flash.
  function pickEntry(id) {
    setEntryId(id);
    if (!id) {
      setInstances([]);
      return;
    }
    setLoadingInstances(true);
    listInstancesByEntry(id).then((result) => {
      setInstances(result ?? []);
      setLoadingInstances(false);
    });
  }

  const blockById = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.id, b])),
    [blocks],
  );
  const entryById = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e])),
    [entries],
  );

  const filtered = useMemo(
    () =>
      blocks.filter(
        (b) =>
          !search ||
          `${b.name} ${b.key}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [blocks, search],
  );

  const stats = useMemo(
    () => [
      { label: "Reusable blocks", value: String(blocks.length) },
      {
        label: "Instances here",
        value: String(instances.length),
        footer: entryById[entryId]?.title || "No entry selected",
      },
      {
        label: "Entries",
        value: String(entries.length),
        footer: "Can host instances",
      },
    ],
    [blocks, instances, entries, entryById, entryId],
  );

  const handleSaveBlock = async (draft) => {
    if (editing) {
      const prev = blocks;
      setBlocks((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateBlock(editing.id, draft);
      if (!saved) {
        setBlocks(prev);
        toast.error("Couldn't save the block.");
        return;
      }
      toast.success(`Block "${saved.name}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = {
      id: newId(),
      name: draft.name,
      key: draft.key,
      schema: draft.schema,
      createdBy: userId,
      projectId,
    };
    setBlocks((prev) => [optimistic, ...prev]);
    const saved = await createBlock(optimistic);
    if (!saved) {
      setBlocks((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the block.");
      return;
    }
    setBlocks((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Block "${saved.name}" created.`);
  };

  const handleDeleteBlock = async (row) => {
    setDeleteTarget(null);
    const prev = blocks;
    setBlocks((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted block "${row.name}".`);
    const ok = await softDeleteBlock(row.id);
    if (!ok) {
      setBlocks(prev);
      toast.error("Couldn't delete the block on the server.");
    }
  };

  const handleAddInstance = async (blockId) => {
    if (!entryId || !blockId) return;
    const optimistic = {
      id: newId(),
      blockId,
      entryId,
      position: instances.length,
      data: {},
      createdBy: userId,
    };
    setInstances((prev) => [...prev, optimistic]);
    const saved = await createInstance(optimistic);
    if (!saved) {
      setInstances((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't pin the block to this entry.");
      return;
    }
    setInstances((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Pinned "${blockById[blockId]?.name || "block"}" to the entry.`);
  };

  const handleRemoveInstance = async (row) => {
    const prev = instances;
    setInstances((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteInstance(row.id);
    if (!ok) {
      setInstances(prev);
      toast.error("Couldn't remove the instance on the server.");
      return;
    }
    toast.success("Instance removed.");
  };

  const columns = [
    {
      key: "name",
      header: "Block",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {r.key || "no key"} · {Object.keys(r.schema || {}).length} schema keys
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
        title="Reusable Blocks"
        description="Define blocks once, pin instances to entries with their own data."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New block
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div />
        <SearchInput value={search} onChange={setSearch} placeholder="Search blocks…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Component}
                  title={blocks.length ? "No blocks match your filters" : "No blocks yet"}
                  description="Blocks are reusable chunks — hero, quote, CTA — with a JSON schema."
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New block
                    </Button>
                  }
                />
              </div>
            }
          />
          <SectionCard
            title="Instances on entry"
            description="Pin a block to the selected entry. Position follows list order."
            action={
              <div className="flex items-center gap-2">
                <Select value={entryId} onValueChange={pickEntry}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select an entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {entries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value="" onValueChange={handleAddInstance}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Pin a block…" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            {loadingInstances ? (
              <LoadingArea className="py-6" label="Loading instances" />
            ) : instances.length === 0 ? (
              <p className="text-sm text-text-secondary">
                No instances on this entry yet — pin a block above.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {instances.map((inst) => (
                  <li key={inst.id} className="flex items-center justify-between py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {blockById[inst.blockId]?.name || "Unknown block"}
                      </span>
                      <span className="font-mono text-xs text-text-secondary">
                        position {inst.position} · {JSON.stringify(inst.data)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Remove instance of ${blockById[inst.blockId]?.name || "block"}`}
                      className="text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemoveInstance(inst)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
      {dialogOpen && (
        <BlockDialog
          initial={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSaveBlock}
        />
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete block</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              Its instances go with it. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => handleDeleteBlock(deleteTarget)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainScreenWrapper>
  );
}

export default BlocksScreen;
