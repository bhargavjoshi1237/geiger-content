"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Network, Play } from "lucide-react";

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
import { Textarea } from "@geiger/ui/textarea";
import { CodeBlock } from "./code_block";

// Tester for the hand-rolled v1 GraphQL placeholder (app/api/content/v1/graphql) — only two shapes resolve, the rest return `errors`.
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

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.body, null, 2));
      toast.success("Result copied to clipboard.");
    } catch (e) {
      console.error("[graphql-tester.copy]", e);
      toast.error("Couldn't copy to clipboard.");
    }
  };

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
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "Running…" : "Run query"}
          </Button>
        }
      />

      <StatsBar stats={stats} columns={3} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard

          title="Query"
          description="Only `{ entries { … } }` and `{ entry(slug:) { … } }` resolve."
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-secondary">Samples</span>
              {SAMPLES.map((s) => (
                <Button
                  key={s.label}
                  variant="outline"
                  size="xs"
                  className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                  onClick={() => setQuery(s.query)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <Field label="GraphQL query" htmlFor="graphql-query">
              <Textarea
                id="graphql-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder="{ entries { id title slug status } }"
              />
            </Field>
            <Field label="Endpoint">
              <CodeBlock wrap code={`POST ${GRAPHQL_PATH}`} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard

          title="Result"
          description={result ? "JSON from the last query." : "Results appear here."}
          action={
            result && !running ? (
              <Badge variant={result.status >= 200 && result.status < 300 ? "success" : "danger"}>
                {result.status} · {result.ms} ms
              </Badge>
            ) : null
          }
        >
          {running ? (
            <LoadingArea size={40} label="Running query" />
          ) : !result ? (
            <EmptyState
              icon={Network}
              title="No result yet"
              description="Write a query and press Run query."
            />
          ) : (
            <CodeBlock
              code={JSON.stringify(result.body, null, 2)}
              onCopy={copyResult}
              copyLabel="Copy result"
              preClassName="max-h-96"
            />
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default GraphqlApiScreen;
