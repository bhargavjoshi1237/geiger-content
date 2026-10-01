"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { DataTable, SectionCard } from "@/components/internal/shared/screen_kit";
import { useInsights } from "./insights_data";
import { InsightsScreen } from "./insights_screen";

export function ContentGapsScreen() {
  const [search, setSearch] = useState("");
  const [minimum, setMinimum] = useState("3");
  const state = useInsights("gaps", { minimum });
  const rows = (state.data?.rows || []).filter((r) => `${r.topic} ${r.taxonomy}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Content Gaps" description="Taxonomy topics with weak coverage among eligible published sources in the vector index." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.topics ? "Every scanned topic meets the target" : "No taxonomy topics yet"} emptyDescription={state.data?.topics ? "All scanned topics have enough indexed published entries for the selected coverage target." : "Create taxonomy terms and assign them to published entries to measure indexed coverage."}
    controls={<Select value={minimum} onValueChange={setMinimum}><SelectTrigger className="w-48" aria-label="Coverage target"><SelectValue /></SelectTrigger><SelectContent>{["1", "3", "5", "10"].map((v) => <SelectItem key={v} value={v}>Target: {v} entries per topic</SelectItem>)}</SelectContent></Select>}
    stats={(d) => [{ label: "Topics reviewed", value: String(d.topics), footer: "Project taxonomies" }, { label: "Weak topics", value: String(d.rows.length), footer: "Below coverage target" }, { label: "Indexed sources", value: String(d.indexedSources), footer: "Visible published entries" }]}>
    <SectionCard title="Coverage backlog" description="Zero coverage includes topics without any eligible indexed source. This measures supply, without inferring demand."><DataTable columns={[{ key: "topic", header: "Topic" }, { key: "taxonomy", header: "Taxonomy" }, { key: "coverage", header: "Indexed entries" }, { key: "shortfall", header: "Below target" }, { key: "sources", header: "Existing coverage", render: (r) => r.sources.join(", ") || "No indexed entries" }]} data={rows} getRowKey={(r) => r.id} /></SectionCard>
  </InsightsScreen>;
}
export default ContentGapsScreen;
