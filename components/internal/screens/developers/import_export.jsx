"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Braces,
  Download,
  FileSpreadsheet,
  FolderTree,
  LayoutTemplate,
  Loader2,
  Merge,
  Package,
} from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  SettingRow,
  SettingsList,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { LoadingArea } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { FileInput } from "@geiger/ui/file-input";
import { listContent, createContent } from "@/lib/supabase/content";
import { listCollections } from "@/lib/supabase/collections";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";

// JSON + CSV round trip: exports snapshot entries/collections/slots to files; import replays entries through createContent per row.
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

  const exportRows = [
    {
      key: "workspace",
      icon: Package,
      title: "Full workspace",
      description: "Entries, collections and slots · JSON",
      onExport: () => exportJson("workspace", { entries, collections, slots }),
    },
    {
      key: "entries",
      icon: Braces,
      title: "Entries",
      description: `${entries.length} rows · JSON`,
      onExport: () => exportJson("entries", entries),
    },
    {
      key: "collections",
      icon: FolderTree,
      title: "Collections",
      description: `${collections.length} rows · JSON`,
      onExport: () => exportJson("collections", collections),
    },
    {
      key: "slots",
      icon: LayoutTemplate,
      title: "Slots",
      description: `${slots.length} rows · JSON`,
      onExport: () => exportJson("slots", slots),
    },
    {
      key: "entries-csv",
      icon: FileSpreadsheet,
      title: "Entries spreadsheet",
      description: `${entries.length} rows · CSV`,
      onExport: exportEntriesCsv,
    },
  ];

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
        <LoadingArea panel size={48} label="Loading workspace data" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard

            title="Export"
            description="Download the current workspace as files."
          >
            <SettingsList>
              {exportRows.map((row) => (
                <SettingRow
                  key={row.key}
                  icon={row.icon}
                  title={row.title}
                  description={row.description}
                  control={
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Download ${row.title}`}
                      className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                      onClick={row.onExport}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  }
                />
              ))}
            </SettingsList>
          </SectionCard>

          <SectionCard

            title="Import"
            description="Replay an entries JSON array through createContent — one bad row never aborts the batch."
          >
            <div className="grid gap-4">
              <Field
                label="Entries JSON file"
                htmlFor="import-entries-file"
                hint={projectId ? "Titles are required; ids are re-minted." : "Select a project before importing."}
              >
                <FileInput
                  id="import-entries-file"
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
                <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                </p>
              ) : lastImport ? (
                <div className="rounded-lg border border-border bg-surface-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {lastImport.ok} of {lastImport.total} imported
                    </p>
                    <Badge variant={lastImport.failed ? "warning" : "success"}>
                      {lastImport.failed ? `${lastImport.failed} failed` : "All rows saved"}
                    </Badge>
                  </div>
                  {lastImport.errors.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 break-words pl-5 font-mono text-xs text-text-secondary">
                      {lastImport.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  className="py-10"
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
