"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";

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
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { Checkbox } from "@geiger/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { ActionMenu } from "@geiger/ui/action-menu";
import { formatDate, newId } from "./constants";
import { WORKSPACE_PERMISSIONS } from "@/lib/rbac";
import {
  createRole,
  ensureSystemRoles,
  listRoles,
  softDeleteRole,
  updateRole,
} from "@/lib/supabase/rbac";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const PERMISSION_GROUPS = WORKSPACE_PERMISSIONS.reduce((acc, p) => {
  const group = p.group || "Other";
  if (!acc.some((g) => g.name === group)) acc.push({ name: group, items: [] });
  acc.find((g) => g.name === group).items.push(p);
  return acc;
}, []);

function RoleDialog({ open, onOpenChange, initial, onSave }) {
  // Form state initializes from `initial` on mount. Callers pass a distinct
  // `key` per edited role (and reset on submit for the create case), so no
  // sync-on-open effect is needed.
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [permissions, setPermissions] = useState(initial?.permissions || []);

  const toggle = (key) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give the role a name first.");
      return;
    }
    onSave({ name: name.trim(), description, permissions });
    // Reset so the next "create" opens blank (the edit instance remounts by key).
    setName("");
    setDescription("");
    setPermissions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Rename the role or change which permission keys it carries."
              : "Define a custom role by composing permission keys from the catalog."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reviewer"
              autoFocus
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this role for?"
              rows={2}
            />
          </Field>
          <div className="grid gap-3">
            <span className="text-sm font-medium text-foreground">
              Permissions ({permissions.length} selected)
            </span>
            <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.name} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {group.name}
                  </p>
                  {group.items.map((p) => (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-start gap-2 text-sm"
                    >
                      <Checkbox
                        checked={permissions.includes(p.key)}
                        onCheckedChange={() => toggle(p.key)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="text-foreground">{p.label}</span>{" "}
                        <span className="text-xs text-text-secondary">
                          {p.key}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            {initial ? "Save role" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RolesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    getUser().then(async (u) => {
      if (!alive) return;
      setUserId(u?.id || null);
      // Idempotent: only fills in catalog roles the project is missing.
      const seeded = await ensureSystemRoles(projectId, u?.id ?? null);
      if (!alive) return;
      if (seeded?.length) {
        setRows(seeded);
        setLoading(false);
      } else {
        listRoles(projectId).then((result) => {
          if (!alive) return;
          setRows(result ?? []);
          setLoading(false);
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        search &&
        !`${r.name} ${r.key} ${r.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const system = rows.filter((r) => r.isSystem).length;
    return [
      { label: "Total roles", value: String(rows.length), footer: `${system} system` },
      { label: "System roles", value: String(system), footer: "From the catalog" },
      { label: "Custom roles", value: String(rows.length - system), footer: "Defined here" },
      {
        label: "Permission keys",
        value: String(WORKSPACE_PERMISSIONS.length),
        footer: "In the catalog",
      },
    ];
  }, [rows]);

  const handleCreate = async ({ name, description, permissions }) => {
    const optimistic = {
      id: newId(),
      projectId,
      key: null,
      name,
      description,
      color: "slate",
      permissions,
      isSystem: false,
      sort: rows.length,
      createdBy: userId,
    };
    setRows((prev) => [...prev, optimistic]);
    const saved = await createRole({
      ...optimistic,
      projectId,
      createdBy: userId,
    });
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the role to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleUpdate = async ({ name, description, permissions }) => {
    if (!editing) return;
    const prev = rows;
    setRows((rows) =>
      rows.map((r) =>
        r.id === editing.id ? { ...r, name, description, permissions } : r,
      ),
    );
    setEditing(null);
    const saved = await updateRole(editing.id, {
      name,
      description,
      permissions,
    });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    } else {
      setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
      toast.success("Role saved.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteRole(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the role on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Role",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {r.key ? `@${r.key}` : "custom"}
            {r.description ? ` · ${r.description}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {r.permissions?.includes("*")
            ? "Full access (*)"
            : `${r.permissions?.length ?? 0} keys`}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {r.isSystem ? "System" : "Custom"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(r.updatedAt || r.createdAt)}
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
          label={`Actions for ${r.name}`}
          items={[
            { icon: Pencil, label: "Edit", onSelect: () => setEditing(r) },
            ...(r.isSystem
              ? []
              : [
                  { separator: true },
                  {
                    icon: Trash2,
                    label: "Delete",
                    variant: "destructive",
                    onSelect: () => setDeleteTarget(r),
                  },
                ]),
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Roles"
        description="System roles from the catalog plus your custom roles — compose permission keys into reusable sets."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create role
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search roles…"
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
                  icon={UserCog}
                  title={rows.length ? "No roles match your filters" : "No roles yet"}
                  description={
                    rows.length
                      ? "Try clearing the search, or create a custom role."
                      : "Create your first custom role — system roles seed automatically."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create role
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="roles" />
        </div>
      )}

      <RoleDialog
        key="create-role"
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={null}
        onSave={handleCreate}
      />
      <RoleDialog
        key={editing?.id || "edit-role"}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing}
        onSave={handleUpdate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Members holding it keep their other grants.
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

export default RolesScreen;
