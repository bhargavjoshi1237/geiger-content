"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Braces } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { CodeBlock } from "./code_block";

// Static v1 delivery route inventory; "Planned" rows are Phase 2 contracts documented ahead of their handlers.
const ENDPOINTS = [
  {
    id: "list-entries",
    method: "GET",
    path: "/api/content/v1/entries",
    title: "List published entries",
    state: "Planned",
    description: "Newest-first published entries, optionally scoped to a project.",
    exampleRequest: "GET /api/content/v1/entries?projectId=<uuid>&limit=25",
    exampleResponse: `{
  "data": [{ "id": "…", "title": "Hello", "slug": "hello", "status": "Published" }],
  "page": { "limit": 25, "count": 1 }
}`,
  },
  {
    id: "get-entry",
    method: "GET",
    path: "/api/content/v1/entries/[slug]",
    title: "Get entry by slug",
    state: "Planned",
    description: "Single published entry plus Cache-Control and tag revalidation.",
    exampleRequest: "GET /api/content/v1/entries/hello-world",
    exampleResponse: `{
  "data": { "id": "…", "title": "Hello", "slug": "hello-world", "body": "…" }
}`,
  },
  {
    id: "collect",
    method: "POST",
    path: "/api/content/v1/collect",
    title: "Collect event (beacon)",
    state: "Planned",
    description: "First-party analytics beacon feeding Phase 5 event collection.",
    exampleRequest: `POST /api/content/v1/collect
{ "type": "page_view", "entryId": "…" }`,
    exampleResponse: `{ "ok": true }`,
  },
  {
    id: "graphql",
    method: "POST",
    path: "/api/content/v1/graphql",
    title: "GraphQL (v1 placeholder)",
    state: "Live",
    description:
      "Hand-rolled placeholder supporting `{ entries { … } }` and `{ entry(slug:) { … } }`. Not a full spec.",
    exampleRequest: `POST /api/content/v1/graphql
{ "query": "{ entries { id title slug status } }" }`,
    exampleResponse: `{
  "data": { "entries": [{ "id": "…", "title": "Hello" }] },
  "extensions": { "geigerGraphql": "v1-placeholder" }
}`,
  },
  {
    id: "public-page",
    method: "GET",
    path: "/c/[id]",
    title: "Public page renderer",
    state: "Planned",
    description: "Server-rendered public page for a published entry (fixes view-page 404s).",
    exampleRequest: "GET /c/3fa85f64-5717-4562-b3fc-2c963f66afa6",
    exampleResponse: "<html>…rendered entry…</html>",
  },
];

const METHOD_VARIANTS = { GET: "success", POST: "info" };

const STATE_MAP = {
  Live: { label: "Live", variant: "success", dotClass: "bg-emerald-400" },
  Planned: { label: "Planned", variant: "neutral" },
};

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard.`);
  } catch (e) {
    console.error("[rest.copy]", e);
    toast.error("Couldn't copy to clipboard.");
  }
}

export function RestApiScreen() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(ENDPOINTS[0].id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      `${e.method} ${e.path} ${e.title} ${e.description}`
        .toLowerCase()
        .includes(q),
    );
  }, [search]);

  const selected = useMemo(
    () => ENDPOINTS.find((e) => e.id === selectedId) || null,
    [selectedId],
  );

  const stats = useMemo(
    () => [
      { label: "Endpoints", value: String(ENDPOINTS.length), footer: "v1 delivery surface" },
      {
        label: "Live",
        value: String(ENDPOINTS.filter((e) => e.state === "Live").length),
        footer: "Accepting traffic",
      },
      {
        label: "Planned",
        value: String(ENDPOINTS.filter((e) => e.state !== "Live").length),
        footer: "Phase 2 contract",
      },
    ],
    [],
  );

  const columns = [
    {
      key: "method",
      header: "Method",
      render: (r) => (
        <Badge variant={METHOD_VARIANTS[r.method] || "neutral"} className="font-mono">
          {r.method}
        </Badge>
      ),
    },
    {
      key: "path",
      header: "Endpoint",
      render: (r) => (
        <Button
          variant="ghost"
          aria-pressed={selectedId === r.id}
          aria-label={`Show ${r.method} ${r.path} examples`}
          onClick={() => setSelectedId(r.id)}
          className="h-auto w-full min-w-0 flex-col items-start gap-1 whitespace-normal p-2 text-left data-[pressed=true]:bg-surface-active"
          data-pressed={selectedId === r.id}
        >
          <span className="break-all font-mono text-sm text-foreground">{r.path}</span>
          <span className="text-xs text-text-secondary">{r.title}</span>
        </Button>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (r) => <StatusPill status={r.state} map={STATE_MAP} />,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="REST API"
        description="Versioned delivery endpoints, their contracts, and copy-paste examples."
      />

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search endpoints…"
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Braces}
            title="No endpoints match your filters"
            description="Try clearing the search."
            action={
              <Button
                variant="outline"
                className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <DataTable

            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
          />
          {selected ? (
            <SectionCard

              title={selected.title}
              description={selected.description}
              action={<StatusPill status={selected.state} map={STATE_MAP} />}
            >
              <div className="grid gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant={METHOD_VARIANTS[selected.method] || "neutral"}
                    className="font-mono"
                  >
                    {selected.method}
                  </Badge>
                  <span className="min-w-0 truncate font-mono text-sm text-foreground">
                    {selected.path}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  <p className="text-sm font-semibold text-foreground">Request</p>
                  <CodeBlock
                    code={selected.exampleRequest}
                    onCopy={() => copyText(selected.exampleRequest, "Request")}
                    copyLabel="Copy example request"
                  />
                </div>
                <div className="grid gap-1.5">
                  <p className="text-sm font-semibold text-foreground">Response</p>
                  <CodeBlock
                    code={selected.exampleResponse}
                    onCopy={() => copyText(selected.exampleResponse, "Response")}
                    copyLabel="Copy example response"
                    preClassName="max-h-64"
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      )}
    </MainScreenWrapper>
  );
}

export default RestApiScreen;
