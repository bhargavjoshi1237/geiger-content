"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Badge } from "@geiger/ui/badge";
import { DataTable, SectionCard } from "@/components/internal/shared/screen_kit";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen } from "./insights_screen";

export function AiTagSuggestionsScreen() {
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("0.65");
  const [offset, setOffset] = useState(0);
  const state = useInsights("tags", { offset });
  const rows = (state.data?.rows || []).filter((r) => r.score >= Number(threshold) && `${r.content} ${r.tag} ${r.taxonomy}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="AI Tag Suggestions" description="Taxonomy terms supported by similar indexed neighbours, without generation requests." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.scanned ? "No new tag suggestions in this scan" : "No indexed published sources yet"} emptyDescription="Index published entries with taxonomy assignments. Suggestions appear when a similar neighbour has a term the source does not have."
    controls={<Select value={threshold} onValueChange={setThreshold}><SelectTrigger className="w-48" aria-label="Neighbour similarity"><SelectValue /></SelectTrigger><SelectContent>{["0.65", "0.75", "0.85", "0.95"].map((v) => <SelectItem key={v} value={v}>Neighbour similarity ≥ {Number(v) * 100}%</SelectItem>)}</SelectContent></Select>}
    stats={(d) => [{ label: "Suggestions", value: String(d.rows.length), footer: "Missing taxonomy assignments" }, { label: "Sources scanned", value: String(d.scanned), footer: "Current index page" }, { label: "Provider requests", value: "0", footer: "Uses stored vectors only" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <SectionCard title="Suggested terms" description="Review neighbour evidence and apply suitable terms in the entry editor. Similarity is not a calibrated probability."><DataTable columns={[{ key: "content", header: "Content" }, { key: "tag", header: "Suggested term", render: (r) => <Badge variant="neutral">{r.tag}</Badge> }, { key: "taxonomy", header: "Taxonomy" }, { key: "score", header: "Similarity", render: (r) => similarityLabel(r.score) }, { key: "evidence", header: "Evidence", render: (r) => r.evidence.map((e) => e.title).join(", ") }]} data={rows} getRowKey={(r) => r.id} /></SectionCard>
  </InsightsScreen>;
}
export default AiTagSuggestionsScreen;
