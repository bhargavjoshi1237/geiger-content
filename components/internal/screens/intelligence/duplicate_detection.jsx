"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { DataTable, SectionCard } from "@/components/internal/shared/screen_kit";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen } from "./insights_screen";

export function DuplicateDetectionScreen() {
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("0.9");
  const [offset, setOffset] = useState(0);
  const state = useInsights("duplicates", { threshold: 0.8, offset });
  const rows = (state.data?.rows || []).filter((r) => r.score >= Number(threshold) && `${r.from} ${r.to}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Duplicate Detection" description="Near-duplicate published entries found with the live vector index." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.indexedSources ? "No near-duplicate pairs in this scan" : "No indexed published sources in this page"} emptyDescription={state.data?.indexedSources ? "No eligible indexed pair reached 80% similarity in this scan. Inspect the next page to review more sources." : "Index published content in Embeddings to compare entries. This page has no eligible indexed sources to assess."}
    controls={<Select value={threshold} onValueChange={setThreshold}><SelectTrigger className="w-48" aria-label="Minimum similarity"><SelectValue /></SelectTrigger><SelectContent>{["0.8", "0.85", "0.9", "0.95"].map((v) => <SelectItem key={v} value={v}>At least {Number(v) * 100}% similar</SelectItem>)}</SelectContent></Select>}
    stats={(d) => [{ label: "Pairs in scan", value: String(d.rows.length), footer: "At least 80% similar" }, { label: "Sources in page", value: String(d.indexedSources), footer: "Eligible published entries" }, { label: "Matching filters", value: String(rows.length), footer: "Current threshold and search" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <SectionCard title="Similar pairs" description="Similarity is evidence for editorial review; confirm intent before merging content."><DataTable columns={[{ key: "from", header: "Entry" }, { key: "to", header: "Similar entry" }, { key: "score", header: "Similarity", render: (r) => similarityLabel(r.score) }]} data={rows} getRowKey={(r) => r.id} /></SectionCard>
  </InsightsScreen>;
}
export default DuplicateDetectionScreen;
