"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Database,
  Settings,
  Users,
  RefreshCw,
  Play,
  Loader2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { EditorSections } from "@/components/internal/shared/editor_shell";
import {
  ScreenHeader,
  StatsBar,
  SectionCard,
  DataTable,
  EmptyState,
  Field,
  SettingsList,
  SettingRow,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { useProject } from "@/context/project-context";
import { requestVector } from "@/lib/supabase/semantic";
import { VectorAudience } from "./vector_audience";

const NAV = [
  { key: "coverage", label: "Library & jobs", icon: Layers },
  { key: "configuration", label: "Configuration", icon: Settings },
  { key: "audience", label: "Your interests & knowledge", icon: Users },
];
const bytes = (value) => `${(Number(value || 0) / 1024 / 1024).toFixed(1)} MB`;

export function EmbeddingsScreen() {
  const { projectId } = useProject();
  const [state, setState] = useState(null),
    [draft, setDraft] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await requestVector("status", projectId);
    if (result.ok) {
      setState({ projectId, ...result.data });
      setDraft(result.data.settings);
      setError("");
    } else setError(result.error);
  }, [projectId]);
  useEffect(() => {
    let alive = true;
    requestVector("status", projectId).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setState({ projectId, ...result.data });
        setDraft(result.data.settings);
        setError("");
      } else setError(result.error);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);
  const data = state?.projectId === projectId ? state : null;
  async function action(operation, body) {
    setBusy(true);
    const result = await requestVector(operation, projectId, {
      method: "POST",
      body,
    });
    setBusy(false);
    if (result.ok) {
      toast.success(
        operation === "worker"
          ? `Worker: ${result.data.completed} completed, ${result.data.deferred} deferred.`
          : operation === "sync"
            ? `${result.data.queued} sources queued.`
            : "Saved.",
      );
      await load();
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  }
  const stats = [
    {
      label: "Content vectors",
      value: String(data?.totals.contentVectors || 0),
      footer: "Independent images and text chunks",
    },
    {
      label: "Audience vectors",
      value: String(
        (data?.totals.profileVectors || 0) +
          (data?.totals.knowledgeVectors || 0),
      ),
      footer: "Interests and private knowledge",
    },
    {
      label: "Database storage",
      value: bytes(data?.totals.databaseBytes),
      footer: "Shared Aiven database usage",
    },
    {
      label: "Requests today",
      value: `${data?.quota.used || 0} / ${data?.quota.dailyLimit || "—"}`,
      footer: "Configured budget · all projects",
    },
  ];
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Embeddings"
        description="Image and content meaning, audience interests, and background indexing."
        actions={
          <>
            <Button variant="outline" disabled={busy} onClick={load}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button disabled={busy || !data} onClick={() => action("sync")}>
              <Database className="h-4 w-4" /> Index library
            </Button>
          </>
        }
      />
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-border bg-surface-card p-4 text-sm text-text-secondary"
        >
          {error}
        </p>
      ) : null}
      {!data && !error ? (
        <p className="flex items-center gap-2 py-8 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Connecting to the vector
          database…
        </p>
      ) : null}
      {data ? (
        <>
          <StatsBar stats={stats} />
          {!data.providerConfigured ? (
            <p
              role="status"
              className="rounded-lg border border-border bg-surface-card p-3 text-sm text-text-secondary"
            >
              Connect a Gemini API key in the server configuration to index
              images and text. Existing vectors remain available for similarity.
            </p>
          ) : null}
          {data.quota.blockedUntil &&
          Date.parse(data.quota.blockedUntil) >
            Date.parse(data.settings.checkedAt) ? (
            <p
              role="alert"
              className="rounded-lg border border-border p-3 text-sm text-text-secondary"
            >
              Gemini limit reached. Background jobs resume after{" "}
              {new Date(data.quota.blockedUntil).toLocaleString()}.
            </p>
          ) : null}
          <EditorSections nav={NAV} defaultSection="coverage">
            {({ active }) =>
              active === "audience" ? (
                <VectorAudience key={projectId} projectId={projectId} />
              ) : active === "configuration" ? (
                <div className="space-y-6">
                  <SectionCard
                    title="Connections"
                    description="Supabase owns application records. Aiven owns vectors and background jobs."
                  >
                    <SettingsList>
                      <SettingRow
                        title="Vector database"
                        description={`Connected · pgvector ${data.extension} · HNSW cosine index`}
                        control={
                          <span className="text-sm text-text-secondary">
                            Aiven
                          </span>
                        }
                      />
                      <SettingRow
                        title="Embedding provider"
                        description="Gemini Embedding 2 · 768 dimensions · Standard API"
                        control={
                          <span className="text-sm text-text-secondary">
                            {data.providerConfigured
                              ? "Configured"
                              : "Key needed"}
                          </span>
                        }
                      />
                    </SettingsList>
                  </SectionCard>
                  <SectionCard
                    title="Indexing settings"
                    description="Changes apply to subsequent background runs."
                  >
                    <fieldset disabled={busy} className="space-y-5">
                      <SettingsList>
                        {[
                          [
                            "enabled",
                            "Background indexing",
                            "Pause new indexing while retaining existing vectors.",
                          ],
                          [
                            "indexImages",
                            "Images",
                            "Index independent image assets. Originals remain in object storage.",
                          ],
                          [
                            "indexText",
                            "Published content",
                            "Index published entries as searchable chunks.",
                          ],
                          [
                            "audienceEnabled",
                            "Audience interests",
                            "Build interests only where personalization consent is granted.",
                          ],
                        ].map(([key, title, description]) => (
                          <SettingRow
                            key={key}
                            title={title}
                            description={description}
                            checked={Boolean(draft?.[key])}
                            onCheckedChange={(value) =>
                              setDraft((current) => ({
                                ...current,
                                [key]: value,
                              }))
                            }
                          />
                        ))}
                      </SettingsList>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {[
                          [
                            "ingestionDailyLimit",
                            "Daily ingestion budget",
                            1,
                            data.quota.dailyLimit,
                          ],
                          ["maxVectors", "Content vector limit", 100, 50000],
                          ["topicLimit", "Topic vectors per user", 0, 5],
                          ["halfLifeDays", "Interest half-life (days)", 1, 90],
                        ].map(([key, label, min, max]) => (
                          <Field
                            key={key}
                            label={label}
                            htmlFor={`vector-${key}`}
                          >
                            <Input
                              id={`vector-${key}`}
                              type="number"
                              min={min}
                              max={max}
                              value={draft?.[key] ?? ""}
                              onChange={(e) =>
                                setDraft((current) => ({
                                  ...current,
                                  [key]: Number(e.target.value),
                                }))
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <Button onClick={() => action("settings", draft)}>
                        Save changes
                      </Button>
                    </fieldset>
                  </SectionCard>
                  <SectionCard
                    title="Quota and storage"
                    description="These are local budgets, not a measurement of your Google project allowance."
                  >
                    <p className="text-sm text-text-secondary">
                      The shared request budget is {data.quota.rpmLimit} per
                      minute and {data.quota.dailyLimit} per day. Daily counters
                      reset at {new Date(data.quota.resetAt).toLocaleString()}.
                      Google can return a limit error sooner. Table and index
                      storage currently use {bytes(data.totals.tableBytes)}.
                    </p>
                    <a
                      className="mt-3 inline-block text-sm font-medium text-foreground underline"
                      href="https://aistudio.google.com/rate-limit"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check actual limits in AI Studio
                    </a>
                  </SectionCard>
                </div>
              ) : (
                <div className="space-y-6">
                  <SectionCard
                    title="Indexed library"
                    description="Only eligible sources you can access appear here."
                  >
                    <DataTable
                      columns={[
                        { key: "title", header: "Source" },
                        { key: "sourceKind", header: "Type" },
                        { key: "chunks", header: "Vectors" },
                        {
                          key: "updatedAt",
                          header: "Updated",
                          render: (row) =>
                            new Date(row.updatedAt).toLocaleString(),
                        },
                      ]}
                      data={data.sources}
                      getRowKey={(row) => `${row.sourceKind}:${row.sourceId}`}
                      empty={
                        <EmptyState
                          icon={Database}
                          title="No indexed sources yet"
                          description="Index the library, then run the worker. Images receive one vector each; long entries receive multiple chunks."
                        />
                      }
                    />
                  </SectionCard>
                  <SectionCard
                    title="Background jobs"
                    description="Failed jobs keep their reason. Rate-limited jobs retain their work and retry later."
                    action={
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => action("retry")}
                        >
                          Retry jobs
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy || !data.providerConfigured}
                          onClick={() => action("worker")}
                        >
                          <Play className="h-3.5 w-3.5" /> Run worker
                        </Button>
                      </div>
                    }
                  >
                    <DataTable
                      columns={[
                        { key: "sourceKind", header: "Source type" },
                        { key: "status", header: "Status" },
                        { key: "attempts", header: "Attempts" },
                        {
                          key: "error",
                          header: "Details",
                          render: (row) =>
                            row.error ||
                            (row.status === "retry"
                              ? `Retry ${new Date(row.retryAt).toLocaleString()}`
                              : "—"),
                        },
                      ]}
                      data={data.jobs}
                      getRowKey={(row) => row.id}
                      empty={
                        <EmptyState
                          title="No queued jobs"
                          description="Synchronize your library to queue changed sources."
                        />
                      }
                    />
                  </SectionCard>
                </div>
              )
            }
          </EditorSections>
        </>
      ) : null}
    </MainScreenWrapper>
  );
}
export default EmbeddingsScreen;
