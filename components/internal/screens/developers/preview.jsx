"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Eye } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  Field,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { LoadingArea } from "@geiger/ui";
import { Button } from "@geiger/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { CodeBlock } from "./code_block";

// Preview link builder for the public /c/[id] renderer; a 404 in the frame means Phase 2 hasn't landed.
export function PreviewScreen() {
  const { projectId } = useProject();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entryId, setEntryId] = useState("");

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((rows) => {
      if (!alive) return;
      setEntries(rows ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const published = useMemo(
    () => entries.filter((e) => e.status === "Published"),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return published;
    return published.filter((e) =>
      `${e.title} ${e.slug}`.toLowerCase().includes(q),
    );
  }, [published, search]);

  const selected = useMemo(
    () => entries.find((e) => e.id === entryId) || null,
    [entries, entryId],
  );

  const previewUrl = selected ? `/c/${selected.id}` : "";

  const copy = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${previewUrl}`,
      );
      toast.success("Preview URL copied.");
    } catch (e) {
      console.error("[preview.copy]", e);
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const stats = useMemo(
    () => [
      { label: "Entries", value: String(entries.length), footer: "This project" },
      { label: "Published", value: String(published.length), footer: "Previewable" },
      {
        label: "Selected",
        value: selected ? "1" : "—",
        footer: selected ? selected.slug || selected.title : "Pick an entry",
      },
    ],
    [entries, published, selected],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Preview Tools"
        description="Build public preview links for published entries."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!selected}
            onClick={() => selected && window.open(previewUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" /> Open preview
          </Button>
        }
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search published entries…"
        />
      </Toolbar>

      {loading ? (
        <LoadingArea panel size={48} label="Loading entries" />
      ) : published.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Eye}
            title="Nothing to preview"
            description="Publish an entry first — drafts have no public URL."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard

            title="Entry"
            description="Only published entries get a public URL."
          >
            <div className="grid gap-4">
              <Field label="Published entry" htmlFor="preview-entry">
                <Select value={entryId} onValueChange={setEntryId}>
                  <SelectTrigger id="preview-entry">
                    <SelectValue placeholder="Select an entry" />
                  </SelectTrigger>
                  <SelectContent>
                    {filtered.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title || e.slug || e.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {selected ? (
                <Field label="Preview URL">
                  <CodeBlock
                    wrap
                    code={previewUrl}
                    onCopy={copy}
                    copyLabel="Copy preview URL"
                  />
                </Field>
              ) : (
                <p className="text-sm text-text-secondary">
                  {filtered.length === 0
                    ? "No published entries match your search."
                    : "Select an entry to build its preview URL."}
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard

            title="Preview"
            description={
              selected ? "Live frame of the public page." : "The frame loads once you pick an entry."
            }
          >
            {!selected ? (
              <EmptyState
                icon={Eye}
                title="No entry selected"
                description="Pick a published entry to preview it here."
              />
            ) : (
              <iframe
                title={`Preview of ${selected.title}`}
                src={previewUrl}
                className="h-80 w-full rounded-lg border border-border bg-background sm:h-96"
              />
            )}
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default PreviewScreen;
