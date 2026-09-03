"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  SquarePen,
  Crosshair,
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
import { SLOT_STATUS_MAP, formatDate, slotKeyify } from "./constants";
import { listContent } from "@/lib/supabase/content";
import { updateSlot } from "@/lib/supabase/slots";

function OverviewSection({ slot, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Summary">
        <div className="grid gap-4">
          <Field label="Description">
            <Textarea
              value={slot?.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Where is this slot used, and what should it resolve?"
              rows={3}
            />
          </Field>
          <Field label="Status">
            <Select
              value={slot?.status || "Active"}
              onValueChange={(v) => patch({ status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(SLOT_STATUS_MAP).map((s) => (
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

function BasicsSection({ slot, onPatch }) {
  const patch = onPatch || (() => {});
  return (
    <div className="space-y-6">
      <SectionCard title="Basics">
        <div className="grid gap-4">
          <Field label="Name">
            <Input
              value={slot?.name || ""}
              onChange={(e) =>
                patch({
                  name: e.target.value,
                  key: slot?.keyTouched
                    ? slot.key
                    : slotKeyify(e.target.value),
                })
              }
              placeholder="Slot name"
            />
          </Field>
          <Field
            label="Key"
            hint="The stable key applications request (e.g. homepage_hero)."
          >
            <Input
              value={slot?.key || ""}
              onChange={(e) =>
                patch({ key: slotKeyify(e.target.value), keyTouched: true })
              }
              placeholder="slot_key"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function DeliverySection({ slot, onPatch }) {
  const patch = onPatch || (() => {});
  const { projectId } = useProject();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((rows) => {
      if (alive) setEntries(rows ?? []);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const eligible = useMemo(() => {
    const ids = new Set(slot?.eligibleEntryIds || []);
    const byId = new Map(entries.map((e) => [e.id, e]));
    return [...ids].map((id) => byId.get(id)).filter(Boolean);
  }, [entries, slot?.eligibleEntryIds]);

  const fallback = useMemo(
    () => entries.find((e) => e.id === slot?.fallbackEntryId) || null,
    [entries, slot?.fallbackEntryId],
  );

  const candidates = useMemo(() => {
    const eligibleSet = new Set(slot?.eligibleEntryIds || []);
    return entries.filter((e) => {
      if (eligibleSet.has(e.id)) return false;
      if (
        search &&
        !`${e.title} ${e.slug}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [entries, slot?.eligibleEntryIds, search]);

  const toggleEligible = (entryId) => {
    const current = new Set(slot?.eligibleEntryIds || []);
    if (current.has(entryId)) current.delete(entryId);
    else current.add(entryId);
    patch({ eligibleEntryIds: [...current] });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Fallback"
        description="Served when no eligible entry matches"
      >
        <Field label="Fallback entry">
          <Select
            value={slot?.fallbackEntryId || "none"}
            onValueChange={(v) =>
              patch({ fallbackEntryId: v === "none" ? null : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="No fallback" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No fallback</SelectItem>
              {entries.slice(0, 100).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {fallback ? (
          <p className="text-xs text-text-secondary">
            Current fallback: {fallback.title} (/{fallback.slug})
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Eligible entries"
        description={`${eligible.length} eligible`}
      >
        {eligible.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No eligible entries — add entries below. Delivery serves the first
            match, else the fallback.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {eligible.map((m) => (
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
                  onClick={() => toggleEligible(m.id)}
                >
                  <X className="h-4 w-4" /> Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Add eligible entries" description="Search and add">
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
                  onClick={() => toggleEligible(e.id)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </li>
            ))}
            {candidates.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-text-secondary">
                No matching entries outside this slot.
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
        desc: "Name and slot key.",
      },
    ],
  },
  {
    group: "Delivery",
    items: [
      {
        key: "delivery",
        label: "Delivery",
        icon: Crosshair,
        desc: "Eligible entries and fallback.",
      },
    ],
  },
];

const SECTIONS = {
  overview: OverviewSection,
  basics: BasicsSection,
  delivery: DeliverySection,
};

export function SlotDetailScreen({ slot, backLabel, onBack, onUpdate }) {
  const { section: active, setSection: setActive } = useWorkspaceUrl();
  const [form, setForm] = useState(slot);
  const [seedId, setSeedId] = useState(slot?.id);
  if (slot && slot.id !== seedId) {
    setSeedId(slot.id);
    setForm(slot);
  }

  if (!slot) return null;

  const patch = (partial) => setForm((f) => ({ ...f, ...partial }));

  const save = async () => {
    const saved = await updateSlot(form.id, form);
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
      back={{ label: backLabel || "Content Slots", onClick: onBack }}
      title={form.name}
      status={form.status}
      statusMap={SLOT_STATUS_MAP}
      meta={
        [
          formatDate(form.updatedAt),
          form.key ? `key: ${form.key}` : null,
          `${(form.eligibleEntryIds || []).length} eligible`,
        ]
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
            slot={form}
            headerItem={activeItem}
            onPatch={patch}
          />
        );
      }}
    </EditorShell>
  );
}

export default SlotDetailScreen;
