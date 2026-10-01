"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePenLine, Save } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
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
import { listContent, updateContent } from "@/lib/supabase/content";
import { listContentTypes, listFieldsByType } from "@/lib/supabase/types";
import { createVersion, listVersionsByEntry } from "@/lib/supabase/locales";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { validateEntryData } from "../architecture/constants";
import { parseBody, serializeBody } from "./body_doc";
import { BodyEditor } from "./body_blocks";

// Structured editing: entries.data against the entry type's field schema.
// The fixed `body` column holds portable JSON ({ blocks }) as a text string
// (no migration); legacy plain-text bodies parse to a single paragraph.
function FieldInput({ field, value, onChange }) {
  const type = field.dataType || "text";
  if (type === "boolean") {
    return (
      <Select
        value={value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : ""}
        onValueChange={(v) => onChange(v === "true")}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (type === "number") {
    return (
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    );
  }
  if (type === "date") {
    return (
      <Input
        type="date"
        value={String(value || "").slice(0, 10)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (type === "richtext") {
    return (
      <Textarea
        value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="font-mono text-xs"
        placeholder='JSON string, e.g. "Hello **world**"'
      />
    );
  }
  if (type === "reference") {
    return (
      <Input
        value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Entry id or slug"
        className="font-mono text-xs"
      />
    );
  }
  return (
    <Input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.label}
    />
  );
}

// Match an entry's legacy `type` string to a structured content type by key
// or name (case-insensitive).
function matchType(typeList, entry) {
  if (!entry) return null;
  const needle = String(entry.type || "").toLowerCase();
  return (
    typeList.find((t) => String(t.key || "").toLowerCase() === needle) ||
    typeList.find((t) => String(t.name || "").toLowerCase() === needle) ||
    null
  );
}

export function StructuredEditorScreen() {
  const [entries, setEntries] = useState([]);
  const [types, setTypes] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [fields, setFields] = useState([]);
  const [data, setData] = useState({});
  const [bodyDoc, setBodyDoc] = useState({ blocks: [{ type: "paragraph", text: "" }] });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([listContent(projectId), listContentTypes(projectId)]).then(
      ([entryRows, typeRows]) => {
        if (!alive) return;
        const list = entryRows ?? [];
        const typeList = typeRows ?? [];
        setEntries(list);
        setTypes(typeList);
        seedEditor(list[0] || null, typeList, list[0]?.id || "");
      },
    );
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const selected = useMemo(
    () => entries.find((e) => e.id === entryId) || null,
    [entries, entryId],
  );

  const activeType = useMemo(
    () => matchType(types, selected),
    [types, selected],
  );

  // Entry switches seed synchronously in the handler (never in an effect),
  // so the form always matches the selected entry.
  function seedEditor(entry, typeList, id) {
    setEntryId(id);
    setData(
      entry?.data && typeof entry.data === "object" ? { ...entry.data } : {},
    );
    setBodyDoc(parseBody(entry?.body));
    setErrors([]);
    setDirty(false);
    setFields([]);
    setLoading(false);
    const t = matchType(typeList, entry);
    if (t) {
      listFieldsByType(t.id).then((result) => setFields(result ?? []));
    }
  }

  function pickEntry(id) {
    seedEditor(
      entries.find((e) => e.id === id) || null,
      types,
      id,
    );
  }

  const stats = useMemo(
    () => [
      { label: "Fields", value: String(fields.length) },
      {
        label: "Filled",
        value: String(
          fields.filter((f) => {
            const v = data?.[f.key];
            return v !== undefined && v !== null && v !== "";
          }).length,
        ),
        footer: "Have a value",
      },
      {
        label: "Issues",
        value: String(errors.length),
        footer: errors.length ? "Fix before saving" : "Valid",
      },
    ],
    [fields, data, errors],
  );

  const setValue = (key) => (value) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    const problems = validateEntryData(fields, data);
    setErrors(problems);
    if (problems.length) {
      toast.error(`${problems.length} field${problems.length === 1 ? "" : "s"} need${problems.length === 1 ? "s" : ""} attention.`);
      return;
    }
    setSaving(true);
    const saved = await updateContent(selected.id, {
      data,
      body: serializeBody(bodyDoc),
    });
    if (!saved) {
      setSaving(false);
      toast.error("Couldn't save the entry data.");
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    // Snapshot a version (best-effort; the save itself already succeeded).
    const existing = await listVersionsByEntry(selected.id);
    const next = (existing ?? []).length + 1;
    await createVersion({
      entryId: selected.id,
      version: next,
      payload: {
        title: saved.title,
        slug: saved.slug,
        status: saved.status,
        type: saved.type,
        excerpt: saved.excerpt,
        body: saved.body,
        data: saved.data,
      },
      createdBy: userId,
    });
    setSaving(false);
    setDirty(false);
    toast.success(`"${saved.title}" saved as version ${next}.`);
  };

  const errorFor = (key) => errors.find((e) => e.key === key)?.message || "";

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Structured Editor"
        description="Edit entries.data field-by-field against the type schema."
        actions={
          <div className="flex items-center gap-2">
            <Select value={entryId} onValueChange={pickEntry}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select an entry" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} · {e.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!selected || saving}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={[{ key: "field", header: "Field" }]} />
      ) : !selected ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FilePenLine}
            title="No entries yet"
            description="Create content first, then edit its structured data here."
          />
        </div>
      ) : !activeType ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FilePenLine}
            title={`No schema for type "${selected.type}"`}
            description="Define a matching content type under Architecture first."
          />
        </div>
      ) : (
        <>
          <SectionCard
            title={`${selected.title} · ${activeType.name}`}
            description={
              dirty ? "Unsaved changes." : "Every change validates before it saves."
            }
          >
            <div className="grid gap-4">
              {fields.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  This type has no fields yet — add them under Field Schemas.
                </p>
              ) : (
                fields.map((f) => (
                  <Field
                    key={f.id}
                    label={`${f.label}${f.validation?.required ? " *" : ""}`}
                    hint={
                      errorFor(f.key) ||
                      (f.localized ? "Localized · varies per locale." : undefined)
                    }
                  >
                    <div>
                      <FieldInput field={f} value={data?.[f.key]} onChange={setValue(f.key)} />
                      {errorFor(f.key) ? (
                        <p className="mt-1 text-xs text-red-400">{errorFor(f.key)}</p>
                      ) : null}
                    </div>
                  </Field>
                ))
              )}
            </div>
          </SectionCard>
          <SectionCard
            title="Body"
            description="Portable JSON blocks, stored as text. Legacy plain text loads as one paragraph."
          >
            <BodyEditor
              doc={bodyDoc}
              onChange={(doc) => {
                setBodyDoc(doc);
                setDirty(true);
              }}
            />
          </SectionCard>
        </>
      )}
    </MainScreenWrapper>
  );
}

export default StructuredEditorScreen;
