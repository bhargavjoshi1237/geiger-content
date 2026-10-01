"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Badge } from "@geiger/ui/badge";
import { DataTable, SectionCard } from "@/components/internal/shared/screen_kit";
import { useInsights, similarityLabel } from "./insights_data";
import { InsightsScreen } from "./insights_screen";

const NODE_FILL = { entry: "var(--primary)", term: "var(--secondary)", taxonomy: "var(--muted)" };

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
    controls={<Select value={relation} onValueChange={setRelation}><SelectTrigger className="w-48" aria-label="Relation type"><SelectValue /></SelectTrigger><SelectContent>{["all", "reference", "tagged", "taxonomy", "similar"].map((v) => <SelectItem key={v} value={v}>{v === "all" ? "All relations" : v}</SelectItem>)}</SelectContent></Select>}
    stats={(d) => [{ label: "Entities", value: String(d.nodes.length), footer: "Visible content and taxonomy" }, { label: "Relations", value: String(d.rows.length), footer: "References, tags and similarity" }, { label: "Semantic links", value: String(d.rows.filter((r) => r.relation === "similar").length), footer: "At least 75% similar" }]}
    onPrevious={offset ? () => setOffset(Math.max(0, offset - 100)) : null} onNext={state.data?.nextOffset != null ? () => setOffset(state.data.nextOffset) : null}>
    <SectionCard title="Graph explorer" description="Select a node to filter its relations. The diagram shows up to 40 entities from the filtered results.">
      <svg viewBox="0 0 600 360" role="group" aria-label="Content knowledge graph" className="h-[360px] w-full rounded-xl border border-border bg-surface-card">
        {rows.filter((r) => positioned.has(r.fromId) && positioned.has(r.toId)).slice(0, 150).map((r) => <line key={r.id} x1={positioned.get(r.fromId).x} y1={positioned.get(r.fromId).y} x2={positioned.get(r.toId).x} y2={positioned.get(r.toId).y} stroke="var(--border)" strokeWidth={r.relation === "similar" ? 1 : 1.5} strokeDasharray={r.relation === "similar" ? "4 4" : undefined}><title>{r.from} · {r.relation} · {r.to}</title></line>)}
        {[...positioned.values()].map((n) => <g key={n.id} role="button" tabIndex={0} aria-label={`Filter relations for ${n.label}`} className="cursor-pointer outline-none focus:opacity-60" onClick={() => setSearch(n.label)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSearch(n.label); } }}>
          <title>{n.label} · {n.kind}</title><circle cx={n.x} cy={n.y} r={7} fill={NODE_FILL[n.kind]} stroke="var(--foreground)" strokeWidth={0.6} /><text x={n.x} y={n.y + 18} textAnchor="middle" fontSize={9} fill="var(--foreground)">{n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}</text>
        </g>)}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">{Object.keys(NODE_FILL).map((kind) => <Badge key={kind} variant="outline">{kind}</Badge>)}</div>
    </SectionCard>
    <SectionCard title="Relations" description="Explicit references and taxonomy assignments are distinguished from inferred similarity."><DataTable columns={[{ key: "from", header: "From" }, { key: "relation", header: "Relation", render: (r) => <Badge variant="neutral">{r.relation}</Badge> }, { key: "to", header: "To" }, { key: "score", header: "Evidence", render: (r) => r.relation === "similar" ? similarityLabel(r.score) : "Explicit relation" }]} data={rows} getRowKey={(r) => r.id} /></SectionCard>
  </InsightsScreen>;
}
export default KnowledgeGraphScreen;
