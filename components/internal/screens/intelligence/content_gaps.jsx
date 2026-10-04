"use client";
import { useState } from "react";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { useInsights } from "./insights_data";
import { InsightsScreen, InsightsTable } from "./insights_screen";

const MINIMUM_OPTIONS = ["1", "3", "5", "10"].map((v) => ({ value: v, label: `Target: ${v} per topic` }));

export function ContentGapsScreen() {
  const [search, setSearch] = useState("");
  const [minimum, setMinimum] = useState("3");
  const state = useInsights("gaps", { minimum });
  const rows = (state.data?.rows || []).filter((r) => `${r.topic} ${r.taxonomy}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Content Gaps" description="Taxonomy topics with weak coverage among eligible published sources in the vector index." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.topics ? "Every scanned topic meets the target" : "No taxonomy topics yet"} emptyDescription={state.data?.topics ? "All scanned topics have enough indexed published entries for the selected coverage target." : "Create taxonomy terms and assign them to published entries to measure indexed coverage."}
    controls={<FilterDropdown value={minimum} onValueChange={setMinimum} options={MINIMUM_OPTIONS} />}
    stats={(d) => [{ label: "Topics reviewed", value: String(d.topics), footer: "Project taxonomies" }, { label: "Weak topics", value: String(d.rows.length), footer: "Below coverage target" }, { label: "Indexed sources", value: String(d.indexedSources), footer: "Visible published entries" }]}>
    <InsightsTable title="Coverage backlog" description="Zero coverage includes topics without any eligible indexed source. This measures supply, without inferring demand." columns={[
      { key: "topic", header: "Topic", render: (r) => <span className="font-medium text-foreground">{r.topic}</span> },
      { key: "taxonomy", header: "Taxonomy", render: (r) => <span className="whitespace-nowrap text-sm text-text-secondary">{r.taxonomy}</span> },
      { key: "coverage", header: "Indexed entries", align: "right", render: (r) => <span className="text-sm tabular-nums text-text-secondary">{r.coverage}</span> },
      { key: "shortfall", header: "Below target", align: "right", render: (r) => <Badge variant={r.coverage ? "warning" : "danger"} className="tabular-nums">{r.shortfall}</Badge> },
      { key: "sources", header: "Existing coverage", render: (r) => <span className="line-clamp-2 min-w-[12rem] text-xs text-text-secondary">{r.sources.join(", ") || "No indexed entries"}</span> },
    ]} data={rows} getRowKey={(r) => r.id} />
  </InsightsScreen>;
}
export default ContentGapsScreen;
