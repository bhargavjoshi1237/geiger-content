"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, TimerReset, Trash2 } from "lucide-react";

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
  StatusPill,
  Toolbar,
  Field,
} from "@geiger/ui/screen-kit";
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
import {
  RETENTION_ACTION_MAP,
  RETENTION_ACTION_OPTIONS,
  RETENTION_SCOPE_OPTIONS,
  formatDate,
  newId,
} from "./constants";
import {
  createRetentionPolicy,
  listRetentionPolicies,
  softDeleteRetentionPolicy,
  updateRetentionPolicy,
} from "@/lib/supabase/policies";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const SCOPE_LABEL = Object.fromEntries(
  RETENTION_SCOPE_OPTIONS.map((o) => [o.value, o.label]),
);

function RetentionDialog({ open, onOpenChange, initial, onSave }) {
  // State seeds from `initial` on mount; callers remount per edit via `key`.
  const [scope, setScope] = useState(initial?.scope || "entries");
  const [days, setDays] = useState(String(initial?.days ?? 365));
  const [action, setAction] = useState(initial?.action || "archive");

  const submit = () => {
    const parsed = Number(days);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Retention must be at least 1 day.");
      return;
    }
    onSave({ scope, days: Math.floor(parsed), action });
    // Reset so the next "create" opens blank (the edit instance remounts by key).
    setScope("entries");
    setDays("365");
    setAction("archive");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit retention rule" : "Create retention rule"}
          </DialogTitle>
          <DialogDescription>
            How long rows in one scope are kept, and what happens when they
            age out.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Scope" htmlFor="retention-scope">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger id="retention-scope">
                <SelectValue placeholder="Select a scope" />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Keep for (days)" htmlFor="retention-days">
            <Input
              id="retention-days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              inputMode="numeric"
              placeholder="365"
              autoFocus
            />
          </Field>
          <Field label="When expired" htmlFor="retention-action">
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger id="retention-action">
                <SelectValue placeholder="Select an action" />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {initial ? "Save rule" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RetentionScreen() {
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
    listRetentionPolicies(projectId).then((result) => {
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
    return rows.filter((r) => {
      if (!search) return true;
      return `${SCOPE_LABEL[r.scope] || r.scope} ${r.action}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const scopes = new Set(rows.map((r) => r.scope)).size;
    const shortest = rows.length
      ? Math.min(...rows.map((r) => r.days))
      : 0;
    return [
      { label: "Retention rules", value: String(rows.length), footer: `${scopes} scopes` },
      { label: "Scopes covered", value: String(scopes), footer: "With a rule" },
      { label: "Shortest window", value: rows.length ? `${shortest}d` : "—", footer: "Minimum keep" },
      {
        label: "Purge rules",
        value: String(rows.filter((r) => r.action === "purge").length),
        footer: "Hard deletes",
      },
    ];
  }, [rows]);

  const handleCreate = async ({ scope, days, action }) => {
    const optimistic = {
      id: newId(),
      scope,
      days,
      action,
      projectId,
      createdBy: userId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createRetentionPolicy(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the rule to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Retention rule created.");
  };

  const handleUpdate = async ({ scope, days, action }) => {
    if (!editing) return;
    const prev = rows;
    setRows((rows) =>
      rows.map((r) =>
        r.id === editing.id ? { ...r, scope, days, action } : r,
      ),
    );
    setEditing(null);
    const saved = await updateRetentionPolicy(editing.id, {
      scope,
      days,
      action,
    });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    } else {
      setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
      toast.success("Retention rule saved.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success("Retention rule deleted.");
    const ok = await softDeleteRetentionPolicy(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the rule on the server.");
    }
  };

  const columns = [
    {
      key: "scope",
      header: "Scope",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">
            {SCOPE_LABEL[r.scope] || r.scope}
          </span>
          {r.updatedAt ? (
            <span className="text-xs text-text-secondary">
              Updated {formatDate(r.updatedAt)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "days",
      header: "Keep for",
      render: (r) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-text-secondary">
          {r.days} {r.days === 1 ? "day" : "days"}
        </span>
      ),
    },
    {
      key: "action",
      header: "When expired",
      render: (r) => (
        <StatusPill status={r.action} map={RETENTION_ACTION_MAP} />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) => (
        <ActionMenu
          label={`Actions for ${SCOPE_LABEL[r.scope] || r.scope}`}
          items={[
            { icon: Pencil, label: "Edit", onSelect: () => setEditing(r) },
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
        title="Retention Policies"
        description="How long rows in each scope are kept, and whether expiry archives, soft-deletes, or purges them."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create rule
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search scopes, actions…"
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
                  icon={TimerReset}
                  title={rows.length ? "No rules match your filters" : "No retention rules yet"}
                  description={
                    rows.length
                      ? "Try a different search, or create a new rule."
                      : "Create your first retention rule to bound how long data is kept."
                  }
                  action={
                    rows.length ? (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    ) : (
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> Create rule
                      </Button>
                    )
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="rules" />
        </div>
      )}

      <RetentionDialog
        key="create-retention"
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={null}
        onSave={handleCreate}
      />
      <RetentionDialog
        key={editing?.id || "edit-retention"}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing}
        onSave={handleUpdate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete retention rule</DialogTitle>
            <DialogDescription>
              Remove the{" "}
              <span className="font-medium text-foreground">
                {SCOPE_LABEL[deleteTarget?.scope] || deleteTarget?.scope}
              </span>{" "}
              rule? That scope keeps data indefinitely until a new rule lands.
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

export default RetentionScreen;
