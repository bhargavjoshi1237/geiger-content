"use client";
import { useState } from "react";
import { Badge } from "@geiger/ui/badge";
import FilterDropdown from "@/components/internal/screens/overview/filter_dropdown";
import { SectionCard } from "@geiger/ui/screen-kit";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen, InsightsTable } from "./insights_screen";

const NODE_FILL = { entry: "var(--chart-1)", term: "var(--chart-2)", taxonomy: "var(--chart-3)" };
const RELATION_OPTIONS = [{ value: "all", label: "All relations" }, { value: "reference", label: "References" }, { value: "tagged", label: "Tagged" }, { value: "taxonomy", label: "Taxonomy" }, { value: "similar", label: "Similar" }];
const RELATION_VARIANT = { similar: "purple", tagged: "info", taxonomy: "neutral" };

export function KnowledgeGraphScreen() {
  const [search, setSearch] = useState("");
  const [relation, setRelation] = useState("all");
  const [offset, setOffset] = useState(0);
  const state = useInsights("graph", { offset });
  const rows = (state.data?.rows || []).filter((r) => (relation === "all" || (relation === "reference" ? !["tagged", "taxonomy", "similar"].includes(r.relation) : r.relation === relation)) && `${r.from} ${r.to} ${r.relation}`.toLowerCase().includes(search.toLowerCase()));
  const related = new Set(rows.flatMap((r) => [r.fromId, r.toId]));
  const nodes = (state.data?.nodes || []).filter((r) => related.has(r.id)).slice(0, 40);
  const positioned = new Map(nodes.map((n, i) => [n.id, { ...n, x: 300 + 240 * Math.cos(2 * Math.PI * i / Math.max(1, nodes.length)), y: 180 + 135 * Math.sin(2 * Math.PI * i / Math.max(1, nodes.length)) }]));
  return <InsightsScreen title="Knowledge Graph" description="Published content connected by entry references, taxonomy terms and indexed semantic similarity." state={state} search={search} onSearchChange={setSearch} rows={rows}
    emptyTitle={state.data?.scanned ? "No graph relations in this scan" : "No indexed published sources yet"} emptyDescription="Index published entries, add references and assign taxonomy terms to build connections."
    controls={<FilterDropdown value={relation} onValueChange={setRelation} options={RELATION_OPTIONS} />}
    stats={(d) => [{ label: "Entities", value: String(d.nodes.length), footer: "Visible content and taxonomy" }, { label: "Relations", value: String(d.rows.length), footer: "References, tags and similarity" }, { label: "Semantic links", value: String(d.rows.filter((r) => r.relation === "similar").length), footer: "At least 75% similar" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <SectionCard title="Graph explorer" description="Select a node to filter its relations. The diagram shows up to 40 entities from the filtered results.">
      <svg viewBox="0 0 600 360" role="group" aria-label="Content knowledge graph" className="aspect-[5/3] h-auto max-h-[440px] w-full rounded-xl border border-border bg-surface-card">
        {rows.filter((r) => positioned.has(r.fromId) && positioned.has(r.toId)).slice(0, 150).map((r) => <line key={r.id} x1={positioned.get(r.fromId).x} y1={positioned.get(r.fromId).y} x2={positioned.get(r.toId).x} y2={positioned.get(r.toId).y} stroke="var(--border-strong)" strokeWidth={r.relation === "similar" ? 1 : 1.5} strokeDasharray={r.relation === "similar" ? "4 4" : undefined}><title>{r.from} · {r.relation} · {r.to}</title></line>)}
        {[...positioned.values()].map((n) => <g key={n.id} role="button" tabIndex={0} aria-label={`Filter relations for ${n.label}`} className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-60" onClick={() => setSearch(n.label)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSearch(n.label); } }}>
          <title>{n.label} · {n.kind}</title><circle cx={n.x} cy={n.y} r={7} fill={NODE_FILL[n.kind]} stroke="var(--background)" strokeWidth={1.5} /><text x={n.x} y={n.y + 18} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">{n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}</text>
        </g>)}
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-2">{Object.entries(NODE_FILL).map(([kind, fill]) => <Badge key={kind} variant="outline" className="capitalize"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: fill }} />{kind}</Badge>)}<span className="text-xs text-text-tertiary">Dashed lines are inferred similarity.</span></div>
    </SectionCard>
    <InsightsTable title="Relations" description="Explicit references and taxonomy assignments are distinguished from inferred similarity." columns={[
      { key: "from", header: "From", render: (r) => <span className="block max-w-[16rem] truncate font-medium text-foreground" title={r.from}>{r.from}</span> },
      { key: "relation", header: "Relation", render: (r) => <Badge variant={RELATION_VARIANT[r.relation] || "neutral"}>{r.relation}</Badge> },
      { key: "to", header: "To", render: (r) => <span className="block max-w-[16rem] truncate font-medium text-foreground" title={r.to}>{r.to}</span> },
      { key: "score", header: "Evidence", align: "right", render: (r) => <span className="whitespace-nowrap text-sm tabular-nums text-text-secondary">{r.relation === "similar" ? similarityLabel(r.score) : "Explicit relation"}</span> },
    ]} data={rows} getRowKey={(r) => r.id} />
  </InsightsScreen>;
}
export default KnowledgeGraphScreen;
