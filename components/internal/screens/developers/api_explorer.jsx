"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2, Play, RotateCcw } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { LoadingArea } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
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
import { CodeBlock } from "./code_block";

// Delivery API request builder; unshipped (Phase 2) routes surface their 404 in the viewer instead of crashing.
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

  const copyResponse = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
      toast.success("Response copied to clipboard.");
    } catch (e) {
      console.error("[api-explorer.copy]", e);
      toast.error("Couldn't copy to clipboard.");
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
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {sending ? "Sending…" : "Send"}
            </Button>
          </>
        }
      />

      <StatsBar stats={stats} columns={3} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard

          title="Request"
          description="Pick an endpoint, fill its inputs, send."
        >
          <div className="grid gap-4">
            <Field label="Endpoint" htmlFor="explorer-endpoint">
              <Select value={endpointKey} onValueChange={setEndpointKey}>
                <SelectTrigger id="explorer-endpoint">
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
              <Field label="Slug" htmlFor="explorer-slug">
                <Input
                  id="explorer-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="hello-world"
                />
              </Field>
            ) : null}
            {endpoint.params.includes("limit") ? (
              <Field label="Limit" htmlFor="explorer-limit">
                <Input
                  id="explorer-limit"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="25"
                  inputMode="numeric"
                />
              </Field>
            ) : null}
            {endpoint.params.includes("query") ? (
              <Field label="Query" htmlFor="explorer-query">
                <Textarea
                  id="explorer-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </Field>
            ) : null}
            <Field label="Request URL">
              <CodeBlock wrap code={`${endpoint.method} ${previewUrl}`} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard

          title="Response"
          description={
            result
              ? "Live JSON from the last request."
              : "Responses appear here after you send a request."
          }
          action={
            result && !sending ? (
              <Badge variant={result.ok ? "success" : "danger"}>
                {result.status} · {result.ms} ms
              </Badge>
            ) : null
          }
        >
          {sending ? (
            <LoadingArea size={40} label="Sending request" />
          ) : !result ? (
            <EmptyState
              icon={FlaskConical}
              title="No response yet"
              description="Configure a request on the left and press Send."
            />
          ) : (
            <CodeBlock
              code={JSON.stringify(result.body, null, 2)}
              onCopy={copyResponse}
              copyLabel="Copy response"
              preClassName="max-h-96"
            />
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default ApiExplorerScreen;
