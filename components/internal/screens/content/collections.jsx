"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
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
import {
  COLLECTION_STATUS_MAP,
  formatDate,
  newId,
  slugify,
} from "./constants";
import {
  createCollection,
  listCollections,
  softDeleteCollection,
  updateCollection,
} from "@/lib/supabase/collections";
import { getUser } from "@/lib/supabase/user";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { CollectionDetailScreen } from "./collection_detail";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(COLLECTION_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

function CreateCollectionDialog({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give your collection a name first.");
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
          <DialogTitle>Create collection</DialogTitle>
          <DialogDescription>
            Group related entries into a reusable, queryable set. Add entries
            in the editor.
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
              placeholder="e.g. Homepage features"
              autoFocus
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What belongs in this collection?"
              rows={3}
            />
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
            Create collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CollectionsScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { collectionId, openCollection, closeCollection } = useWorkspaceUrl();
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  const selected = useMemo(
    () =>
      collectionId ? rows.find((r) => r.id === collectionId) || null : null,
    [collectionId, rows],
  );

  useEffect(() => {
    let alive = true;
    listCollections(projectId).then((result) => {
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
        !`${r.name} ${r.slug} ${r.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, status]);

  const pager = usePagination(filtered, { resetKey: `${search}|${status}` });

  const stats = useMemo(() => {
    const published = rows.filter((r) => r.status === "Published").length;
    const drafts = rows.filter((r) => r.status === "Draft").length;
    const items = rows.reduce((n, r) => n + (r.itemCount || 0), 0);
    return [
      { label: "Total collections", value: String(rows.length), footer: `${published} published` },
      { label: "Published", value: String(published), footer: "Live in delivery" },
      { label: "Drafts", value: String(drafts), footer: "Not yet published" },
      { label: "Linked entries", value: String(items), footer: "Across collections" },
    ];
  }, [rows]);

  const refreshCounts = async () => {
    const result = await listCollections(projectId);
    if (result) setRows(result);
  };

  const handleCreate = async ({ name, description }) => {
    const optimistic = {
      id: newId(),
      name,
      slug: slugify(name),
      description: description || "",
      status: "Draft",
      coverUrl: "",
      itemCount: 0,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createCollection(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the collection to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.name}" created.`);
  };

  const handleUpdate = async (updated) => {
    const prev = rows;
    setRows((rows) =>
      rows.map((r) => (r.id === updated.id ? { ...updated, itemCount: r.itemCount } : r)),
    );
    const saved = await updateCollection(updated.id, updated);
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
    const ok = await softDeleteCollection(row.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the collection on the server.");
    }
  };

  const handleDuplicate = async (row) => {
    const optimistic = {
      ...row,
      id: newId(),
      name: `${row.name} (copy)`,
      slug: `${row.slug}-copy`,
      status: "Draft",
      itemCount: 0,
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createCollection(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the collection.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Duplicated "${row.name}".`);
  };

  const columns = [
    {
      key: "name",
      header: "Collection",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.name}</span>
          <span className="text-xs text-text-secondary">
            /{r.slug || "no-slug"} · {r.itemCount ?? 0}{" "}
            {(r.itemCount ?? 0) === 1 ? "entry" : "entries"}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={COLLECTION_STATUS_MAP} />,
    },
    {
      key: "items",
      header: "Items",
      render: (r) => (
        <span className="text-sm text-text-secondary">{r.itemCount ?? 0}</span>
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
            { icon: Pencil, label: "Edit", onSelect: () => openCollection(r.id) },
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
      <CollectionDetailScreen
        collection={selected}
        onBack={closeCollection}
        onUpdate={handleUpdate}
        onMembersChanged={refreshCounts}
      />
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Collections"
        description="Group related entries into reusable, queryable sets with manual ordering and delivery settings."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create collection
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
          placeholder="Search collections…"
        />
      </Toolbar>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Collections…
        </div>
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            onRowClick={(r) => openCollection(r.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={FolderKanban}
                  title={rows.length ? "No collections match your filters" : "No collections yet"}
                  description={
                    rows.length
                      ? "Try clearing the search or filters, or create a new collection."
                      : "Create your first collection to group entries into queryable sets."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create collection
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="collections" />
        </div>
      )}

      <CreateCollectionDialog
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
            <DialogTitle>Delete collection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              ? Entries stay untouched — only the grouping is removed.
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

export default CollectionsScreen;
