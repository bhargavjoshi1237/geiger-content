"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Network, Play } from "lucide-react";

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
import { Textarea } from "@geiger/ui/textarea";

// Tester for the hand-rolled v1 GraphQL placeholder
// (`app/api/content/v1/graphql/route.js`). NOT a full GraphQL spec — only the
// two documented shapes resolve; everything else returns `errors`.
const SAMPLES = [
  {
    label: "List entries",
    query: "{ entries { id title slug status } }",
  },
  {
    label: "Single entry",
    query: '{ entry(slug: "hello-world") { id title slug status excerpt } }',
  },
];

const GRAPHQL_PATH = "/api/content/v1/graphql";

export function GraphqlApiScreen() {
  const [query, setQuery] = useState(SAMPLES[0].query);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (!query.trim()) {
      toast.error("Write a query first.");
      return;
    }
    setRunning(true);
    const started = performance.now();
    try {
      const res = await fetch(GRAPHQL_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const ms = Math.round(performance.now() - started);
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = { errors: [{ message: "Response was not JSON." }] };
      }
      setResult({ status: res.status, ms, body });
      if (!res.ok) toast.error(`Query failed with ${res.status}.`);
    } catch (e) {
      console.error("[graphql-tester.run]", e);
      setResult({
        status: 0,
        ms: Math.round(performance.now() - started),
        body: { errors: [{ message: "Network error." }] },
      });
      toast.error("Query failed to send.");
    } finally {
      setRunning(false);
    }
  };

  const returnedCount = useMemo(() => {
    const data = result && result.body && result.body.data;
    if (!data) return "—";
    if (Array.isArray(data.entries)) return String(data.entries.length);
    if (data.entry) return "1";
    return "0";
  }, [result]);

  const stats = useMemo(
    () => [
      { label: "Endpoint", value: "v1", footer: "Placeholder, not full spec" },
      {
        label: "Last status",
        value: result ? String(result.status) : "—",
        footer: result ? `${result.ms} ms` : "No query yet",
      },
      { label: "Rows returned", value: returnedCount, footer: "Last response" },
    ],
    [result, returnedCount],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="GraphQL API"
        description="Exercise the v1 GraphQL placeholder — published entries only."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={run}
            disabled={running}
          >
            <Play className="h-4 w-4" /> {running ? "Running…" : "Run query"}
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Query"
          description="Only `{ entries { … } }` and `{ entry(slug:) { … } }` resolve."
          action={
            <div className="flex gap-2">
              {SAMPLES.map((s) => (
                <Button
                  key={s.label}
                  variant="ghost"
                  size="sm"
                  className="text-text-secondary hover:text-foreground"
                  onClick={() => setQuery(s.query)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          }
        >
          <Field label="GraphQL query">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder='{ entries { id title slug status } }'
            />
          </Field>
          <p className="break-all font-mono text-xs text-text-secondary">
            POST {GRAPHQL_PATH}
          </p>
        </SectionCard>

        <SectionCard
          title="Result"
          description={
            result ? `${result.status} · ${result.ms} ms` : "Results appear here."
          }
        >
          {running ? (
            <TableSkeleton columns={[{ key: "result", header: "Result" }]} />
          ) : !result ? (
            <EmptyState
              icon={Network}
              title="No result yet"
              description="Write a query and press Run query."
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

export default GraphqlApiScreen;
