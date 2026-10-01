"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Badge } from "@geiger/ui/badge";
import { DataTable, SectionCard } from "@/components/internal/shared/screen_kit";
import { useInsights } from "./insights_data";
import { InsightsScreen } from "./insights_screen";

export function DecisionExplanationsScreen() {
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState("all");
  const state = useInsights("decisions", { days });
  const rows = (state.data?.rows || []).filter((r) => (kind === "all" || r.kind === kind) && `${r.decision} ${r.reason}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Decision Explanations" description="Saved reasons for real content decisions and recorded experiment assignments." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle="No decisions recorded in this period" emptyDescription="Call the delivery decision endpoint or record experiment exposures to see real explanations. Historical decisions made before tracing was enabled are unavailable."
    controls={<>
      <Select value={days} onValueChange={setDays}><SelectTrigger className="w-40" aria-label="Time period"><SelectValue /></SelectTrigger><SelectContent>{["7", "30", "90"].map((v) => <SelectItem key={v} value={v}>Last {v} days</SelectItem>)}</SelectContent></Select>
      <Select value={kind} onValueChange={setKind}><SelectTrigger className="w-40" aria-label="Decision type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All decisions</SelectItem><SelectItem value="Decision">Content decisions</SelectItem><SelectItem value="Experiment">Experiments</SelectItem></SelectContent></Select>
    </>}
    stats={(d) => [{ label: "Saved decisions", value: String(d.decisions), footer: "Recent request explanations" }, { label: "Experiment exposures", value: String(d.exposures), footer: "Recent allocations" }, { label: "Experiments", value: String(d.experiments), footer: "Active project records" }]}>
    <SectionCard title="Recent explanations" description="Content traces preserve the engine's reason at decision time. Experiment reasons describe recorded allocation and conversion status."><DataTable columns={[{ key: "kind", header: "Type", render: (r) => <Badge variant="neutral">{r.kind}</Badge> }, { key: "decision", header: "Decision" }, { key: "reason", header: "Reason", render: (r) => <span className="whitespace-normal text-sm text-text-secondary">{r.reason}</span> }, { key: "at", header: "Recorded", render: (r) => new Date(r.at).toLocaleString() }]} data={rows} getRowKey={(r) => r.id} /></SectionCard>
  </InsightsScreen>;
}
export default DecisionExplanationsScreen;
