"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Play, RadioTower } from "lucide-react";

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
import { Button } from "@geiger/ui/button";
import { Badge } from "@geiger/ui/badge";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";

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
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Badge variant={e.method === "GET" ? "info" : "neutral"}>{e.method}</Badge>
            <span className="font-mono text-sm">{e.path}</span>
          </span>
          <span className="text-xs text-text-secondary">{e.description}</span>
        </div>
      ),
    },
    {
      key: "cache",
      header: "Cache",
      render: (e) => (
        <span className="font-mono text-xs text-text-secondary">{e.cache}</span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Delivery APIs"
        description="The public read surface — published entries only, no auth, cached at the edge. Drafts never leave the CMS through these routes."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleTestFetch}
            disabled={fetching}
          >
            <Play className="h-4 w-4" /> {fetching ? "Fetching…" : "Test live fetch"}
          </Button>
        }
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

      <div className="space-y-5">
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
              />
            </div>
          }
        />

        <SectionCard
          title="Live response preview"
          action={
            <Button
              variant="outline"
              className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
              onClick={handleTestFetch}
              disabled={fetching}
            >
              <FlaskConical className="h-4 w-4" /> {fetching ? "Fetching…" : "GET /api/content/v1/entries?limit=5"}
            </Button>
          }
        >
          {preview ? (
            <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed text-text-secondary">
              {preview}
            </pre>
          ) : (
            <p className="text-sm text-text-tertiary">
              Hit “Test live fetch” to call the delivery API from this browser
              and inspect exactly what external consumers receive.
            </p>
          )}
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default DeliveryApisScreen;
