"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Play, RotateCcw } from "lucide-react";

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
import { useProject } from "@/context/project-context";

// Query builder over the delivery REST endpoints with a live response viewer.
// Endpoints marked "planned" belong to Phase 2 — firing them before the route
// lands surfaces the 404 in the viewer instead of crashing.
const ENDPOINTS = [
  {
    key: "list",
    method: "GET",
    path: "/api/content/v1/entries",
    label: "List entries",
    params: ["projectId", "limit"],
  },
  {
    key: "single",
    method: "GET",
    path: "/api/content/v1/entries/[slug]",
    label: "Get entry by slug",
    params: ["slug"],
  },
  {
    key: "graphql",
    method: "POST",
    path: "/api/content/v1/graphql",
    label: "GraphQL (v1 placeholder)",
    params: ["query"],
  },
];

const DEFAULT_QUERY = "{ entries { id title slug status } }";

export function ApiExplorerScreen() {
  const { projectId } = useProject();
  const [endpointKey, setEndpointKey] = useState("list");
  const [slug, setSlug] = useState("");
  const [limit, setLimit] = useState("25");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const endpoint = useMemo(
    () => ENDPOINTS.find((e) => e.key === endpointKey) || ENDPOINTS[0],
    [endpointKey],
  );

  const previewUrl = useMemo(() => {
    if (endpoint.key === "list") {
      const qs = new URLSearchParams();
      if (projectId) qs.set("projectId", projectId);
      if (limit) qs.set("limit", limit);
      const s = qs.toString();
      return `${endpoint.path}${s ? `?${s}` : ""}`;
    }
    if (endpoint.key === "single") {
      return `/api/content/v1/entries/${slug.trim() || ":slug"}`;
    }
    return endpoint.path;
  }, [endpoint, projectId, limit, slug]);

  const send = async () => {
    setSending(true);
    const started = performance.now();
    try {
      let res;
      if (endpoint.key === "graphql") {
        res = await fetch(endpoint.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
      } else {
        res = await fetch(previewUrl);
      }
      const ms = Math.round(performance.now() - started);
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = { note: "Response was not JSON." };
      }
      setResult({ status: res.status, ok: res.ok, ms, body });
      if (!res.ok) toast.error(`Request failed with ${res.status}.`);
    } catch (e) {
      console.error("[api-explorer.send]", e);
      setResult({
        status: 0,
        ok: false,
        ms: Math.round(performance.now() - started),
        body: { error: "Network error — is the dev server running?" },
      });
      toast.error("Request failed to send.");
    } finally {
      setSending(false);
    }
  };

  const stats = useMemo(
    () => [
      { label: "Endpoints", value: String(ENDPOINTS.length), footer: "v1 delivery surface" },
      {
        label: "Last status",
        value: result ? String(result.status) : "—",
        footer: result ? (result.ok ? "Success" : "Failed") : "No request yet",
      },
      {
        label: "Response time",
        value: result ? `${result.ms} ms` : "—",
        footer: "Last request",
      },
    ],
    [result],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="API Explorer"
        description="Build delivery API requests and inspect the live JSON responses."
        actions={
          <>
            <Button
              variant="outline"
              className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              onClick={() => {
                setResult(null);
                setSlug("");
                setLimit("25");
                setQuery(DEFAULT_QUERY);
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={send}
              disabled={sending}
            >
              <Play className="h-4 w-4" /> {sending ? "Sending…" : "Send"}
            </Button>
          </>
        }
      />

      <StatsBar stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Request" description="Pick an endpoint, fill its inputs, send.">
          <div className="grid gap-4">
            <Field label="Endpoint">
              <Select value={endpointKey} onValueChange={setEndpointKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select endpoint" />
                </SelectTrigger>
                <SelectContent>
                  {ENDPOINTS.map((e) => (
                    <SelectItem key={e.key} value={e.key}>
                      {e.method} {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {endpoint.params.includes("slug") ? (
              <Field label="Slug">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="hello-world"
                />
              </Field>
            ) : null}
            {endpoint.params.includes("limit") ? (
              <Field label="Limit">
                <Input
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="25"
                  inputMode="numeric"
                />
              </Field>
            ) : null}
            {endpoint.params.includes("query") ? (
              <Field label="Query">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </Field>
            ) : null}
            <p className="break-all rounded-lg border border-border bg-surface-subtle px-3 py-2 font-mono text-xs text-text-secondary">
              {endpoint.method} {previewUrl}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Response"
          description={
            result
              ? `${result.status} · ${result.ms} ms`
              : "Responses appear here after you send a request."
          }
        >
          {sending ? (
            <TableSkeleton
              columns={[{ key: "response", header: "Response" }]}
            />
          ) : !result ? (
            <EmptyState
              icon={FlaskConical}
              title="No response yet"
              description="Configure a request on the left and press Send."
            />
          ) : (
            <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-foreground">
              {JSON.stringify(result.body, null, 2)}
            </pre>
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default ApiExplorerScreen;
