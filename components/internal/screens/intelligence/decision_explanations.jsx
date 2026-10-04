"use client";
import { useState } from "react";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { useInsights } from "./insights_data";
import { InsightsScreen, InsightsTable } from "./insights_screen";

const DAY_OPTIONS = ["7", "30", "90"].map((v) => ({ value: v, label: `Last ${v} days` }));
const KIND_OPTIONS = [{ value: "all", label: "All decisions" }, { value: "Decision", label: "Content decisions" }, { value: "Experiment", label: "Experiments" }];
const KIND_VARIANT = { Decision: "info", Experiment: "purple" };

export function DecisionExplanationsScreen() {
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState("all");
  const state = useInsights("decisions", { days });
  const rows = (state.data?.rows || []).filter((r) => (kind === "all" || r.kind === kind) && `${r.decision} ${r.reason}`.toLowerCase().includes(search.toLowerCase()));
  return <InsightsScreen title="Decision Explanations" description="Saved reasons for real content decisions and recorded experiment assignments." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle="No decisions recorded in this period" emptyDescription="Call the delivery decision endpoint or record experiment exposures to see real explanations. Historical decisions made before tracing was enabled are unavailable."
    controls={<>
      <FilterDropdown value={days} onValueChange={setDays} options={DAY_OPTIONS} />
      <FilterDropdown value={kind} onValueChange={setKind} options={KIND_OPTIONS} />
    </>}
    stats={(d) => [{ label: "Saved decisions", value: String(d.decisions), footer: "Recent request explanations" }, { label: "Experiment exposures", value: String(d.exposures), footer: "Recent allocations" }, { label: "Experiments", value: String(d.experiments), footer: "Active project records" }]}>
    <InsightsTable title="Recent explanations" description="Content traces preserve the engine's reason at decision time. Experiment reasons describe recorded allocation and conversion status." columns={[
      { key: "kind", header: "Type", render: (r) => <Badge variant={KIND_VARIANT[r.kind] || "neutral"}>{r.kind}</Badge> },
      { key: "decision", header: "Decision", render: (r) => <span className="block max-w-[16rem] truncate font-medium text-foreground" title={r.decision}>{r.decision}</span> },
      { key: "reason", header: "Reason", render: (r) => <span className="block min-w-[16rem] text-sm text-text-secondary">{r.reason}</span> },
      { key: "at", header: "Recorded", align: "right", render: (r) => <span className="whitespace-nowrap text-xs tabular-nums text-text-secondary">{new Date(r.at).toLocaleString()}</span> },
    ]} data={rows} getRowKey={(r) => r.id} />
  </InsightsScreen>;
}
export default DecisionExplanationsScreen;
