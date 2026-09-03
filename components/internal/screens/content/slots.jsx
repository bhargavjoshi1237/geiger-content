"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Blocks,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ListPagination,
  usePagination,
} from "@/components/internal/shared/pagination";
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
import { SLOT_STATUS_MAP, formatDate, newId, slotKeyify } from "./constants";
import {
  createSlot,
  listSlots,
  softDeleteSlot,
  updateSlot,
} from "@/lib/supabase/slots";
import { getUser } from "@/lib/supabase/user";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { SlotDetailScreen } from "./slot_detail";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(SLOT_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

function CreateSlotDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give your slot a name first.");
      return;
    }
    onCreate({ name: name.trim(), description });
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>Create slot</DialogTitle>
          <DialogDescription>
            Define a named location applications request. Wire eligible entries
            and a fallback in the editor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Homepage hero"
              autoFocus
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where is this slot used?"
              rows={3}
            />
          </Field>
          <p className="text-xs text-text-secondary">
            Key is derived from the name ({slotKeyify(name) || "…"}). You can
            change it in the editor.
          </p>
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
            Create slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SlotsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { slotId, openSlot, closeSlot } = useWorkspaceUrl();
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  const selected = useMemo(
    () => (slotId ? rows.find((r) => r.id === slotId) || null : null),
    [slotId, rows],
  );

  useEffect(() => {
    let alive = true;
    listSlots(projectId).then((result) => {
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
      if (status !== "all" && r.status !== status) return false;
      if (
        search &&
        !`${r.name} ${r.key} ${r.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, status]);

  const pager = usePagination(filtered, { resetKey: `${search}|${status}` });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Total slots", value: String(rows.length), footer: `${count((r) => r.status === "Active")} active` },
      { label: "Active", value: String(count((r) => r.status === "Active")), footer: "Serving delivery" },
      { label: "Paused", value: String(count((r) => r.status === "Paused")), footer: "Temporarily off" },
      { label: "Archived", value: String(count((r) => r.status === "Archived")), footer: "Retired slots" },
    ];
  }, [rows]);

  const handleCreate = async ({ name, description }) => {
    const optimistic = {
      id: newId(),
      key: slotKeyify(name),
      name,
      description: description || "",
      status: "Active",
      fallbackEntryId: null,
      eligibleEntryIds: [],
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createSlot(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the slot to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleUpdate = async (updated) => {
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    const saved = await updateSlot(updated.id, updated);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    }
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteSlot(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the slot on the server.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = {
      ...row,
      id: newId(),
      key: `${row.key}_copy`,
      name: `${row.name} (copy)`,
      status: "Paused",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createSlot(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the slot.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Duplicated "${row.name}".`);
  };

  const columns = [
    {
      key: "name",
      header: "Slot",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            key: {r.key || "—"}
            {` · ${(r.eligibleEntryIds || []).length} eligible`}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={SLOT_STATUS_MAP} />,
    },
    {
      key: "eligible",
      header: "Eligible",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {(r.eligibleEntryIds || []).length}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(r.updatedAt)}
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
            { icon: Pencil, label: "Edit", onSelect: () => openSlot(r.id) },
            { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
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

  if (selected) {
    return (
      <SlotDetailScreen
        slot={selected}
        onBack={closeSlot}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Content Slots"
        description="Named locations where applications request dynamic content — eligible entries, fallbacks, and delivery behavior."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create slot
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={status}
            onValueChange={setStatus}
            options={STATUS_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search slots, keys…"
        />
      </Toolbar>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Content Slots…
        </div>
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            onRowClick={(r) => openSlot(r.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Blocks}
                  title={rows.length ? "No slots match your filters" : "No slots yet"}
                  description={
                    rows.length
                      ? "Try clearing the search or filters, or create a new slot."
                      : "Create your first slot to give applications a named place to request content."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create slot
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="slots" />
        </div>
      )}

      <CreateSlotDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Applications requesting its key will fall back to defaults.
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

export default SlotsScreen;
