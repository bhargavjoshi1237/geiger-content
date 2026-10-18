"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, RefreshCw, Variable } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  EmptyState,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { CodeBlock } from "./code_block";
import { listContentTypes, listFieldsByType } from "@/lib/supabase/types";
import { buildRegistry, schemaDocument } from "@/lib/delivery/v2/schema.mjs";
import { generateTypes } from "@/lib/delivery/v2/typegen.mjs";
import { useProject } from "@/context/project-context";

// Same generator as GET /api/content/v2/projects/<id>/_schema?format=ts, fed from the workspace's own reads.
async function loadSchema(projectId) {
  const types = (await listContentTypes(projectId)) ?? [];
  const fields = (
    await Promise.all(types.map(async (t) => (await listFieldsByType(t.id)) ?? []))
  ).flat();
  const registry = buildRegistry(
    types.map((t) => ({ id: t.id, key: t.key, name: t.name, api_id: t.apiId, api_plural: t.apiPlural })),
    fields.map((f) => ({
      type_id: f.typeId,
      key: f.key,
      label: f.label,
      data_type: f.dataType,
      validation: f.validation,
      localized: f.localized,
      position: f.position,
      metadata: f.metadata,
    })),
  );
  return schemaDocument(registry);
}

export function TypesScreen() {
  const { projectId } = useProject();
  const [schema, setSchema] = useState({ types: [] });
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setSchema(await loadSchema(projectId));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    loadSchema(projectId).then((next) => {
      if (!alive) return;
      setSchema(next);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const output = useMemo(
    () => (schema.types.length ? generateTypes(schema, { source: "Geiger Content" }) : ""),
    [schema],
  );

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const command = `curl -H "Authorization: Bearer $GEIGER_TOKEN" \\
  "https://your-app.example${basePath}/api/content/v2/projects/${projectId || "<project id>"}/_schema?format=ts" \\
  -o geiger-content.d.ts`;

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
      { label: "Content types", value: String(schema.types.length), footer: "One interface each" },
      {
        label: "Fields",
        value: String(schema.types.reduce((n, t) => n + t.fields.length, 0)),
        footer: "Delivered, typed fields",
      },
      { label: "Lines", value: String(output ? output.split("\n").length : 0), footer: "Output size" },
    ],
    [schema, output],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Type Generation"
        description="TypeScript types for the delivery API, generated from this project's content types."
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

      <StatsBar stats={stats} columns={3} />

      {loading ? (
        <TableSkeleton columns={[{ key: "types", header: "Types" }]} />
      ) : !output ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Variable}
            title="No content types yet"
            description="Define a content type under Architecture, then generate its types here."
          />
        </div>
      ) : (
        <>
          <SectionCard
            title="geiger-content.d.ts"
            description="Entry interfaces, filter types and a plural → type map. Private fields are left out."
          >
            <CodeBlock code={output} preClassName="max-h-[32rem]" />
          </SectionCard>
          <SectionCard
            title="Fetch in CI"
            description="The same file over the API. Needs a token with the schema:read scope."
          >
            <CodeBlock code={command} />
          </SectionCard>
        </>
      )}
    </MainScreenWrapper>
  );
}

export default TypesScreen;
