"use client";
import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Trash2, BrainCircuit, Search } from "lucide-react";
import { toast } from "sonner";
import {
  SectionCard,
  SettingsList,
  SettingRow,
  Field,
  EmptyState,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { requestVector } from "@/lib/supabase/semantic";
import { SemanticResults } from "./semantic_results";

export function VectorAudience({ projectId }) {
  const [state, setState] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [topic, setTopic] = useState(""),
    [recommendations, setRecommendations] = useState(null),
    [knowledgeQuery, setKnowledgeQuery] = useState(""),
    [knowledgeMatches, setKnowledgeMatches] = useState(null);
  const load = useCallback(async () => {
    const result = await requestVector("audience", projectId);
    if (result.ok) setState({ projectId, ...result.data });
    else setError(result.error);
  }, [projectId]);
  useEffect(() => {
    let alive = true;
    requestVector("audience", projectId).then((result) => {
      if (!alive) return;
      if (result.ok) setState({ projectId, ...result.data });
      else setError(result.error);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);
  const data = state?.projectId === projectId ? state : null;
  async function mutate(operation, payload) {
    setBusy(true);
    setError("");
    const result = await requestVector(operation, projectId, {
      method: "POST",
      body: payload,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    if (payload.consent === "denied") {
      setRecommendations(null);
      setKnowledgeMatches(null);
    }
    if (operation === "knowledge") setKnowledgeMatches(null);
    await load();
    return true;
  }
  async function save() {
    if (await mutate("knowledge", { title, body, topic })) {
      setTitle("");
      setBody("");
      setTopic("");
      toast.success("Knowledge note saved.");
    }
  }
  async function recommend() {
    setBusy(true);
    const result = await requestVector("recommend", projectId, {
      method: "POST",
    });
    setBusy(false);
    if (result.ok) setRecommendations(result.data);
    else setError(result.error);
  }
  async function searchKnowledge(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await requestVector("knowledge", projectId, {
      query: { query: knowledgeQuery },
    });
    setBusy(false);
    if (result.ok) setKnowledgeMatches(result.data.results);
    else setError(result.error);
  }
  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-border bg-surface-card p-3 text-sm text-text-secondary"
        >
          {error}
        </p>
      ) : null}
      {!data && !error ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
        </p>
      ) : null}
      <SectionCard
        title="Your interests"
        description="Likes, saves, and recent engagement update your personal content interests."
      >
        <SettingsList>
          <SettingRow
            title="Allow personalization"
            description="Use your activity to build interest vectors and index your knowledge notes."
            checked={data?.consent === "granted"}
            onCheckedChange={(value) => {
              if (!busy)
                mutate("audience", { consent: value ? "granted" : "denied" });
            }}
          />
        </SettingsList>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || data?.consent !== "granted"}
            onClick={() => mutate("audience", { action: "refresh" })}
          >
            <RefreshCw className="h-4 w-4" /> Refresh interests
          </Button>
          <Button
            disabled={busy || data?.consent !== "granted"}
            onClick={recommend}
          >
            Recommend for me
          </Button>
        </div>
        {data?.interests?.length ? (
          <div className="mt-4 grid gap-2">
            {data.interests.map((item) => (
              <div
                key={item.topic}
                className="flex justify-between rounded-lg border border-border p-3 text-sm"
              >
                <span>{item.topic}</span>
                <span className="text-text-secondary">
                  {item.signals} content signals
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            Like indexed search results to establish your interests. Refreshes
            run in the background and reuse existing content vectors.
          </p>
        )}
      </SectionCard>
      {recommendations && data?.consent === "granted" ? (
        <SectionCard
          title="Recommended for you"
          description={
            recommendations.reason ||
            "Semantic affinity with editorial rules and exclusions."
          }
        >
          <SemanticResults
            results={recommendations.results}
            projectId={projectId}
          />
        </SectionCard>
      ) : null}
      <SectionCard
        title="Your knowledge"
        description="Record topics you know and what you have learned. These notes are private; embeddings help retrieve them and do not measure expertise."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="knowledge-title">
            <Input
              id="knowledge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="What you know"
            />
          </Field>
          <Field label="Topic" htmlFor="knowledge-topic">
            <Input
              id="knowledge-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={100}
              placeholder="e.g. Product photography"
            />
          </Field>
        </div>
        <Field label="Knowledge note" htmlFor="knowledge-body" className="mt-4">
          <Textarea
            id="knowledge-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Describe your experience or learning, with supporting context."
          />
        </Field>
        <Button
          className="mt-4"
          disabled={busy || !title.trim() || !body.trim()}
          onClick={save}
        >
          Save knowledge note
        </Button>
        {data?.knowledge?.length ? (
          <div className="mt-5 space-y-3">
            {data.knowledge.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-text-secondary">
                      {item.topic || "General"} · Self-declared
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${item.title}`}
                    disabled={busy}
                    onClick={() =>
                      mutate("knowledge", { action: "remove", id: item.id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BrainCircuit}
            title="No knowledge notes"
            description="Add a note to retain your learning context."
          />
        )}
        <form onSubmit={searchKnowledge} className="mt-6 flex items-end gap-3">
          <Field
            label="Search your knowledge"
            htmlFor="knowledge-query"
            className="flex-1"
          >
            <Input
              id="knowledge-query"
              value={knowledgeQuery}
              onChange={(event) => setKnowledgeQuery(event.target.value)}
              maxLength={2000}
              placeholder="Describe what you want to recall"
            />
          </Field>
          <Button
            type="submit"
            variant="outline"
            disabled={
              busy || !knowledgeQuery.trim() || data?.consent !== "granted"
            }
          >
            <Search className="h-4 w-4" />
            Search notes
          </Button>
        </form>
        {knowledgeMatches && data?.consent === "granted" ? (
          <div className="mt-4 space-y-3">
            {knowledgeMatches.length ? (
              knowledgeMatches.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <strong>{item.title}</strong>
                    <span className="text-text-secondary">
                      Similarity {item.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                    {item.body}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                No matching indexed notes. Run the background worker after
                saving a note.
              </p>
            )}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
