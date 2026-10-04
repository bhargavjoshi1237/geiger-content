"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { LoadingArea } from "@geiger/ui";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
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
  createWorkflowState,
  listWorkflowStates,
  softDeleteWorkflowState,
  updateWorkflowState,
} from "@/lib/supabase/workflow";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { keyify, newId } from "../architecture/constants";

const EMPTY_DRAFT = { key: "", label: "", position: 0, isTerminal: false };

function StateDialog({ initial, position, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial || { ...EMPTY_DRAFT, position });
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.label.trim()) {
      toast.error("Give the state a label first.");
      return;
    }
    onSave({
      key: draft.key.trim() || keyify(draft.label),
      label: draft.label.trim(),
      position: Number(draft.position) || 0,
      isTerminal: Boolean(draft.isTerminal),
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:p-6 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit workflow state" : "New workflow state"}</DialogTitle>
          <DialogDescription>
            Approval gates from draft to done. Terminal states end the flow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="state-label">
              <Input
                id="state-label"
                value={draft.label}
                onChange={(e) => set("label")(e.target.value)}
                placeholder="e.g. Legal review"
                autoFocus
              />
            </Field>
            <Field label="Key" hint="Auto-filled from the label.">
              <Input
                value={draft.key}
                onChange={(e) => set("key")(e.target.value)}
                placeholder="legal_review"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Position">
              <Input
                type="number"
                value={draft.position}
                onChange={(e) => set("position")(e.target.value)}
              />
            </Field>
            <Field label="Terminal">
              <Select
                value={draft.isTerminal ? "yes" : "no"}
                onValueChange={(v) => set("isTerminal")(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No — flow continues</SelectItem>
                  <SelectItem value="yes">Yes — ends the flow</SelectItem>
                </SelectContent>
              </Select>
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
            {initial ? "Save changes" : "Create state"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkflowsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listWorkflowStates(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
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
          `${r.label} ${r.key}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  );

  const stats = useMemo(
    () => [
      { label: "States", value: String(rows.length), footer: "In this workflow" },
      {
        label: "Terminal",
        value: String(rows.filter((r) => r.isTerminal).length),
        footer: "End the flow",
      },
      {
        label: "Gates",
        value: String(rows.filter((r) => !r.isTerminal).length),
        footer: "Intermediate steps",
      },
    ],
    [rows],
  );

  const handleSave = async (draft) => {
    if (editing) {
      const prev = rows;
      setRows((rows) =>
        rows
          .map((r) => (r.id === editing.id ? { ...r, ...draft } : r))
          .sort((a, b) => a.position - b.position),
      );
      const saved = await updateWorkflowState(editing.id, draft);
      if (!saved) {
        setRows(prev);
        toast.error("Couldn't save the workflow state.");
        return;
      }
      toast.success(`State "${saved.label}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), ...draft, createdBy: userId, projectId };
    setRows((prev) => [...prev, optimistic].sort((a, b) => a.position - b.position));
    const saved = await createWorkflowState(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the workflow state.");
      return;
    }
    setRows((prev) =>
      prev
        .map((r) => (r.id === saved.id ? saved : r))
        .sort((a, b) => a.position - b.position),
    );
    toast.success(`State "${saved.label}" created.`);
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted state "${row.label}".`);
    const ok = await softDeleteWorkflowState(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the state on the server.");
    }
  };

  const columns = [
    {
      key: "label",
      header: "State",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground">{r.label}</span>
          <span className="truncate font-mono text-xs text-text-secondary">
            {r.key || "no key"} · position {r.position}
          </span>
        </div>
      ),
    },
    {
      key: "terminal",
      header: "Kind",
      render: (r) => (
        <Badge variant={r.isTerminal ? "success" : "info"}>
          {r.isTerminal ? "Terminal" : "Gate"}
        </Badge>
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
        title="Approval Workflows"
        description="Ordered gates entries travel from draft to done."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New state
          </Button>
        }
      />
      <StatsBar stats={stats} columns={3} />
      {!loading && rows.length > 0 ? (
        <SectionCard title="Flow" description="The order entries move through, by position.">
          <ol className="flex flex-wrap items-center gap-2">
            {rows.map((r, i) => (
              <li key={r.id} className="flex min-w-0 items-center gap-2">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden />
                ) : null}
                <Badge variant={r.isTerminal ? "success" : "neutral"} className="max-w-[12rem]">
                  <span className="truncate">{r.label}</span>
                </Badge>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : null}
      <Toolbar>
        <span className="text-sm text-text-secondary">
          {filtered.length} of {rows.length} state{rows.length === 1 ? "" : "s"}
        </span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search states…" />
      </Toolbar>
      {loading ? (
        <LoadingArea panel size={48} label="Loading workflow states" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Workflow}
                title={rows.length ? "No states match your search" : "No workflow states yet"}
                description={
                  rows.length
                    ? "Try a different search term."
                    : "Draft → In review → Published is the default flow; add gates like Legal review."
                }
                action={
                  rows.length ? (
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  ) : (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New state
                    </Button>
                  )
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <StateDialog
          initial={editing}
          position={rows.length}
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

export default WorkflowsScreen;
