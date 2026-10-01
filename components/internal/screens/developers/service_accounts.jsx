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
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import {
  createServiceAccount,
  listServiceAccounts,
  softDeleteServiceAccount,
  updateServiceAccount,
} from "@/lib/supabase/tokens";

const ROLE_MAP = {
  viewer: { label: "Viewer", variant: "neutral" },
  editor: { label: "Editor", variant: "info" },
  admin: { label: "Admin", variant: "success" },
};

const ROLE_OPTIONS = Object.keys(ROLE_MAP);

function AccountDialog({ open, onOpenChange, initial, onSubmit }) {
  // Parent remounts via `key` per account, so initializers stay in sync
  // without an effect.
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "viewer");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give the account a name first.");
      return;
    }
    onSubmit({ name: name.trim(), role });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit service account" : "Create service account"}
          </DialogTitle>
          <DialogDescription>
            Named non-human identities for automation — CI jobs, sync workers,
            import scripts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. nightly-sync worker"
              autoFocus
            />
          </Field>
          <Field label="Role">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_MAP[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
            {initial ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ServiceAccountsScreen() {
  const { projectId } = useProject();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listServiceAccounts(projectId).then((result) => {
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
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.name} ${r.role}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(
    () => [
      { label: "Accounts", value: String(rows.length), footer: "This project" },
      {
        label: "Admins",
        value: String(rows.filter((r) => r.role === "admin").length),
        footer: "Full access",
      },
      {
        label: "Editors",
        value: String(rows.filter((r) => r.role === "editor").length),
        footer: "Write access",
      },
      {
        label: "Viewers",
        value: String(rows.filter((r) => r.role === "viewer").length),
        footer: "Read-only",
      },
    ],
    [rows],
  );

  const handleSubmit = async ({ name, role }) => {
    if (editing) {
      const prev = rows;
      setRows((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, name, role } : r)),
      );
      const saved = await updateServiceAccount(editing.id, { name, role });
      if (!saved) {
        setRows(prev);
        toast.error("Couldn't save your changes to the server.");
        return;
      }
      setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
      setEditing(null);
      toast.success(`"${saved.name}" updated.`);
      return;
    }
    const optimistic = {
      id: crypto.randomUUID(),
      name,
      role,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createServiceAccount(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the account to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteServiceAccount(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the account on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Account",
      render: (r) => (
        <span className="font-medium text-foreground">{r.name}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (r) => <StatusPill status={r.role} map={ROLE_MAP} />,
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
        title="Service Accounts"
        description="Non-human identities for automation, each with a workspace role."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Create account
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search accounts…"
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
                  title={rows.length ? "No accounts match your filters" : "No service accounts yet"}
                  description={
                    rows.length
                      ? "Try clearing the search."
                      : "Create one for each automation that talks to this workspace."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Create account
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="accounts" />
        </div>
      )}

      <AccountDialog
        key={editing ? editing.id : "new"}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete service account</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” loses access immediately. Automations using
              it will start failing.
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

export default ServiceAccountsScreen;
