"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Textarea } from "@geiger/ui/textarea";
import { Loader2 } from "lucide-react";
import { EmptyState, Field, SectionCard } from "@geiger/ui/screen-kit";
import { useProject } from "@/context/project-context";
import { useRbac } from "@/context/rbac-context";
import { getAssistant, askAssistant } from "@/lib/supabase/assistant";
import { OperationScreen, OperationSelect, OperationTable, useOperationData, displayTime } from "../operations_ui";

export function AiAssistantScreen() {
  const { projectId } = useProject();
  const { can } = useRbac();
  const state = useOperationData(projectId, getAssistant);
  const [prompt, setPrompt] = useState("");
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  async function ask() {
    setBusy(true);
    const result = await askAssistant(projectId, prompt, selection?.projectId === projectId ? selection.id : null);
    setBusy(false);
    if (result.ok) { setPrompt(""); await state.reload(); } else toast.error(result.error);
  }
  return <OperationScreen title="AI Assistant" description="Request editorial suggestions grounded in a selected entry. Responses are private to your account." projectId={projectId} {...state}>
    {!state.data?.configured ? <EmptyState icon={Sparkles} title="Generation provider unavailable" description="An administrator must configure the generation provider on the server. Saved history remains available below." /> : <SectionCard title="Ask the assistant" description="Suggestions do not change or publish content."><div className="space-y-4">
      <Field label="Entry context"><OperationSelect value={selection?.projectId === projectId ? selection.id : "none"} onChange={(id) => setSelection({ projectId, id: id === "none" ? null : id })} options={[{ value: "none", label: "No entry context" }, ...(state.data?.entries || []).map((entry) => ({ value: entry.id, label: entry.title || "Untitled" }))]} /></Field>
      <Field label="Request"><Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Summarize this entry, improve the introduction, or suggest a clearer title…" maxLength={4000} rows={4} /></Field>
      <Button onClick={ask} disabled={busy || !prompt.trim() || !can("content.entry.edit")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Generating…" : "Ask assistant"}</Button>
    </div></SectionCard>}
    <OperationTable rows={state.data?.history || []} title="No assistant history" description="Your saved requests and responses will appear here." columns={[{ key: "prompt", header: "Request", className: "min-w-48 max-w-xs whitespace-normal break-words" }, { key: "response", header: "Response", className: "min-w-64 max-w-xl whitespace-pre-wrap break-words" }, { key: "createdAt", header: "Created", render: (row) => displayTime(row.createdAt) }]} />
  </OperationScreen>;
}
export default AiAssistantScreen;
