"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";

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
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { Switch } from "@geiger/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { ActionMenu } from "@geiger/ui/action-menu";
import { ENFORCED_MAP, formatDate, newId } from "./constants";
import {
  createPolicy,
  listPolicies,
  softDeletePolicy,
  updatePolicy,
} from "@/lib/supabase/policies";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

function parseRules(text) {
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Rules must be a JSON object.");
  }
  return parsed;
}

function PolicyDialog({ open, onOpenChange, initial, onSave }) {
  // Form state initializes from `initial` on mount. Callers pass a distinct
  // `key` per edited policy (and reset on submit for the create case), so no
  // sync-on-open effect is needed.
  const [name, setName] = useState(initial?.name || "");
  const [rulesText, setRulesText] = useState(
    initial ? JSON.stringify(initial.rules || {}, null, 2) : "{}",
  );
  const [enforced, setEnforced] = useState(initial?.enforced ?? true);

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give the policy a name first.");
      return;
    }
    let rules;
    try {
      rules = parseRules(rulesText);
    } catch {
      toast.error("Rules must be valid JSON (an object).");
      return;
    }
    onSave({ name: name.trim(), rules, enforced });
    // Reset so the next "create" opens blank (the edit instance remounts by key).
    setName("");
    setRulesText("{}");
    setEnforced(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit policy" : "Create policy"}</DialogTitle>
          <DialogDescription>
            Name the guardrail, express its rules as JSON, and choose whether
            it is enforced or kept as a draft.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Legal review required"
              autoFocus
            />
          </Field>
          <Field label="Rules (JSON)">
            <Textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder='{"requiresApproval": true}'
            />
          </Field>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">
                Enforced
              </span>
              <span className="block text-xs text-text-secondary">
                Disabled policies are kept as drafts.
              </span>
            </span>
            <Switch checked={enforced} onCheckedChange={setEnforced} />
          </label>
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
            {initial ? "Save policy" : "Create policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContentPoliciesScreen() {
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
    listPolicies(projectId).then((result) => {
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
      if (
        search &&
        !r.name.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search]);

  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const enforced = rows.filter((r) => r.enforced).length;
    return [
      { label: "Total policies", value: String(rows.length), footer: `${enforced} enforced` },
      { label: "Enforced", value: String(enforced), footer: "Actively applied" },
      { label: "Drafts", value: String(rows.length - enforced), footer: "Not enforced" },
      {
        label: "Rule keys",
        value: String(rows.reduce((n, r) => n + Object.keys(r.rules || {}).length, 0)),
        footer: "Across policies",
      },
    ];
  }, [rows]);

  const handleCreate = async ({ name, rules, enforced }) => {
    const optimistic = {
      id: newId(),
      name,
      rules,
      enforced,
      projectId,
      createdBy: userId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createPolicy(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the policy to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleUpdate = async ({ name, rules, enforced }) => {
    if (!editing) return;
    const prev = rows;
    setRows((rows) =>
      rows.map((r) =>
        r.id === editing.id ? { ...r, name, rules, enforced } : r,
      ),
    );
    setEditing(null);
    const saved = await updatePolicy(editing.id, { name, rules, enforced });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    } else {
      setRows((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
      toast.success("Policy saved.");
    }
  };

  const handleToggle = async (row) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, enforced: !r.enforced } : r)),
    );
    const saved = await updatePolicy(row.id, { enforced: !row.enforced });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't flip enforcement on the server.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeletePolicy(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the policy on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Policy",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            {Object.keys(r.rules || {}).length}{" "}
            {(Object.keys(r.rules || {}).length === 1 ? "rule" : "rules")}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "enforced",
      header: "State",
      render: (r) => (
        <StatusPill
          status={r.enforced ? "Enforced" : "Disabled"}
          map={ENFORCED_MAP}
        />
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
            {
              icon: ClipboardCheck,
              label: r.enforced ? "Disable" : "Enforce",
              onSelect: () => handleToggle(r),
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
        title="Content Policies"
        description="Named editorial guardrails with JSON rules — enforced policies apply, disabled ones stay as drafts."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create policy
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search policies…"
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
                  icon={ClipboardCheck}
                  title={rows.length ? "No policies match your filters" : "No policies yet"}
                  description={
                    rows.length
                      ? "Try clearing the search, or create a new policy."
                      : "Create your first content policy to guard publishing."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create policy
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="policies" />
        </div>
      )}

      <PolicyDialog
        key="create-policy"
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={null}
        onSave={handleCreate}
      />
      <PolicyDialog
        key={editing?.id || "edit-policy"}
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
            <DialogTitle>Delete policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Its rules stop applying immediately.
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

export default ContentPoliciesScreen;
