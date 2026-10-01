"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Merge, Upload } from "lucide-react";

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
import { listContent, createContent } from "@/lib/supabase/content";
import { listCollections } from "@/lib/supabase/collections";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";

// JSON + CSV round trip for workspace content. Exports snapshot entries,
// collections and slots via the data layers and download as files; import
// replays an entries JSON array through createContent with a per-row error
// count so one bad row never aborts the batch.
function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function entriesToCsv(entries) {
  const header = ["id", "title", "slug", "status", "type", "author", "locale"];
  const lines = entries.map((e) =>
    header.map((h) => csvCell(e[h])).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function ImportExportScreen() {
  const { projectId } = useProject();
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [e, c, s] = await Promise.all([
        listContent(projectId),
        listCollections(projectId),
        listSlots(projectId),
      ]);
      setEntries(e ?? []);
      setCollections(c ?? []);
      setSlots(s ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [e, c, s] = await Promise.all([
        listContent(projectId),
        listCollections(projectId),
        listSlots(projectId),
      ]);
      if (!alive) return;
      setEntries(e ?? []);
      setCollections(c ?? []);
      setSlots(s ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const stats = useMemo(
    () => [
      { label: "Entries", value: String(entries.length), footer: "Exportable rows" },
      { label: "Collections", value: String(collections.length), footer: "Exportable rows" },
      { label: "Slots", value: String(slots.length), footer: "Exportable rows" },
      {
        label: "Last import",
        value: lastImport ? `${lastImport.ok}/${lastImport.total}` : "—",
        footer: lastImport ? `${lastImport.failed} failed` : "No import yet",
      },
    ],
    [entries, collections, slots, lastImport],
  );

  const exportJson = (name, payload) => {
    try {
      downloadFile(
        `geiger-${name}-export.json`,
        JSON.stringify(payload, null, 2),
        "application/json",
      );
      toast.success(`${name} exported as JSON.`);
    } catch (e) {
      console.error("[import-export.json]", e);
      toast.error("Couldn't export JSON.");
    }
  };

  const exportEntriesCsv = () => {
    try {
      downloadFile("geiger-entries-export.csv", entriesToCsv(entries), "text/csv");
      toast.success("Entries exported as CSV.");
    } catch (e) {
      console.error("[import-export.csv]", e);
      toast.error("Couldn't export CSV.");
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    if (!projectId) {
      toast.error("Select a project before importing.");
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(rows)) {
        toast.error("Import file must be a JSON array or { entries: [...] }.");
        return;
      }
      let ok = 0;
      const errors = [];
      for (const [index, row] of rows.entries()) {
        if (!row || typeof row !== "object" || !row.title) {
          errors.push(`row ${index}: missing title`);
          continue;
        }
        const rest = { ...row };
        delete rest.id;
        const created = await createContent({
          ...rest,
          id: undefined,
          projectId,
          status: rest.status || "Draft",
        });
        if (created) ok += 1;
        else errors.push(`row ${index}: save failed`);
      }
      setLastImport({ ok, failed: errors.length, total: rows.length, errors: errors.slice(0, 5) });
      if (errors.length === 0) toast.success(`Imported ${ok} entries.`);
      else toast.error(`Imported ${ok} of ${rows.length} — ${errors.length} failed.`);
      refresh();
    } catch (e) {
      console.error("[import-export.import]", e);
      toast.error("Couldn't parse the import file as JSON.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Import & Export"
        description="Snapshot the workspace to files, or replay entries back in."
      />

      <StatsBar stats={stats} />

      {loading ? (
        <TableSkeleton
          columns={[
            { key: "area", header: "Area" },
            { key: "action", header: "Action" },
          ]}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Export"
            description="Download the current workspace as files."
          >
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start border-border bg-transparent text-foreground hover:bg-surface-active"
                onClick={() =>
                  exportJson("workspace", { entries, collections, slots })
                }
              >
                <Download className="h-4 w-4" /> Full workspace JSON
              </Button>
              <Button
                variant="outline"
                className="justify-start border-border bg-transparent text-foreground hover:bg-surface-active"
                onClick={() => exportJson("entries", entries)}
              >
                <Download className="h-4 w-4" /> Entries JSON ({entries.length})
              </Button>
              <Button
                variant="outline"
                className="justify-start border-border bg-transparent text-foreground hover:bg-surface-active"
                onClick={() => exportJson("collections", collections)}
              >
                <Download className="h-4 w-4" /> Collections JSON ({collections.length})
              </Button>
              <Button
                variant="outline"
                className="justify-start border-border bg-transparent text-foreground hover:bg-surface-active"
                onClick={() => exportJson("slots", slots)}
              >
                <Download className="h-4 w-4" /> Slots JSON ({slots.length})
              </Button>
              <Button
                variant="outline"
                className="justify-start border-border bg-transparent text-foreground hover:bg-surface-active"
                onClick={exportEntriesCsv}
              >
                <Download className="h-4 w-4" /> Entries CSV ({entries.length})
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            title="Import"
            description="Replay an entries JSON array through createContent — one bad row never aborts the batch."
          >
            <div className="grid gap-4">
              <Field label="Entries JSON file">
                <Input
                  type="file"
                  accept="application/json,.json"
                  disabled={importing || !projectId}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    e.target.value = "";
                    handleImportFile(file);
                  }}
                />
              </Field>
              {importing ? (
                <p className="text-sm text-text-secondary">
                  <Upload className="mr-1 inline h-4 w-4" /> Importing…
                </p>
              ) : lastImport ? (
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-sm">
                  <p className="font-medium text-foreground">
                    {lastImport.ok} of {lastImport.total} imported
                    {lastImport.failed ? `, ${lastImport.failed} failed` : ""}
                  </p>
                  {lastImport.errors.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-text-secondary">
                      {lastImport.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  icon={Merge}
                  title="No import yet"
                  description="Choose an entries JSON file to start. Titles are required; ids are re-minted."
                />
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default ImportExportScreen;
