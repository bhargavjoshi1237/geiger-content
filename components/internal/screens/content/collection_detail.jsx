"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  SquarePen,
  ListChecks,
  Settings2,
  Plus,
  X,
} from "lucide-react";

import { EditorShell } from "@/components/internal/shared/editor_shell";
import {
  Field,
  SearchInput,
  SectionCard,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useProject } from "@/context/project-context";
import { COLLECTION_STATUS_MAP, formatDate } from "./constants";
import { listContent } from "@/lib/supabase/content";
import {
  addCollectionItem,
  listCollectionEntryIds,
  removeCollectionItem,
  updateCollection,
} from "@/lib/supabase/collections";

function OverviewSection({ collection, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Summary">
        <div className="grid gap-4">
          <Field label="Description">
            <Textarea
              value={collection?.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What belongs in this collection?"
              rows={3}
            />
          </Field>
          <Field label="Status">
            <Select
              value={collection?.status || "Draft"}
              onValueChange={(v) => patch({ status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(COLLECTION_STATUS_MAP).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function BasicsSection({ collection, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Basics">
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={collection?.name || ""}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Collection name"
            />
          </Field>
          <Field label="Slug">
            <Input
              value={collection?.slug || ""}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="collection-slug"
            />
          </Field>
          <Field label="Cover URL">
            <Input
              value={collection?.coverUrl || ""}
              onChange={(e) => patch({ coverUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function ItemsSection({ collection, onChanged }) {
  const { projectId } = useProject();
  const [entries, setEntries] = useState([]);
  const [memberIds, setMemberIds] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((rows) => {
      if (alive) setEntries(rows ?? []);
    });
    listCollectionEntryIds(collection?.id).then((ids) => {
      if (alive) setMemberIds(ids ?? []);
    });
    return () => {
      alive = false;
    };
  }, [projectId, collection?.id]);

  const members = useMemo(() => {
    if (!memberIds) return [];
    const byId = new Map(entries.map((e) => [e.id, e]));
    return memberIds.map((id) => byId.get(id)).filter(Boolean);
  }, [entries, memberIds]);

  const candidates = useMemo(() => {
    const memberSet = new Set(memberIds || []);
    return entries.filter((e) => {
      if (memberSet.has(e.id)) return false;
      if (
        search &&
        !`${e.title} ${e.slug}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [entries, memberIds, search]);

  const add = async (entryId) => {
    setMemberIds((prev) => [...(prev || []), entryId]);
    const ok = await addCollectionItem(collection.id, entryId);
    if (!ok) {
      setMemberIds((prev) => (prev || []).filter((id) => id !== entryId));
      toast.error("Couldn't add that entry.");
      return;
    }
    onChanged?.();
  };

  const remove = async (entryId) => {
    const prev = memberIds;
    setMemberIds((ids) => (ids || []).filter((id) => id !== entryId));
    const ok = await removeCollectionItem(collection.id, entryId);
    if (!ok) {
      setMemberIds(prev);
      toast.error("Couldn't remove that entry.");
      return;
    }
    onChanged?.();
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Included entries"
        description={`${members.length} in this collection`}
      >
        {members.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nothing here yet — pick entries below to build this collection.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.title}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    /{m.slug} · {m.status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary hover:text-foreground"
                  onClick={() => remove(m.id)}
                >
                  <X className="h-4 w-4" /> Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Add entries" description="Search and add">
        <div className="space-y-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search entries…"
          />
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {candidates.slice(0, 30).map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-subtle"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {e.title}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    /{e.slug} · {e.type}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => add(e.id)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </li>
            ))}
            {candidates.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-text-secondary">
                No matching entries outside this collection.
              </li>
            ) : null}
          </ul>
        </div>
      </SectionCard>
    </div>
  );
}

const NAV_GROUPS = [
  {
    group: null,
    items: [
      {
        key: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "Description and status.",
      },
    ],
  },
  {
    group: "General",
    items: [
      {
        key: "basics",
        label: "Basics",
        icon: SquarePen,
        desc: "Name, slug, and cover.",
      },
    ],
  },
  {
    group: "Content",
    items: [
      {
        key: "items",
        label: "Items",
        icon: ListChecks,
        desc: "Entries in this collection.",
      },
    ],
  },
  {
    group: "Settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: Settings2,
        desc: "Slug and delivery identifiers.",
      },
    ],
  },
];

const SECTIONS = {
  overview: OverviewSection,
  basics: BasicsSection,
  items: ItemsSection,
  settings: BasicsSection,
};

export function CollectionDetailScreen({
  collection,
  backLabel,
  onBack,
  onUpdate,
  onMembersChanged,
}) {
  const { section: active, setSection: setActive } = useWorkspaceUrl();
  const [form, setForm] = useState(collection);
  const [seedId, setSeedId] = useState(collection?.id);
  if (collection && collection.id !== seedId) {
    setSeedId(collection.id);
    setForm(collection);
  }

  if (!collection) return null;

  const patch = (partial) => setForm((f) => ({ ...f, ...partial }));

  const save = async () => {
    const saved = await updateCollection(form.id, form);
    if (!saved) {
      toast.error("Couldn't save your changes to the server.");
      return;
    }
    onUpdate?.(saved);
    setForm(saved);
    toast.success("Changes saved.");
  };

  return (
    <EditorShell
      searchable
      back={{ label: backLabel || "Collections", onClick: onBack }}
      title={form.name}
      status={form.status}
      statusMap={COLLECTION_STATUS_MAP}
      meta={
        [formatDate(form.updatedAt), form.slug, `${form.itemCount ?? 0} items`]
          .filter(Boolean)
          .join(" · ") || "No metadata yet"
      }
      actions={
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={save}
        >
          Save Changes
        </Button>
      }
      nav={NAV_GROUPS}
      subject={form}
      active={active}
      onActiveChange={setActive}
    >
      {({ activeItem }) => {
        const ActiveSection = SECTIONS[active] || SECTIONS.overview;
        return (
          <ActiveSection
            collection={form}
            headerItem={activeItem}
            onPatch={patch}
            onChanged={onMembersChanged}
          />
        );
      }}
    </EditorShell>
  );
}

export default CollectionDetailScreen;
