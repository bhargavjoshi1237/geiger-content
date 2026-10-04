"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Cloud, Copy, Pencil, Plus, Star, Trash2, X } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
  Field,
} from "@geiger/ui/screen-kit";
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
import { ActionMenu } from "@geiger/ui/action-menu";
import { envKeyify, formatDate, newId } from "./constants";
import {
  createEnvironment,
  listEnvironments,
  setDefaultEnvironment,
  softDeleteEnvironment,
  updateEnvironment,
} from "@/lib/supabase/environments";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const EMPTY_DRAFT = { name: "", key: "" };

function CreateEnvironmentDialog({ open, onOpenChange, onCreate }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give your environment a name first.");
      return;
    }
    onCreate({ ...draft });
    setDraft(EMPTY_DRAFT);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create environment</DialogTitle>
          <DialogDescription>
            A named delivery target entries can be scoped to — production,
            staging, preview, and the like.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="env-name">
            <Input
              id="env-name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Production"
              autoFocus
            />
          </Field>
          <Field label="Key" htmlFor="env-key" hint="Derived from the name unless you override it.">
            <Input
              id="env-key"
              className="font-mono"
              value={draft.key || envKeyify(draft.name)}
              onChange={(e) => set("key")(e.target.value)}
              placeholder="production"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Create environment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnvironmentsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listEnvironments(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.key}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const def = rows.find((r) => r.isDefault);
    return [
      { label: "Total environments", value: String(rows.length), footer: def ? `Default: ${def.name}` : "No default set" },
      { label: "Default", value: def?.name || "—", footer: def ? `key: ${def.key}` : "Set one from row actions" },
      { label: "Others", value: String(rows.filter((r) => !r.isDefault).length), footer: "Non-default targets" },
    ];
  }, [rows]);

  const handleCreate = async (draft) => {
    const name = draft.name.trim();
    const optimistic = {
      id: newId(),
      key: draft.key.trim() || envKeyify(name),
      name,
      isDefault: rows.length === 0,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [...prev, optimistic]);
    const saved = await createEnvironment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the environment to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleSetDefault = async (row) => {
    const prev = rows;
    setRows((rows) => rows.map((r) => ({ ...r, isDefault: r.id === row.id })));
    const saved = await setDefaultEnvironment(projectId, row.id);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't set the default environment.");
      return;
    }
    setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : { ...r, isDefault: false })));
    toast.success(`"${row.name}" is now the default.`);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) {
      toast.error("Give your environment a name first.");
      return;
    }
    const prev = rows;
    const next = { ...renameTarget, name: renameValue.trim() };
    setRows((rows) => rows.map((r) => (r.id === next.id ? next : r)));
    setRenameTarget(null);
    const saved = await updateEnvironment(next.id, { name: next.name });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't rename the environment.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteEnvironment(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the environment on the server.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = {
      ...row,
      id: newId(),
      key: `${row.key}_copy`,
      name: `${row.name} (copy)`,
      isDefault: false,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [...prev, optimistic]);
    const saved = await createEnvironment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the environment.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Duplicated "${row.name}".`);
  };

  const columns = [
    {
      key: "name",
      header: "Environment",
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            {r.name}
            {r.isDefault ? (
              <Badge variant="success">
                <Star className="h-3 w-3" /> Default
              </Badge>
            ) : null}
          </span>
          <span className="text-xs text-text-secondary">
            {r.isDefault ? "Unscoped reads resolve here" : "Scoped delivery target"}
          </span>
        </div>
      ),
    },
    {
      key: "key",
      header: "Key",
      render: (r) => (
        <span className="font-mono text-sm text-text-secondary">{r.key || "—"}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">{formatDate(r.updatedAt) || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            label={`Actions for ${r.name}`}
            items={[
              {
                icon: Pencil,
                label: "Rename",
                onSelect: () => {
                  setRenameTarget(r);
                  setRenameValue(r.name);
                },
              },
              { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
              ...(r.isDefault
                ? []
                : [{ icon: Check, label: "Set as default", onSelect: () => handleSetDefault(r) }]),
              { separator: true },
              {
                icon: Trash2,
                label: "Delete",
                variant: "destructive",
                onSelect: () => setDeleteTarget(r),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Environments"
        description="Named delivery targets — production, staging, preview. Entries scope to one via environment_id; unscoped reads fall back to the default."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create environment
          </Button>
        }
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search environments…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Cloud}
                  title={rows.length ? "No environments match your filters" : "No environments yet"}
                  description={
                    rows.length
                      ? "Try clearing the search."
                      : "Create production first — it becomes the default everything unscoped reads from."
                  }
                  action={
                    rows.length ? (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        <X className="h-4 w-4" /> Clear search
                      </Button>
                    ) : (
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> Create environment
                      </Button>
                    )
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="environments" />
        </div>
      )}

      <CreateEnvironmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename environment</DialogTitle>
            <DialogDescription>
              The key stays the same — delivery references keep working.
            </DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="env-rename">
            <Input
              id="env-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename();
                }
              }}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Scoped entries become unscoped (they fall back to the default).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
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

export default EnvironmentsScreen;
