"use client";

import React, { useMemo, useState } from "react";
import { Braces } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@/components/internal/shared/screen_kit";

// Static route inventory for the v1 delivery REST surface. Rows marked
// "planned" are Phase 2 work — the doc ships ahead of the handler so
// integrators can build against the contract.
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

const METHOD_STYLES = {
  GET: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  POST: "bg-sky-400/10 text-sky-400 border-sky-400/20",
};

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
        <span
          className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${METHOD_STYLES[r.method] || "border-border text-muted-foreground"}`}
        >
          {r.method}
        </span>
      ),
    },
    {
      key: "path",
      header: "Endpoint",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-sm text-foreground">{r.path}</span>
          <span className="text-xs text-text-secondary">{r.title}</span>
        </div>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <span className="text-sm text-text-secondary">{r.state}</span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="REST API"
        description="Versioned delivery endpoints, their contracts, and copy-paste examples."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
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
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable
            columns={columns}
            data={filtered}
            getRowKey={(r) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
          />
          {selected ? (
            <SectionCard
              title={selected.title}
              description={`${selected.method} ${selected.path} · ${selected.state}`}
            >
              <div className="grid gap-4">
                <p className="text-sm text-text-secondary">
                  {selected.description}
                </p>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Request
                  </p>
                  <pre className="overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-foreground">
                    {selected.exampleRequest}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Response
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 font-mono text-xs text-foreground">
                    {selected.exampleResponse}
                  </pre>
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
