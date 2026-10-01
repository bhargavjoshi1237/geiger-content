"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Database, Pencil, Plug, PlugZap, Trash2, Unplug } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
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
import {
  createSource,
  listSources,
  softDeleteSource,
  updateSource,
} from "@/lib/supabase/sources";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import {
  SOURCE_STATUSES,
  SOURCE_STATUS_FILTER_OPTIONS,
  SOURCE_STATUS_MAP,
  SOURCE_TYPES,
  SOURCE_TYPE_MAP,
  newId,
} from "./constants";

const EMPTY_DRAFT = { name: "", type: "API", url: "", status: "Disconnected" };

function SourceDialog({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial || EMPTY_DRAFT);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give the source a name first.");
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), url: draft.url.trim() });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit source" : "New external source"}</DialogTitle>
          <DialogDescription>
            Connection rows for feeds and APIs content can be imported from.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Name" htmlFor="source-name">
            <Input
              id="source-name"
              value={draft.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Docs RSS feed"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={draft.type} onValueChange={set("type")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SOURCE_TYPE_MAP[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={draft.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="URL" hint="Endpoint, feed URL, or connection string.">
            <Input
              value={draft.url}
              onChange={(e) => set("url")(e.target.value)}
              placeholder="https://…"
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
            {initial ? "Save changes" : "Create source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SourcesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listSources(projectId).then((result) => {
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
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (
          search &&
          !`${r.name} ${r.url}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [rows, search, status],
  );

  const stats = useMemo(() => {
    const count = (fn) => rows.filter(fn).length;
    return [
      { label: "Sources", value: String(rows.length) },
      {
        label: "Connected",
        value: String(count((r) => r.status === "Connected")),
        footer: "Ready to import from",
      },
      {
        label: "Needs attention",
        value: String(
          count((r) => r.status === "Error" || r.status === "Disconnected"),
        ),
        footer: "Error or disconnected",
      },
    ];
  }, [rows]);

  const handleSave = async (draft) => {
    if (editing) {
      const prev = rows;
      setRows((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateSource(editing.id, draft);
      if (!saved) {
        setRows(prev);
        toast.error("Couldn't save the source.");
        return;
      }
      toast.success(`Source "${saved.name}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), ...draft, createdBy: userId, projectId };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createSource(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the source.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Source "${saved.name}" created.`);
  };

  const handleStatus = async (row, next) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );
    const saved = await updateSource(row.id, { status: next });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the source status.");
      return;
    }
    toast.success(`"${row.name}" is now ${next.toLowerCase()}.`);
  };

  const handleDelete = async (row) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted "${row.name}".`);
    const ok = await softDeleteSource(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the source on the server.");
    }
  };

  const columns = [
    {
      key: "name",
      header: "Source",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="max-w-72 truncate text-xs text-text-secondary">
            {r.url || "no URL yet"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={SOURCE_TYPE_MAP[r.type]?.variant || "neutral"}>
          {SOURCE_TYPE_MAP[r.type]?.label || r.type}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={SOURCE_STATUS_MAP} />,
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
            r.status === "Connected"
              ? {
                  icon: Unplug,
                  label: "Disconnect",
                  onSelect: () => handleStatus(r, "Disconnected"),
                }
              : {
                  icon: PlugZap,
                  label: "Connect",
                  onSelect: () => handleStatus(r, "Connected"),
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
        title="External Sources"
        description="Feeds and APIs content can be imported from, with sync status."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plug className="h-4 w-4" /> New source
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex items-center gap-2">
          <FilterDropdown
            value={status}
            onValueChange={setStatus}
            options={SOURCE_STATUS_FILTER_OPTIONS}
            height="h-9"
          />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search sources…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Database}
                title={rows.length ? "No sources match your filters" : "No external sources yet"}
                description="Register an RSS feed, API, CSV drop, or upstream CMS."
                action={
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      setEditing(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plug className="h-4 w-4" /> New source
                  </Button>
                }
              />
            </div>
          }
        />
      )}
      {dialogOpen && (
        <SourceDialog
          initial={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete source</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
              This can&apos;t be undone.
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

export default SourcesScreen;
