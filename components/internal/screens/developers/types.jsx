"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, RefreshCw, Variable } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import {
  contentClient,
  isSupabaseConfigured,
} from "@/supabase/components/content-client";
import { useProject } from "@/context/project-context";

// Generate TypeScript types for the workspace. Phase 3 will own
// `content.content_types` (key, name + `content.fields`); until that table
// exists we probe for it and fall back to the built-in Entry / Collection /
// Asset / Slot shapes so the screen is useful today.
const FALLBACK_TYPES = `// Generated from the Geiger Content workspace (fallback shapes).
// Re-run after Phase 3 defines content_types for per-type interfaces.

export type ContentStatus = "Draft" | "In review" | "Published" | "Scheduled" | "Archived";

export interface ContentEntry {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  type: string;
  excerpt: string;
  body: string;
  author: string;
  locale: string;
  coverUrl: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  projectId: string | null;
}

export interface ContentCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  itemCount: number;
}

export interface ContentAsset {
  id: string;
  name: string;
  fileType: string;
  mime: string;
  sizeBytes: number;
  url: string;
}

export interface ContentSlot {
  id: string;
  key: string;
  name: string;
  status: string;
  fallbackEntryId: string | null;
}
`;

function toTsType(field) {
  const t = String(field.data_type || "text").toLowerCase();
  if (t === "number" || t === "integer" || t === "float") return "number";
  if (t === "boolean" || t === "bool") return "boolean";
  if (t === "date" || t === "datetime" || t === "timestamptz") return "string";
  if (t === "json" || t === "jsonb" || t === "array") return "unknown";
  return "string";
}

function typesFromContentTypes(contentTypes) {
  const blocks = contentTypes.map((ct) => {
    const fields = Array.isArray(ct.fields) ? ct.fields : [];
    const lines = fields.map(
      (f) => `  ${f.key}: ${toTsType(f)};`,
    );
    return `export interface ${ct.name} {\n  id: string;\n  slug: string;\n  status: ContentStatus;\n${lines.join("\n")}\n}`;
  });
  return `// Generated from content.content_types.\nexport type ContentStatus = "Draft" | "In review" | "Published" | "Scheduled" | "Archived";\n\n${blocks.join("\n\n")}\n`;
}

async function loadTypeOutput() {
  if (!isSupabaseConfigured()) return { output: FALLBACK_TYPES, source: "fallback" };
  try {
    const sb = contentClient();
    const { data, error } = await sb
      .from("content_types")
      .select("key, name, fields")
      .order("name", { ascending: true });
    if (error || !data || data.length === 0) {
      if (error) console.error("[types.generate]", error.message);
      return { output: FALLBACK_TYPES, source: "fallback" };
    }
    return { output: typesFromContentTypes(data), source: "content_types" };
  } catch (e) {
    console.error("[types.generate]", e);
    return { output: FALLBACK_TYPES, source: "fallback" };
  }
}

export function TypesScreen() {
  const { projectId } = useProject();
  const [output, setOutput] = useState("");
  const [source, setSource] = useState("fallback");
  const [loading, setLoading] = useState(true);

  const generate = async () => {
    setLoading(true);
    const next = await loadTypeOutput();
    setOutput(next.output);
    setSource(next.source);
    setLoading(false);
  };

  // Probe once on mount (and when the project changes); output is
  // project-independent until content_types itself is project-scoped.
  useEffect(() => {
    let alive = true;
    loadTypeOutput().then((next) => {
      if (!alive) return;
      setOutput(next.output);
      setSource(next.source);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const interfaceCount = useMemo(
    () => (output.match(/export interface /g) || []).length,
    [output],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Types copied to clipboard.");
    } catch (e) {
      console.error("[types.copy]", e);
      toast.error("Couldn't copy to clipboard.");
    }
  };

  const download = () => {
    try {
      const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "geiger-content.d.ts";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Types downloaded.");
    } catch (e) {
      console.error("[types.download]", e);
      toast.error("Couldn't download the file.");
    }
  };

  const stats = useMemo(
    () => [
      { label: "Interfaces", value: String(interfaceCount), footer: "Generated" },
      {
        label: "Source",
        value: source === "content_types" ? "Types" : "Fallback",
        footer:
          source === "content_types"
            ? "From content_types"
            : "content_types not yet defined",
      },
      { label: "Lines", value: String(output ? output.split("\n").length : 0), footer: "Output size" },
    ],
    [interfaceCount, source, output],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Type Generation"
        description="Generate TypeScript interfaces from the workspace's content types."
        actions={
          <>
            <Button
              variant="outline"
              className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              onClick={generate}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
            <Button
              variant="outline"
              className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              onClick={copy}
              disabled={loading || !output}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={download}
              disabled={loading || !output}
            >
              <Download className="h-4 w-4" /> Download .d.ts
            </Button>
          </>
        }
      />

      <StatsBar stats={stats} />

      {loading ? (
        <TableSkeleton columns={[{ key: "types", header: "Types" }]} />
      ) : !output ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Variable}
            title="Nothing to generate"
            description="Define a content type first (Phase 3), or use the fallback shapes."
          />
        </div>
      ) : (
        <SectionCard
          title="geiger-content.d.ts"
          description={
            source === "content_types"
              ? "Generated from content.content_types."
              : "Fallback shapes — content_types is not defined yet (Phase 3)."
          }
        >
          <pre className="max-h-[32rem] overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-foreground">
            {output}
          </pre>
        </SectionCard>
      )}
    </MainScreenWrapper>
  );
}

export default TypesScreen;
