"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FilePlus2,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
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
  CONTENT_STATUS_FILTER_OPTIONS,
  CONTENT_STATUS_MAP,
  CONTENT_TYPE_FILTER_OPTIONS,
  CONTENT_TYPE_MAP,
  CONTENT_TYPES,
  formatDate,
  newContentId,
  slugify,
} from "./constants";
import {
  listContent,
  createContent,
  updateContent,
  softDeleteContent,
} from "@/lib/supabase/content";
import { getUser } from "@/lib/supabase/user";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { ContentDetailScreen } from "./content_detail";

const EMPTY_DRAFT = {
  title: "",
  type: "Article",
  excerpt: "",
  locale: "en",
};

function CreateEntryDialog({
  open,
  onOpenChange,
  onCreate,
  fixedStatus,
  fixedType,
  title: dialogTitle = "Create content",
}) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    if (!draft.title.trim()) {
      toast.error("Give your content a title first.");
      return;
    }
    onCreate({ ...draft });
    setDraft(EMPTY_DRAFT);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Set the essentials now — you can flesh out the body, media, and
            publishing settings in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Title" htmlFor="entry-title">
            <Input
              id="entry-title"
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. Getting started guide"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {fixedType ? null : (
              <Field label="Type">
                <Select value={draft.type} onValueChange={set("type")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Locale">
              <Select value={draft.locale} onValueChange={set("locale")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="en-IN">English — India (en-IN)</SelectItem>
                  <SelectItem value="de">German (de)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Excerpt">
            <Input
              value={draft.excerpt}
              onChange={(e) => set("excerpt")(e.target.value)}
              placeholder="One-line summary…"
            />
          </Field>
          {fixedStatus || fixedType ? (
            <p className="text-xs text-text-secondary">
              Creates as {fixedStatus || "Draft"}
              {fixedType ? ` · ${fixedType}` : ""}.
            </p>
          ) : null}
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
            Create content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Shared list behind All Content, Drafts, Pages, Scheduled and Archived.
// Those screens are status/type-filtered views over content.entries — one
// component, fixed via props, so the rhythm never drifts.
export function EntriesList({
  title,
  description,
  fixedStatus = null,
  fixedType = null,
  hideStatusFilter = false,
  hideTypeFilter = false,
  createStatus = "Draft",
  createType = "Article",
  backLabel,
  itemLabel = "entries",
  showSchedule = false,
  showRestore = false,
  emptyTitle = "No content yet",
  emptyDescription = "Create your first entry to start modeling, writing, and publishing.",
  createButtonLabel = "Create content",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { contentId, openContent, closeContent } = useWorkspaceUrl();
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  const selected = useMemo(
    () => (contentId ? rows.find((r) => r.id === contentId) || null : null),
    [contentId, rows],
  );

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Fixed scope first (the screen's identity), then the user's filters.
  const scoped = useMemo(() => {
    return rows.filter((r) => {
      if (fixedStatus && r.status !== fixedStatus) return false;
      if (fixedType && r.type !== fixedType) return false;
      return true;
    });
  }, [rows, fixedStatus, fixedType]);

  const filtered = useMemo(() => {
    return scoped.filter((r) => {
      if (!hideStatusFilter && status !== "all" && r.status !== status)
        return false;
      if (!hideTypeFilter && type !== "all" && r.type !== type) return false;
      if (
        search &&
        !`${r.title} ${r.slug} ${r.excerpt}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [scoped, search, status, type, hideStatusFilter, hideTypeFilter]);

  const pager = usePagination(filtered, {
    resetKey: `${search}|${status}|${type}|${fixedStatus}|${fixedType}`,
  });

  const stats = useMemo(() => {
    const count = (fn) => scoped.filter(fn).length;
    const base = [
      { label: `Total ${itemLabel}`, value: String(scoped.length) },
    ];
    if (fixedStatus === "Archived" || showRestore) {
      return [
        ...base,
        {
          label: "Pages",
          value: String(count((r) => r.type === "Page")),
          footer: "Page entries",
        },
        {
          label: "Articles",
          value: String(count((r) => r.type === "Article")),
          footer: "Article entries",
        },
        {
          label: "Guides & docs",
          value: String(
            count((r) => r.type === "Guide" || r.type === "Doc"),
          ),
          footer: "Structured entries",
        },
      ];
    }
    if (showSchedule) {
      const upcoming = count((r) => r.scheduledAt);
      return [
        ...base,
        { label: "Scheduled", value: String(upcoming), footer: "Has a date" },
        {
          label: "This view",
          value: String(filtered.length),
          footer: "Matching filters",
        },
        {
          label: "Published",
          value: String(count((r) => r.status === "Published")),
          footer: "Live in delivery",
        },
      ];
    }
    const published = count((r) => r.status === "Published");
    const inReview = count((r) => r.status === "In review");
    const drafts = count((r) => r.status === "Draft");
    return [
      {
        label: `Total ${itemLabel}`,
        value: String(scoped.length),
        footer: `${published} published`,
      },
      { label: "Published", value: String(published), footer: "Live in delivery" },
      { label: "In review", value: String(inReview), footer: "Awaiting approval" },
      { label: "Drafts", value: String(drafts), footer: "Not yet submitted" },
    ];
  }, [scoped, filtered.length, itemLabel, showRestore, showSchedule, fixedStatus]);

  const handleCreate = async (draft) => {
    const entryTitle = draft.title.trim();
    const optimistic = {
      id: newContentId(),
      title: entryTitle,
      slug: slugify(entryTitle),
      status: fixedStatus || createStatus,
      type: fixedType || draft.type || createType,
      excerpt: draft.excerpt || "",
      body: "",
      author: "",
      locale: draft.locale || "en",
      coverUrl: "",
      scheduledAt: null,
      publishedAt: null,
      updatedAt: new Date().toISOString().slice(0, 10),
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createContent(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the entry to the server.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`"${saved.title}" created.`);
  };

  const handleUpdate = async (updated) => {
    const prev = rows;
    setRows((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    const saved = await updateContent(updated.id, updated);
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save your changes to the server.");
    }
  };

  const handleDelete = async (entry) => {
    setDeleteTarget(null);
    const prev = rows;
    setRows((rows) => rows.filter((r) => r.id !== entry.id));
    toast.success(`Deleted "${entry.title}".`);
    const ok = await softDeleteContent(entry.id);
    if (!ok) {
      setRows(prev);
      toast.error("Couldn't delete the entry on the server.");
    }
  };

  const handleRestore = async (entry) => {
    const prev = rows;
    const next = { ...entry, status: "Draft" };
    setRows((rows) => rows.map((r) => (r.id === entry.id ? next : r)));
    const saved = await updateContent(entry.id, { status: "Draft" });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't restore the entry.");
      return;
    }
    toast.success(`Restored "${entry.title}" as a draft.`);
  };

  const handleDuplicate = async (entry) => {
    const optimistic = {
      ...entry,
      id: newContentId(),
      title: `${entry.title} (copy)`,
      slug: `${entry.slug}-copy`,
      status: "Draft",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [optimistic, ...prev]);
    const saved = await createContent(optimistic);
    if (!saved) {
      setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't duplicate the entry.");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Duplicated "${entry.title}".`);
  };

  const handleViewPage = (entry) => {
    if (typeof window !== "undefined") {
      window.open(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/c/${entry.id}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const columns = [
    {
      key: "title",
      header: "Entry",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.title}</span>
          <span className="text-xs text-text-secondary">
            /{r.slug} · {r.type}
            {r.updatedAt ? ` · ${formatDate(r.updatedAt)}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} map={CONTENT_STATUS_MAP} />,
    },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={CONTENT_TYPE_MAP[r.type]?.variant || "neutral"}>
          {r.type}
        </Badge>
      ),
    },
    {
      key: showSchedule ? "scheduled" : "updated",
      header: showSchedule ? "Scheduled" : "Updated",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {formatDate(showSchedule ? r.scheduledAt || r.updatedAt : r.updatedAt)}
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
          label={`Actions for ${r.title}`}
          items={[
            { icon: Pencil, label: "Edit", onSelect: () => openContent(r.id) },
            { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
            { icon: ExternalLink, label: "View page", onSelect: () => handleViewPage(r) },
            ...(showRestore
              ? [{ icon: RotateCcw, label: "Restore as draft", onSelect: () => handleRestore(r) }]
              : []),
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
      <ContentDetailScreen
        content={selected}
        backLabel={backLabel || title}
        onBack={closeContent}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title={title}
        description={description}
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> {createButtonLabel}
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div className="flex items-center gap-2">
          {hideStatusFilter ? null : (
            <FilterDropdown
              value={status}
              onValueChange={setStatus}
              options={CONTENT_STATUS_FILTER_OPTIONS}
              height="h-9"
            />
          )}
          {hideTypeFilter ? null : (
            <FilterDropdown
              value={type}
              onValueChange={setType}
              options={CONTENT_TYPE_FILTER_OPTIONS}
              height="h-9"
            />
          )}
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search entries, slugs, excerpts…"
        />
      </Toolbar>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-subtle px-6 py-16 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading {title}…
        </div>
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.id}
            onRowClick={(r) => openContent(r.id)}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={FilePlus2}
                  title={
                    scoped.length
                      ? "No entries match your filters"
                      : emptyTitle
                  }
                  description={
                    scoped.length
                      ? "Try clearing the search or filters, or create a new entry to get started."
                      : emptyDescription
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> {createButtonLabel}
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel={itemLabel} />
        </div>
      )}

      <CreateEntryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        fixedStatus={fixedStatus}
        fixedType={fixedType}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.title}
              </span>
              ? This action can&apos;t be undone.
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

export default EntriesList;
