"use client";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen, InsightsTable } from "./insights_screen";

const THRESHOLD_OPTIONS = ["0.8", "0.85", "0.9", "0.95"].map((v) => ({ value: v, label: `At least ${Math.round(Number(v) * 100)}% similar` }));

export function DuplicateDetectionScreen() {
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("0.9");
  const [offset, setOffset] = useState(0);
  const state = useInsights("duplicates", { threshold: 0.8, offset });
  const rows = (state.data?.rows || []).filter((r) => r.score >= Number(threshold) && `${r.from} ${r.to}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Duplicate Detection" description="Near-duplicate published entries found with the live vector index." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.indexedSources ? "No near-duplicate pairs in this scan" : "No indexed published sources in this page"} emptyDescription={state.data?.indexedSources ? "No eligible indexed pair reached 80% similarity in this scan. Inspect the next page to review more sources." : "Index published content in Embeddings to compare entries. This page has no eligible indexed sources to assess."}
    controls={<FilterDropdown value={threshold} onValueChange={setThreshold} options={THRESHOLD_OPTIONS} />}
    stats={(d) => [{ label: "Pairs in scan", value: String(d.rows.length), footer: "At least 80% similar" }, { label: "Sources in page", value: String(d.indexedSources), footer: "Eligible published entries" }, { label: "Matching filters", value: String(rows.length), footer: "Current threshold and search" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <InsightsTable title="Similar pairs" description="Similarity is evidence for editorial review; confirm intent before merging content." columns={[
      { key: "from", header: "Entry", render: (r) => <span className="block max-w-[18rem] truncate font-medium text-foreground" title={r.from}>{r.from}</span> },
      { key: "link", header: "", className: "w-8 px-0", render: () => <ArrowLeftRight className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" /> },
      { key: "to", header: "Similar entry", render: (r) => <span className="block max-w-[18rem] truncate font-medium text-foreground" title={r.to}>{r.to}</span> },
      { key: "score", header: "Similarity", align: "right", render: (r) => <Badge variant={r.score >= 0.95 ? "danger" : r.score >= 0.9 ? "warning" : "neutral"} className="tabular-nums">{similarityLabel(r.score)}</Badge> },
    ]} data={rows} getRowKey={(r) => r.id} />
  </InsightsScreen>;
}
export default DuplicateDetectionScreen;
