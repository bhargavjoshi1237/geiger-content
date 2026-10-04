"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2, X } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
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
import { LoadingArea } from "@geiger/ui";
import { listContent } from "@/lib/supabase/content";
import {
  assignTerm,
  createTaxonomy,
  createTerm,
  listEntryTerms,
  listTaxonomies,
  listTermsByTaxonomy,
  removeTerm,
  softDeleteTaxonomy,
  softDeleteTerm,
  updateTaxonomy,
} from "@/lib/supabase/taxonomy";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { keyify, newId } from "./constants";

const EMPTY_TAXONOMY = { key: "", name: "", hierarchical: false };
const EMPTY_TERM = { slug: "", label: "", parentId: "" };

function TaxonomyDialog({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial || EMPTY_TAXONOMY);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.name.trim()) {
      toast.error("Give the taxonomy a name first.");
      return;
    }
    onSave({
      key: draft.key.trim() || keyify(draft.name),
      name: draft.name.trim(),
      hierarchical: Boolean(draft.hierarchical),
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:p-6 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit taxonomy" : "New taxonomy"}</DialogTitle>
          <DialogDescription>
            Vocabularies — topics, tags — attached to entries. Prerequisite for
            topic stages in Personalization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="tax-name">
              <Input
                id="tax-name"
                value={draft.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="e.g. Topics"
                autoFocus
              />
            </Field>
            <Field label="Key" hint="Auto-filled from the name.">
              <Input
                value={draft.key}
                onChange={(e) => set("key")(e.target.value)}
                placeholder="topics"
              />
            </Field>
          </div>
          <Field label="Hierarchical">
            <Select
              value={draft.hierarchical ? "yes" : "no"}
              onValueChange={(v) => set("hierarchical")(v === "yes")}
            >
              <SelectTrigger>
                <SelectValue/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Flat (tags)</SelectItem>
                <SelectItem value="yes">Hierarchical (parent / child)</SelectItem>
              </SelectContent>
            </Select>
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
            {initial ? "Save changes" : "Create taxonomy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaxonomiesScreen() {
  const [taxonomies, setTaxonomies] = useState([]);
  const [taxonomyId, setTaxonomyId] = useState("");
  const [terms, setTerms] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [termDraft, setTermDraft] = useState(EMPTY_TERM);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listTaxonomies(projectId), listContent(projectId)]).then(
      ([taxRows, entryRows]) => {
        if (!alive) return;
        const list = taxRows ?? [];
        setTaxonomies(list);
        const el = entryRows ?? [];
        setEntries(el);
        setLoading(false);
        pickTaxonomy(list[0]?.id || "");
        pickEntry(el[0]?.id || "");
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  // Selection switches fetch in the handler so the previous selection's
  // rows never flash.
  function pickTaxonomy(id) {
    setTaxonomyId(id);
    if (!id) {
      setTerms([]);
      return;
    }
    setLoadingTerms(true);
    listTermsByTaxonomy(id).then((result) => {
      setTerms(result ?? []);
      setLoadingTerms(false);
    });
  }
  function pickEntry(id) {
    setEntryId(id);
    if (!id) {
      setAssigned([]);
      return;
    }
    setLoadingAssigned(true);
    listEntryTerms(id).then((result) => {
      setAssigned(result ?? []);
      setLoadingAssigned(false);
    });
  }

  const activeTaxonomy = useMemo(
    () => taxonomies.find((t) => t.id === taxonomyId) || null,
    [taxonomies, taxonomyId],
  );
  const termById = useMemo(
    () => Object.fromEntries(terms.map((t) => [t.id, t])),
    [terms],
  );
  const assignedIds = useMemo(
    () => new Set(assigned.map((a) => a.term_id)),
    [assigned],
  );

  const filtered = useMemo(
    () =>
      taxonomies.filter(
        (t) =>
          !search ||
          `${t.name} ${t.key}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [taxonomies, search],
  );

  const stats = useMemo(
    () => [
      {
        label: "Taxonomies",
        value: String(taxonomies.length),
        footer: `${taxonomies.filter((t) => t.hierarchical).length} hierarchical`,
      },
      {
        label: "Terms here",
        value: String(terms.length),
        footer: activeTaxonomy?.name || "No taxonomy selected",
      },
      {
        label: "Assigned",
        value: String(assigned.length),
        footer: "Terms on selected entry",
      },
      {
        label: "Entries",
        value: String(entries.length),
        footer: "Can carry terms",
      },
    ],
    [taxonomies, terms, assigned, activeTaxonomy, entries],
  );

  const handleSaveTaxonomy = async (draft) => {
    if (editing) {
      const prev = taxonomies;
      setTaxonomies((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateTaxonomy(editing.id, draft);
      if (!saved) {
        setTaxonomies(prev);
        toast.error("Couldn't save the taxonomy.");
        return;
      }
      toast.success(`Taxonomy "${saved.name}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), ...draft, createdBy: userId, projectId };
    setTaxonomies((prev) => [optimistic, ...prev]);
    const saved = await createTaxonomy(optimistic);
    if (!saved) {
      setTaxonomies((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the taxonomy.");
      return;
    }
    setTaxonomies((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    setTaxonomyId(saved.id);
    toast.success(`Taxonomy "${saved.name}" created.`);
  };

  const handleDeleteTaxonomy = async (row) => {
    const prev = taxonomies;
    setTaxonomies((rows) => rows.filter((r) => r.id !== row.id));
    if (taxonomyId === row.id) {
      setTaxonomyId("");
      setTerms([]);
    }
    toast.success(`Deleted taxonomy "${row.name}".`);
    const ok = await softDeleteTaxonomy(row.id);
    if (!ok) {
      setTaxonomies(prev);
      toast.error("Couldn't delete the taxonomy on the server.");
    }
  };

  const handleCreateTerm = async () => {
    if (!termDraft.label.trim() || !taxonomyId) {
      toast.error("Give the term a label first.");
      return;
    }
    const optimistic = {
      id: newId(),
      taxonomyId,
      slug: termDraft.slug.trim() || keyify(termDraft.label).replace(/_/g, "-"),
      label: termDraft.label.trim(),
      parentId: termDraft.parentId || null,
      createdBy: userId,
    };
    setTerms((prev) => [...prev, optimistic]);
    setTermDraft(EMPTY_TERM);
    const saved = await createTerm(optimistic);
    if (!saved) {
      setTerms((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the term.");
      return;
    }
    setTerms((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Term "${saved.label}" created.`);
  };

  const handleDeleteTerm = async (row) => {
    const prev = terms;
    setTerms((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteTerm(row.id);
    if (!ok) {
      setTerms(prev);
      toast.error("Couldn't delete the term on the server.");
      return;
    }
    toast.success(`Deleted term "${row.label}".`);
  };

  const handleAssign = async (termId) => {
    if (!entryId || !termId || assignedIds.has(termId)) return;
    const saved = await assignTerm(entryId, termId);
    if (!saved) {
      toast.error("Couldn't assign the term.");
      return;
    }
    setAssigned((prev) => [...prev, saved]);
    toast.success(`Assigned "${termById[termId]?.label || "term"}".`);
  };

  const handleUnassign = async (termId) => {
    const prev = assigned;
    setAssigned((rows) => rows.filter((a) => a.term_id !== termId));
    const ok = await removeTerm(entryId, termId);
    if (!ok) {
      setAssigned(prev);
      toast.error("Couldn't remove the term on the server.");
      return;
    }
    toast.success("Term removed from entry.");
  };

  const columns = [
    {
      key: "name",
      header: "Taxonomy",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-md">
          <span className="truncate font-medium text-foreground" title={r.name}>{r.name}</span>
          <span className="truncate text-xs text-text-secondary">
            {r.key || "no key"} · {r.hierarchical ? "hierarchical" : "flat"}
          </span>
        </div>
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
              onSelect: () => handleDeleteTaxonomy(r),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Taxonomies"
        description="Topics and tags attached to entries. Terms nest when hierarchical."
        actions={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <Select value={taxonomyId} onValueChange={pickTaxonomy}>
              <SelectTrigger className="w-full min-w-0 sm:w-52" aria-label="Taxonomy">
                <SelectValue placeholder="Select taxonomy" />
              </SelectTrigger>
              <SelectContent>
                {taxonomies.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New taxonomy
            </Button>
          </div>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search taxonomies…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Tags}
                  title={taxonomies.length ? "No taxonomies match" : "No taxonomies yet"}
                  description="Group entries by topic, tag, or any vocabulary you need."
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New taxonomy
                    </Button>
                  }
                />
              </div>
            }
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title={`Terms${activeTaxonomy ? ` · ${activeTaxonomy.name}` : ""}`}
              description="Slug is unique per taxonomy."
            >
              <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  value={termDraft.label}
                  onChange={(e) =>
                    setTermDraft((d) => ({ ...d, label: e.target.value }))
                  }
                  placeholder="New term label…"
                  aria-label="New term label"
                  className="min-w-0 sm:flex-1 sm:basis-40"
                  disabled={!taxonomyId}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTerm();
                    }
                  }}
                />
                {activeTaxonomy?.hierarchical ? (
                  <Select
                    value={termDraft.parentId || "none"}
                    onValueChange={(v) =>
                      setTermDraft((d) => ({ ...d, parentId: v === "none" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="w-full min-w-0 sm:w-40" aria-label="Parent term">
                      <SelectValue placeholder="Parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent</SelectItem>
                      {terms.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!taxonomyId}
                  onClick={handleCreateTerm}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {loadingTerms ? (
                <LoadingArea className="py-6" label="Loading terms" />
              ) : terms.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No terms yet — add the first above.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {terms.map((t) => (
                    <li key={t.id} className="flex min-w-0 items-center justify-between gap-2 py-2">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="break-words text-sm font-medium text-foreground">
                          {termById[t.parentId] ? `${termById[t.parentId].label} / ` : ""}
                          {t.label}
                        </span>
                        <span className="truncate font-mono text-xs text-text-secondary" title={t.slug}>
                          {t.slug}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        aria-label={`Delete term ${t.label}`}
                        size="icon-sm"
                        className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => handleDeleteTerm(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard
              title="Assign to entry"
              description="Attach this taxonomy's terms to an entry."
              action={
                <Select value={entryId} onValueChange={pickEntry}>
                  <SelectTrigger className="w-full min-w-0 sm:w-52" aria-label="Entry for term assignment">
                    <SelectValue placeholder="Select entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {entries.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              {loadingAssigned ? (
                <LoadingArea className="py-6" />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {assigned.length === 0 ? (
                      <span className="text-sm text-text-secondary">
                        No terms assigned yet.
                      </span>
                    ) : (
                      assigned.map((a) => (
                        <Badge key={`${a.entry_id}:${a.term_id}`} variant="info" className="max-w-full">
                          <span className="min-w-0 truncate" title={termById[a.term_id]?.label || a.term_id}>
                            {termById[a.term_id]?.label || a.term_id}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Remove term ${termById[a.term_id]?.label || a.term_id}`}
                            className="ml-1 size-5 text-current"
                            onClick={() => handleUnassign(a.term_id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                  <Select value="" onValueChange={handleAssign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a term…" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms
                        .filter((t) => !assignedIds.has(t.id))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
      {dialogOpen && (
        <TaxonomyDialog
          initial={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSave={handleSaveTaxonomy}
        />
      )}
    </MainScreenWrapper>
  );
}

export default TaxonomiesScreen;
