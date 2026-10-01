"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Languages, Pencil, Plus, Trash2 } from "lucide-react";

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
import { listContent } from "@/lib/supabase/content";
import {
  createLocale,
  listLocales,
  softDeleteLocale,
  updateLocale,
} from "@/lib/supabase/locales";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { newId } from "./constants";

const EMPTY_DRAFT = { code: "", label: "", fallbackCode: "", isDefault: false };

// Per-locale variants are separate entries rows sharing a slug root
// (e.g. `getting-started` + `getting-started--de`, or the same slug with a
// different `locale` value). This screen manages the enabled-locale registry
// and derives per-root coverage from the entries table.
function slugRoot(slug) {
  return String(slug || "").replace(/--[a-z][a-z-]*$/i, "");
}

function LocaleDialog({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initial || EMPTY_DRAFT);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = () => {
    if (!draft.code.trim() || !draft.label.trim()) {
      toast.error("Code and label are both required (e.g. de · German).");
      return;
    }
    onSave({
      code: draft.code.trim(),
      label: draft.label.trim(),
      fallbackCode: draft.fallbackCode.trim(),
      isDefault: Boolean(draft.isDefault),
    });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit locale" : "New locale"}</DialogTitle>
          <DialogDescription>
            One default locale; every other locale falls back through its chain.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" htmlFor="locale-code" hint="BCP-47, e.g. en, de, en-IN.">
              <Input
                id="locale-code"
                value={draft.code}
                onChange={(e) => set("code")(e.target.value)}
                placeholder="de"
                autoFocus
              />
            </Field>
            <Field label="Label" htmlFor="locale-label">
              <Input
                id="locale-label"
                value={draft.label}
                onChange={(e) => set("label")(e.target.value)}
                placeholder="German"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fallback code" hint="Used when a variant is missing.">
              <Input
                value={draft.fallbackCode}
                onChange={(e) => set("fallbackCode")(e.target.value)}
                placeholder="en"
              />
            </Field>
            <Field label="Default">
              <Select
                value={draft.isDefault ? "yes" : "no"}
                onValueChange={(v) => set("isDefault")(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
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
            {initial ? "Save changes" : "Create locale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LocalizationScreen() {
  const [locales, setLocales] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listLocales(projectId), listContent(projectId)]).then(
      ([localeRows, entryRows]) => {
        if (!alive) return;
        setLocales(localeRows ?? []);
        setEntries(entryRows ?? []);
        setLoading(false);
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const defaultLocale = useMemo(
    () => locales.find((l) => l.isDefault) || null,
    [locales],
  );

  const coverage = useMemo(() => {
    const byRoot = new Map();
    for (const e of entries) {
      const root = slugRoot(e.slug) || e.slug || e.id;
      if (!byRoot.has(root)) byRoot.set(root, new Set());
      byRoot.get(root).add(e.locale || "en");
    }
    return Array.from(byRoot.entries())
      .map(([root, set]) => ({ root, present: Array.from(set).sort() }))
      .sort((a, b) => a.root.localeCompare(b.root));
  }, [entries]);

  const filteredCoverage = useMemo(
    () =>
      coverage.filter(
        (c) =>
          !search || c.root.toLowerCase().includes(search.toLowerCase()),
      ),
    [coverage, search],
  );

  const stats = useMemo(() => {
    const missingDefault = defaultLocale
      ? coverage.filter((c) => !c.present.includes(defaultLocale.code)).length
      : 0;
    return [
      { label: "Locales", value: String(locales.length) },
      {
        label: "Default",
        value: defaultLocale?.code || "—",
        footer: defaultLocale?.label || "Set one locale as default",
      },
      {
        label: "Missing default",
        value: String(missingDefault),
        footer: "Roots without a default variant",
      },
    ];
  }, [locales, defaultLocale, coverage]);

  const handleSave = async (draft) => {
    if (editing) {
      const prev = locales;
      setLocales((rows) =>
        rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)),
      );
      const saved = await updateLocale(editing.id, draft);
      if (!saved) {
        setLocales(prev);
        toast.error("Couldn't save the locale.");
        return;
      }
      toast.success(`Locale "${saved.code}" updated.`);
      setEditing(null);
      return;
    }
    const optimistic = { id: newId(), ...draft, createdBy: userId, projectId };
    setLocales((prev) => [optimistic, ...prev]);
    const saved = await createLocale(optimistic);
    if (!saved) {
      setLocales((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't create the locale — the code may already exist.");
      return;
    }
    setLocales((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success(`Locale "${saved.code}" created.`);
  };

  const handleDelete = async (row) => {
    const prev = locales;
    setLocales((rows) => rows.filter((r) => r.id !== row.id));
    toast.success(`Deleted locale "${row.code}".`);
    const ok = await softDeleteLocale(row.id);
    if (!ok) {
      setLocales(prev);
      toast.error("Couldn't delete the locale on the server.");
    }
  };

  const localeColumns = [
    {
      key: "code",
      header: "Locale",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{r.label}</span>
          <Badge variant={r.isDefault ? "success" : "neutral"}>{r.code}</Badge>
        </div>
      ),
    },
    {
      key: "fallback",
      header: "Falls back to",
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary">
          {r.fallbackCode || "—"}
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
          label={`Actions for ${r.code}`}
          items={[
            {
              icon: Pencil,
              label: "Edit",
              onSelect: () => {
                setEditing(r);
                setDialogOpen(true);
              },
            },
            ...(r.isDefault
              ? []
              : [
                  {
                    icon: Pencil,
                    label: "Make default",
                    onSelect: async () => {
                      const prev = locales;
                      setLocales((rows) =>
                        rows.map((x) => ({ ...x, isDefault: x.id === r.id })),
                      );
                      const saved = await updateLocale(r.id, { isDefault: true });
                      if (!saved) {
                        setLocales(prev);
                        toast.error("Couldn't set the default locale.");
                      } else {
                        toast.success(`"${r.code}" is now the default.`);
                      }
                    },
                  },
                ]),
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

  const coverageColumns = [
    {
      key: "root",
      header: "Slug root",
      render: (r) => (
        <span className="font-mono text-xs text-foreground">/{r.root}</span>
      ),
    },
    {
      key: "present",
      header: "Variants",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {locales.map((l) => (
            <Badge
              key={l.code}
              variant={r.present.includes(l.code) ? "success" : "neutral"}
            >
              {l.code}
            </Badge>
          ))}
          {r.present
            .filter((c) => !locales.some((l) => l.code === c))
            .map((c) => (
              <Badge key={c} variant="purple">
                {c}
              </Badge>
            ))}
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Localization"
        description="Enabled locales and per-root variant coverage. Variants are entries sharing a slug root."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New locale
          </Button>
        }
      />
      <StatsBar stats={stats} />
      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search slug roots…"
        />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={localeColumns} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={localeColumns}
            data={locales}
            getRowKey={(r) => r.id}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Languages}
                  title="No locales yet"
                  description="Register the languages this project publishes in."
                  action={
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New locale
                    </Button>
                  }
                />
              </div>
            }
          />
          <SectionCard
            title="Coverage"
            description="Which locale variants exist for each slug root."
          >
            <DataTable
              columns={coverageColumns}
              data={filteredCoverage}
              getRowKey={(r) => r.root}
              empty={
                <p className="text-sm text-text-secondary">
                  No entries yet — coverage appears once content exists.
                </p>
              }
            />
          </SectionCard>
        </div>
      )}
      {dialogOpen && (
        <LocaleDialog
          initial={editing}
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

export default LocalizationScreen;
