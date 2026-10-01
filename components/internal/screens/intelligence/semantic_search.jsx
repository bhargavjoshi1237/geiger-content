"use client";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ScreenHeader,
  SectionCard,
  Field,
} from "@/components/internal/shared/screen_kit";
import { Input } from "@geiger/ui/input";
import { Button } from "@geiger/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { useProject } from "@/context/project-context";
import { requestVector } from "@/lib/supabase/semantic";
import { SemanticResults } from "./semantic_results";

export function SemanticSearchScreen() {
  const { projectId } = useProject();
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [busy, setBusy] = useState(false),
    [state, setState] = useState(null),
    [error, setError] = useState("");
  async function search(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const currentProject = projectId;
    const result = await requestVector("search", currentProject, {
      method: "POST",
      body: { query, kind },
    });
    setBusy(false);
    if (result.ok) setState({ projectId: currentProject, ...result.data });
    else {
      setState(null);
      setError(
        `${result.error}${result.retryAt ? ` Retry after ${new Date(result.retryAt).toLocaleString()}.` : ""}`,
      );
    }
  }
  const results = state?.projectId === projectId ? state.results : [];
  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Semantic Search"
        description="Find images and published content by meaning, using the same embedding space."
      />
      <SectionCard
        title="Search your library"
        description="Try a visual description such as “a bright product photo on a wooden table”."
      >
        <form
          onSubmit={search}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <Field label="Search" htmlFor="semantic-query" className="flex-1">
            <Input
              id="semantic-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Describe what you are looking for"
              maxLength={2000}
            />
          </Field>
          <Field label="Sources">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="asset">Images</SelectItem>
                <SelectItem value="entry">Content</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" disabled={busy || !query.trim() || !projectId}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}{" "}
            Search
          </Button>
        </form>
      </SectionCard>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-border bg-surface-card p-4 text-sm text-text-secondary"
        >
          {error}
        </p>
      ) : null}
      <SectionCard
        title={
          state?.projectId === projectId
            ? `${results.length} results`
            : "Results"
        }
        description="Scores indicate semantic similarity with editorial adjustments; they are not engagement predictions."
      >
        {busy ? (
          <div className="flex items-center gap-2 py-12 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : (
          <SemanticResults
            results={results}
            projectId={projectId}
            emptyDescription={
              state
                ? "Try a different description or index more relevant sources."
                : "Index your library in Embeddings, then search using a text description."
            }
          />
        )}
      </SectionCard>
    </MainScreenWrapper>
  );
}
export default SemanticSearchScreen;
