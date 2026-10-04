"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Plug, Plus, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { ActionMenu } from "@geiger/ui/action-menu";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import {
  CONNECTION_STATUS_MAP,
  CONNECTION_TYPE_MAP,
  CONNECTION_TYPES,
  formatDate,
  newId,
} from "./constants";
import {
  createConnection,
  listConnections,
  softDeleteConnection,
  updateConnection,
} from "@/lib/supabase/data_connections";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(CONNECTION_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

function CreateConnectionDialog({ open, onOpenChange, onCreate }) {
  const [connName, setConnName] = useState("");
  const [connType, setConnType] = useState("webhook");

  const submit = () => {
    if (!connName.trim()) {
      toast.error("Give your connection a name first.");
      return;
    }
    onCreate({ name: connName.trim(), type: connType });
    setConnName("");
    setConnType("webhook");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create connection</DialogTitle>
          <DialogDescription>
            Register an external source feeding profiles and events — a
            warehouse sync, CDP, CSV import or API.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="conn-name">
            <Input
              id="conn-name"
              value={connName}
              onChange={(e) => setConnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Warehouse nightly sync"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <Select value={connType} onValueChange={setConnType}>
              <SelectTrigger>
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONNECTION_TYPE_MAP[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submit}
          >
            Create connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listConnections(projectId).then((result) => {
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
        !`${r.name} ${r.type}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, status]);

  const pager = usePagination(filtered, { resetKey: `${search}|${status}` });

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Total connections", value: String(rows.length), footer: `${count((r) => r.status === "Active")} active` },
      { label: "Active", value: String(count((r) => r.status === "Active")), footer: "Syncing" },
      { label: "Paused", value: String(count((r) => r.status === "Paused")), footer: "Temporarily off" },
      { label: "Error", value: String(count((r) => r.status === "Error")), footer: "Needs attention" },
    ];
  }, [rows]);

  const handleCreate = async ({ name, type }) => {
    const optimistic = {
      id: newId(),
      name,
      type,
      status: "Active",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createConnection(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the connection to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleStatus = async (row, nextStatus) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)),
    );
    const saved = await updateConnection(row.id, { status: nextStatus });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the connection.");
      return;
    }
    toast.success(`"${row.name}" ${nextStatus.toLowerCase()}.`);
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteConnection(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the connection on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Connection",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
          <span className="truncate font-medium text-foreground" title={r.name}>{r.name}</span>
          <span className="text-xs text-text-secondary">
            {CONNECTION_TYPE_MAP[r.type]?.label || r.type}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={CONNECTION_TYPE_MAP[r.type]?.variant || "neutral"}>
          {CONNECTION_TYPE_MAP[r.type]?.label || r.type}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusPill status={r.status} map={CONNECTION_STATUS_MAP} />
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
            ...(r.status === "Active"
              ? [{ icon: Pause, label: "Pause", onSelect: () => handleStatus(r, "Paused") }]
              : [{ icon: Play, label: "Activate", onSelect: () => handleStatus(r, "Active") }]),
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
        title="Data Connections"
        description="External sources feeding profiles and events — warehouse syncs, CDPs, imports and APIs."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create connection
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
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
          placeholder="Search connections…"
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
                  icon={Plug}
                  title={
                    rows.length
                      ? "No connections match your filters"
                      : "No connections yet"
                  }
                  description={
                    rows.length
                      ? "Try clearing the search or filters."
                      : "Connect a warehouse, CDP or import to feed audience data."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create connection
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="connections" />
        </div>
      )}

      <CreateConnectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="break-all font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Its sync history stops here.
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

export default ConnectionsScreen;
