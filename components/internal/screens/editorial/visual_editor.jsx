"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Eye, Monitor, Smartphone, Tablet } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Badge } from "@geiger/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { CONTENT_STATUS_MAP, formatDate } from "../content/constants";
import { BodyBlocks } from "./body_blocks";
import { parseBody } from "./body_doc";

const DEVICES = [
  { key: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { key: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { key: "mobile", label: "Mobile", icon: Smartphone, width: "390px" },
];

// Read-only preview of a published entry at desktop / tablet / mobile widths.
export function VisualEditorScreen() {
  const [entries, setEntries] = useState([]);
  const [entryId, setEntryId] = useState("");
  const [device, setDevice] = useState("desktop");
  const [loading, setLoading] = useState(true);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      const published = (result ?? []).filter((e) => e.status === "Published");
      setEntries(published);
      setEntryId((prev) => prev || published[0]?.id || "");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const selected = useMemo(
    () => entries.find((e) => e.id === entryId) || null,
    [entries, entryId],
  );
  const activeDevice = DEVICES.find((d) => d.key === device) || DEVICES[0];

  const stats = useMemo(
    () => [
      { label: "Published", value: String(entries.length), footer: "Previewable" },
      {
        label: "Device",
        value: activeDevice.label,
        footer: `Preview width ${activeDevice.width}`,
      },
      {
        label: "Updated",
        value: selected ? formatDate(selected.updatedAt) || "—" : "—",
        footer: selected?.title || "No entry selected",
      },
    ],
    [entries, activeDevice, selected],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Visual Editor"
        description="Preview a published entry the way readers see it."
        actions={
          <div className="flex items-center gap-2">
            <Select value={entryId} onValueChange={setEntryId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a published entry" />
              </SelectTrigger>
              <SelectContent>
                {entries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div
              role="group"
              aria-label="Preview device"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface-subtle p-1"
            >
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  aria-label={`${d.label} preview`}
                  aria-pressed={device === d.key}
                  onClick={() => setDevice(d.key)}
                  className={`rounded-md p-2 ${
                    device === d.key
                      ? "bg-primary text-primary-foreground"
                      : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <d.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        }
      />
      <StatsBar stats={stats} />
      {loading ? (
        <TableSkeleton columns={[{ key: "preview", header: "Preview" }]} />
      ) : !selected ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Eye}
            title="Nothing published yet"
            description="Publish an entry first — the preview only shows live content."
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <SectionCard
            title={selected.title}
            description={`/${selected.slug} · ${selected.type} · ${formatDate(selected.publishedAt || selected.updatedAt)}`}
            action={
              <Badge variant={CONTENT_STATUS_MAP[selected.status]?.variant || "neutral"}>
                {selected.status}
              </Badge>
            }
            className="w-full transition-all"
          >
            <div className="mx-auto w-full" style={{ maxWidth: activeDevice.width }}>
              {selected.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.coverUrl}
                  alt=""
                  className="mb-4 max-h-72 w-full rounded-lg border border-border object-cover"
                />
              ) : null}
              {selected.excerpt ? (
                <p className="mb-3 text-base text-text-secondary">{selected.excerpt}</p>
              ) : null}
              {parseBody(selected.body).blocks.some((b) => b.text.trim() !== "") ? (
                <BodyBlocks value={selected.body} className="space-y-4 text-sm" />
              ) : (
                <p className="text-sm leading-relaxed text-text-tertiary">
                  No body text on this entry.
                </p>
              )}
              {selected.author ? (
                <p className="mt-4 text-xs text-text-tertiary">By {selected.author}</p>
              ) : null}
            </div>
          </SectionCard>
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default VisualEditorScreen;
