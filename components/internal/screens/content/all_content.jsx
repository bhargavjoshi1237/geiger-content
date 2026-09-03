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
  CONTENTS,
  CONTENT_STATUS_MAP,
  CONTENT_TYPE_MAP,
  CONTENT_TYPES,
  formatDate,
  newContentId,
  slugify,
} from "./sample_data";
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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Published", label: "Published" },
  { value: "In review", label: "In review" },
  { value: "Draft", label: "Draft" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Archived", label: "Archived" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...CONTENT_TYPES.map((t) => ({ value: t, label: t })),
];

const EMPTY_DRAFT = {
  title: "",
  type: "Article",
  status: "Draft",
  excerpt: "",
  locale: "en",
};

function CreateContentDialog({ open, onOpenChange, onCreate }) {
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
          <DialogTitle>Create content</DialogTitle>
          <DialogDescription>
            Set the essentials now — you can flesh out the body, media, and
            publishing settings in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label="Title" htmlFor="content-title">
            <Input
              id="content-title"
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

export function AllContentScreen() {
  const [rows, setRows] = useState(CONTENTS);
  const [source, setSource] = useState("sample");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { contentId, openContent, closeContent } = useWorkspaceUrl();
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  const usingDb = source === "db";

  const selected = useMemo(
    () => (contentId ? rows.find((r) => r.id === contentId) || null : null),
    [contentId, rows],
  );

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      if (result) {
        setRows(result);
        setSource("db");
      }
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
      if (type !== "all" && r.type !== type) return false;
      if (
        search &&
        !`${r.title} ${r.slug} ${r.excerpt}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, search, status, type]);

  const pager = usePagination(filtered, { resetKey: `${search}|${status}|${type}` });

  const stats = useMemo(() => {
    const published = rows.filter((r) => r.status === "Published").length;
    const inReview = rows.filter((r) => r.status === "In review").length;
    const drafts = rows.filter((r) => r.status === "Draft").length;
    return [
      { label: "Total entries", value: String(rows.length), footer: `${published} published` },
      { label: "Published", value: String(published), footer: "Live in delivery" },
      { label: "In review", value: String(inReview), footer: "Awaiting approval" },
      { label: "Drafts", value: String(drafts), footer: "Not yet submitted" },
    ];
  }, [rows]);

  const persistCreate = (entry) => {
    if (!usingDb) return;
    createContent(entry).then((saved) => {
      if (!saved) {
        toast.error("Couldn't save the entry to the server.");
      } else {
        setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      }
    });
  };

  const handleCreate = (draft) => {
    const title = draft.title.trim();
    const entry = {
      id: newContentId(),
      title,
      slug: slugify(title),
      status: "Draft",
      type: draft.type,
      excerpt: draft.excerpt || "",
      body: "",
      author: "",
      locale: draft.locale || "en",
      coverUrl: "",
      updatedAt: new Date().toISOString().slice(0, 10),
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [entry, ...prev]);
    toast.success(`"${entry.title}" created as a draft.`);
    persistCreate(entry);
  };

  const handleUpdate = (updated) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (usingDb) {
      updateContent(updated.id, updated).then((saved) => {
        if (!saved) toast.error("Couldn't save your changes to the server.");
      });
    }
  };

  const handleDelete = (entry) => {
    setDeleteTarget(null);
    setRows((prev) => prev.filter((r) => r.id !== entry.id));
    toast.success(`Deleted "${entry.title}".`);
    if (usingDb) {
      softDeleteContent(entry.id).then((ok) => {
        if (!ok) toast.error("Couldn't delete the entry on the server.");
      });
    }
  };

  const handleDuplicate = (entry) => {
    const copy = {
      ...entry,
      id: newContentId(),
      title: `${entry.title} (copy)`,
      slug: `${entry.slug}-copy`,
      status: "Draft",
      createdBy: userId,
      projectId,
    };
    setRows((prev) => [copy, ...prev]);
    toast.success(`Duplicated "${entry.title}".`);
    persistCreate(copy);
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
          label={`Actions for ${r.title}`}
          items={[
            { icon: Pencil, label: "Edit", onSelect: () => openContent(r.id) },
            { icon: Copy, label: "Duplicate", onSelect: () => handleDuplicate(r) },
            { icon: ExternalLink, label: "View page", onSelect: () => handleViewPage(r) },
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
        onBack={closeContent}
        onUpdate={handleUpdate}
      />
    );
  }

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="All Content"
        description="Every entry in your workspace — drafts, in review, and published. Search, filter, and manage them all from here."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create content
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
          <FilterDropdown
            value={type}
            onValueChange={setType}
            options={TYPE_FILTER_OPTIONS}
            height="h-9"
          />
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
          Loading Content…
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
                    rows.length
                      ? "No entries match your filters"
                      : "No content yet"
                  }
                  description={
                    rows.length
                      ? "Try clearing the search or filters, or create a new entry to get started."
                      : "Create your first entry to start modeling, writing, and publishing."
                  }
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4" /> Create content
                    </Button>
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="entries" />
        </div>
      )}

      <CreateContentDialog
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

export default AllContentScreen;
