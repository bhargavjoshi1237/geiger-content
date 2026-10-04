"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2, Play, RadioTower, X } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { CodeBlock } from "../developers/code_block";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/content/v1/entries",
    description: "Published entries — optional ?project=, ?type=, ?limit=.",
    cache: "s-maxage=60, stale-while-revalidate",
  },
  {
    method: "GET",
    path: "/api/content/v1/entries/[slug]",
    description: "One published entry by slug. 404s unless Published.",
    cache: "s-maxage=60, stale-while-revalidate",
  },
  {
    method: "GET",
    path: "/api/cron/publish-due",
    description: "Cron: publishes Scheduled entries whose time passed.",
    cache: "no-store",
  },
];

export function DeliveryApisScreen() {
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [preview, setPreview] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setPublished((result || []).filter((r) => r.status === "Published").length);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    if (!search) return ENDPOINTS;
    return ENDPOINTS.filter((e) =>
      `${e.method} ${e.path} ${e.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [search]);

  const stats = useMemo(
    () => [
      { label: "Endpoints", value: String(ENDPOINTS.length), footer: "REST, published-only" },
      { label: "Published entries", value: published === null ? "—" : String(published), footer: "Live in delivery" },
      { label: "Cache TTL", value: "60s", footer: "stale-while-revalidate" },
      {
        label: "Last check",
        value: lastFetch ? `${lastFetch.ms}ms` : "—",
        footer: lastFetch ? `${lastFetch.count} rows · ${lastFetch.at}` : "Run a test fetch",
      },
    ],
    [published, lastFetch],
  );

  const handleTestFetch = async () => {
    setFetching(true);
    const started = performance.now();
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (projectId) params.set("project", projectId);
      const res = await fetch(`/api/content/v1/entries?${params.toString()}`);
      const json = await res.json().catch(() => null);
      const ms = Math.round(performance.now() - started);
      const count = Array.isArray(json) ? json.length : 0;
      setLastFetch({ ms, count, at: new Date().toLocaleTimeString() });
      setPreview(JSON.stringify(json, null, 2).slice(0, 4000));
      if (res.ok) {
        toast.success(`Delivery API answered in ${ms}ms (${count} rows).`);
      } else {
        toast.error("Delivery API returned an error — see the preview.");
      }
    } catch {
      toast.error("Couldn't reach the delivery API.");
      setPreview("");
    } finally {
      setFetching(false);
    }
  };

  const columns = [
    {
      key: "endpoint",
      header: "Endpoint",
      render: (e) => (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
            <Badge variant={e.method === "GET" ? "info" : "neutral"}>{e.method}</Badge>
            <span className="font-mono text-sm break-all">{e.path}</span>
          </span>
          <span className="text-xs text-text-secondary">{e.description}</span>
        </div>
      ),
    },
    {
      key: "cache",
      header: "Cache",
      render: (e) => (
        <span className="block max-w-64 whitespace-normal break-words font-mono text-xs text-text-secondary">{e.cache}</span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Delivery APIs"
        description="The public read surface — published entries only, no auth, cached at the edge. Drafts never leave the CMS through these routes."
        actions={
          <Button onClick={handleTestFetch} disabled={fetching}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {fetching ? "Fetching…" : "Test live fetch"}
          </Button>
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search endpoints…"
        />
      </Toolbar>

      <div className="space-y-8">
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(e) => e.path}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={RadioTower}
                title="No endpoints match your search"
                description="Try clearing the search."
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    <X className="h-4 w-4" /> Clear search
                  </Button>
                }
              />
            </div>
          }
        />

        <SectionCard
          title="Live response preview"
          description="GET /api/content/v1/entries?limit=5 from this browser."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestFetch}
              disabled={fetching}
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {fetching ? "Fetching…" : "Run"}
            </Button>
          }
        >
          {preview ? (
            <CodeBlock code={preview} preClassName="max-h-96" />
          ) : (
            <EmptyState
              icon={FlaskConical}
              title="No response yet"
              description="Run a test fetch to inspect exactly what external consumers receive."
              className="py-10"
            />
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default DeliveryApisScreen;
