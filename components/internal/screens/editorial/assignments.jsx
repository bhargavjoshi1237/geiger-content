"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { LoadingArea } from "@geiger/ui";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
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
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { listContent } from "@/lib/supabase/content";
import {
  createAssignment,
  listAssignments,
  softDeleteAssignment,
  updateAssignment,
} from "@/lib/supabase/workflow";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_MAP,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_FILTER_OPTIONS,
  ASSIGNMENT_STATUS_MAP,
  formatDate,
  newId,
} from "./constants";

const EMPTY_DRAFT = {
  entryId: "",
  assignee: "",
  dueAt: "",
  status: "Open",
  priority: "Normal",
};

function AssignmentDialog({ initial, entries, onClose, onSave }) {
  const [draft, setDraft] = useState(() =>
    initial
      ? {
          entryId: initial.entryId,
          assignee: initial.assignee,
          dueAt: String(initial.dueAt || "").slice(0, 10),
          status: initial.status,
          priority: initial.priority,
        }
      : { ...EMPTY_DRAFT, entryId: entries[0]?.id || "" },
  );
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.entryId) {
      toast.error("Pick the entry to assign.");
      return;
    }
    if (!draft.assignee.trim()) {
      toast.error("Name the assignee first.");
      return;
    }
    onSave({
      ...draft,
      assignee: draft.assignee.trim(),
      dueAt: draft.dueAt || null,
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:p-6 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit assignment" : "New assignment"}</DialogTitle>
          <DialogDescription>
            Own an entry through review with a due date and priority.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Entry">
            <Select value={draft.entryId} onValueChange={set("entryId")}>
              <SelectTrigger>
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
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assignee" htmlFor="assign-who">
              <Input
                id="assign-who"
                value={draft.assignee}
                onChange={(e) => set("assignee")(e.target.value)}
                placeholder="e.g. ada@example.com"
                autoFocus
              />
            </Field>
            <Field label="Due date">
              <Input
                type="date"
                value={draft.dueAt}
                onChange={(e) => set("dueAt")(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={draft.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={draft.priority} onValueChange={set("priority")}>
                <SelectTrigger>
                  <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
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
            {initial ? "Save changes" : "Create assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentsScreen() {
  const [rows, setRows] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Frozen once per mount for the overdue stat — impure clocks can't run in render.
  const [now] = useState(() => Date.now());
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listAssignments(projectId), listContent(projectId)]).then(
      ([assignRows, entryRows]) => {
        if (!alive) return;
        setRows(assignRows ?? []);
        setEntries(entryRows ?? []);
        setLoading(false);
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const entryById = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e])),
    [entries],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (
          search &&
          !`${r.assignee} ${entryById[r.entryId]?.title || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [rows, search, status, entryById],
  );

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status !== "Done");
    const overdue = open.filter((r) => r.dueAt && new Date(r.dueAt).getTime() < now);
    const urgent = open.filter((r) => r.priority === "High" || r.priority === "Urgent");
    return [
      { label: "Assignments", value: String(rows.length), footer: "Across all entries" },
      { label: "Open", value: String(open.length), footer: "Not done yet" },
      { label: "Overdue", value: String(overdue.length), footer: "Past due date" },
      { label: "High priority", value: String(urgent.length), footer: "Open, high or urgent" },
    ];
  }, [rows, now]);

  const handleSave = async (draft) => {
    if (editing) {
      const prev = rows;
      setRows((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateAssignment(editing.id, draft);
      if (!saved) {
        setRows(prev);
        toast.error("Couldn't save the assignment.");
        return;
      }
      toast.success("Assignment updated.");
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), ...draft, createdBy: userId, projectId };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createAssignment(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the assignment.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Assigned to ${saved.assignee}.`);
  };

  const handleStatus = async (row, next) => {
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const saved = await updateAssignment(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the assignment.");
      return;
    }
    toast.success(`Marked ${next.toLowerCase()}.`);
  };

  const handleDelete = async (row) => {
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success("Assignment deleted.");
    const ok = await softDeleteAssignment(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the assignment on the server.");
    }
  };

  const columns = [
    {
      key: "entry",
      header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground">
            {entryById[r.entryId]?.title || "Deleted entry"}
          </span>
          <span className="truncate text-xs text-text-secondary">
            {r.assignee} ·{" "}
            <span
              className={
                r.status !== "Done" && r.dueAt && new Date(r.dueAt).getTime() < now
                  ? "text-red-400"
                  : undefined
              }
            >
              due {formatDate(r.dueAt)}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={ASSIGNMENT_STATUS_MAP} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (r) => (
        <Badge variant={ASSIGNMENT_PRIORITY_MAP[r.priority]?.variant || "neutral"}>
          {r.priority}
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
          label={`Actions for assignment on ${entryById[r.entryId]?.title || "entry"}`}
          items={[
            {
              icon: Pencil,
              label: "Edit",
              onSelect: () => {
                setEditing(r);
                setDialogOpen(true);
              },
            },
            ...(r.status !== "Done"
              ? [
                  {
                    icon: CheckCheck,
                    label: "Mark done",
                    onSelect: () => handleStatus(r, "Done"),
                  },
                ]
              : []),
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
        title="Assignments"
        description="Who owns which entry through review, and by when."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New assignment
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            value={status}
            onValueChange={setStatus}
            options={ASSIGNMENT_STATUS_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search assignees, entries…"
        />
      </Toolbar>
      {loading ? (
        <LoadingArea panel size={48} label="Loading assignments" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={UserCheck}
                title={rows.length ? "No assignments match your filters" : "No assignments yet"}
                description={
                  rows.length
                    ? "Try a different search or clear the status filter."
                    : "Route entries to owners with due dates and priorities."
                }
                action={
                  rows.length ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setStatus("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New assignment
                    </Button>
                  )
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <AssignmentDialog
          initial={editing}
          entries={entries}
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

export default AssignmentsScreen;
