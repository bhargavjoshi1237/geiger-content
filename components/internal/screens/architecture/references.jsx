"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Trash2 } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
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
import { listContent } from "@/lib/supabase/content";
import {
  createReference,
  listReferencesFrom,
  listReferencesTo,
  softDeleteReference,
} from "@/lib/supabase/references";
import { getUser } from "@/lib/supabase/user";
import { useProject } from "@/context/project-context";
import { newId } from "./constants";

function ReferenceDialog({ onClose, fromId, entries, onSave }) {
  const [toId, setToId] = useState("");
  const [fieldKey, setFieldKey] = useState("related");
  const submit = () => {
    if (!toId) {
      toast.error("Pick the entry to link to.");
      return;
    }
    if (toId === fromId) {
      toast.error("An entry can't reference itself.");
      return;
    }
    onSave({ toId, fieldKey: fieldKey.trim() || "related" });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>Add reference</DialogTitle>
          <DialogDescription>
            Link the selected entry to another entry for a named field.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Link to">
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an entry" />
              </SelectTrigger>
              <SelectContent>
                {entries
                  .filter((e) => e.id !== fromId)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} · /{e.slug}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Field key" hint="Which field holds this link, e.g. related, author_bio.">
            <Input
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="related"
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
            Add reference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReferencesScreen() {
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { projectId } = useProject();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      const list = result ?? [];
      setEntries(list);
      setLoading(false);
      pickEntry(list[0]?.id || "");
    });
    getUser().then((u) => alive && setUserId(u?.id || null));
    return () => {
      alive = false;
    };
  }, [projectId]);

  function pickEntry(id) {
    setEntryId(id);
    if (!id) {
      setOutgoing([]);
      setIncoming([]);
      return;
    }
    setLoadingRefs(true);
    Promise.all([listReferencesFrom(id), listReferencesTo(id)]).then(
      ([from, to]) => {
        setOutgoing(from ?? []);
        setIncoming(to ?? []);
        setLoadingRefs(false);
      },
    );
  }

  const entryById = useMemo(
    () => Object.fromEntries(entries.map((e) => [e.id, e])),
    [entries],
  );
  const selected = entryById[entryId] || null;

  const stats = useMemo(
    () => [
      { label: "Entries", value: String(entries.length) },
      {
        label: "Outgoing",
        value: String(outgoing.length),
        footer: selected ? `From ${selected.title}` : "No entry selected",
      },
      {
        label: "Incoming",
        value: String(incoming.length),
        footer: "Reverse links",
      },
    ],
    [entries, outgoing, incoming, selected],
  );

  const handleSave = async ({ toId, fieldKey }) => {
    const optimistic = {
      id: newId(),
      fromEntryId: entryId,
      toEntryId: toId,
      fieldKey,
      createdBy: userId,
    };
    setOutgoing((prev) => [optimistic, ...prev]);
    const saved = await createReference(optimistic);
    if (!saved) {
      setOutgoing((prev) => prev.filter((r) => r.id !== optimistic.id));
      toast.error("Couldn't save the reference.");
      return;
    }
    setOutgoing((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    toast.success("Reference added.");
  };

  const handleDelete = async (row, side) => {
    const prevOut = outgoing;
    const prevIn = incoming;
    if (side === "out") setOutgoing((rows) => rows.filter((r) => r.id !== row.id));
    else setIncoming((rows) => rows.filter((r) => r.id !== row.id));
    const ok = await softDeleteReference(row.id);
    if (!ok) {
      setOutgoing(prevOut);
      setIncoming(prevIn);
      toast.error("Couldn't delete the reference on the server.");
      return;
    }
    toast.success("Reference removed.");
  };

  const renderRows = (rows, otherKey, side) => (
    <DataTable
      columns={[
        {
          key: "entry",
          header: side === "out" ? "Links to" : "Linked from",
          render: (r) => {
            const other = entryById[r[otherKey]];
            return (
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">
                  {other?.title || "Deleted entry"}
                </span>
                <span className="text-xs text-text-secondary">
                  {other ? `/${other.slug} · ${other.status}` : r[otherKey]}
                </span>
              </div>
            );
          },
        },
        {
          key: "field",
          header: "Field",
          render: (r) => (
            <span className="font-mono text-xs text-text-secondary">
              {r.fieldKey || "—"}
            </span>
          ),
        },
        {
          key: "actions",
          header: "",
          align: "right",
          className: "text-right",
          render: (r) => (
            <Button
              variant="ghost"
              aria-label="Remove reference"
              className="text-red-400 hover:bg-red-500/10"
              onClick={() => handleDelete(r, side)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ),
        },
      ]}
      data={rows}
      getRowKey={(r) => r.id}
      empty={
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Link2}
            title={side === "out" ? "No outgoing links" : "No incoming links"}
            description={
              side === "out"
                ? "Link this entry to related content."
                : "Nothing points at this entry yet."
            }
          />
        </div>
      }
    />
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="References"
        description="Directed entry-to-entry links with reverse lookups."
        actions={
          <div className="flex items-center gap-2">
            <Select value={entryId} onValueChange={pickEntry}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select an entry" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!entryId}
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add reference
            </Button>
          </div>
        }
      />
      <StatsBar stats={stats} />
      {loading || loadingRefs ? (
        <TableSkeleton columns={[{ key: "entry", header: "Links" }]} />
      ) : !selected ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Link2}
            title="No entries yet"
            description="Create content first, then link entries together."
          />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard
            title="Outgoing"
            description={`Links from ${selected.title}.`}
          >
            {renderRows(outgoing, "toEntryId", "out")}
          </SectionCard>
          <SectionCard
            title="Incoming"
            description={`Entries pointing at ${selected.title}.`}
          >
            {renderRows(incoming, "fromEntryId", "in")}
          </SectionCard>
        </div>
      )}
      {dialogOpen && (
        <ReferenceDialog
          onClose={() => setDialogOpen(false)}
          fromId={entryId}
          entries={entries}
          onSave={handleSave}
        />
      )}
    </MainScreenWrapper>
  );
}

export default ReferencesScreen;
