"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  Field,
  ScreenHeader,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { listContent } from "@/lib/supabase/content";
import { similarContent } from "@/lib/supabase/recommend";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Diversity Controls: cap results per type so one format never swallows the list (live demo over similarity ranking).
export function DiversityScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referenceId, setReferenceId] = useState("");
  const [maxPerType, setMaxPerType] = useState(2);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listContent(projectId).then((result) => {
      if (!alive) return;
      setEntries(result ?? []);
      if (result && result.length > 0) setReferenceId(result[0].id);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const base = useMemo(
    () => (referenceId ? similarContent(entries, referenceId, { limit: 20 }) : []),
    [entries, referenceId],
  );

  const diversified = useMemo(() => {
    const cap = Math.max(1, Number(maxPerType) || 2);
    const seen = {};
    const out = [];
    for (const r of base) {
      const t = r.entry.type || "Article";
      seen[t] = (seen[t] || 0) + 1;
      if (seen[t] <= cap) out.push(r);
      if (out.length >= 8) break;
    }
    return out;
  }, [base, maxPerType]);

  const stats = useMemo(() => [
    { label: "Before", value: String(base.length), footer: "Similarity candidates" },
    { label: "After", value: String(diversified.length), footer: `Max ${maxPerType} per type` },
    { label: "Types kept", value: String(new Set(diversified.map((r) => r.entry.type)).size), footer: "Distinct formats" },
  ], [base, diversified, maxPerType]);

  const columns = [
    {
      key: "entry", header: "Entry",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.status}</span>
        </div>
      ),
    },
    {
      key: "type", header: "Type",
      render: (r) => <Badge variant="outline">{r.entry.type || "Article"}</Badge>,
    },
    {
      key: "score", header: "Score", align: "right",
      render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{r.score.toFixed(2)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Diversity Controls" description="Keep recommendations varied — cap how many results may share one format." />
      <StatsBar stats={stats} columns={3} />
      <SectionCard title="Controls" description="Diversification runs live over the similarity ranking. No stored config yet — caps apply to this demo.">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
          {entries.length > 0 && (
            <Field label="Reference entry" className="w-full sm:w-64">
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger className="w-full" aria-label="Reference entry"><SelectValue/></SelectTrigger>
                <SelectContent>
                  {entries.map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Max per type" hint="Hard cap per content type." className="w-full sm:w-48" stepper value={maxPerType} onValueChange={setMaxPerType} min={1} max={8}>
            <Input type="number" min="1" max="8" value={maxPerType} onChange={(e) => setMaxPerType(e.target.value)} aria-label="Max per type" />
          </Field>
        </div>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={diversified}
          getRowKey={(r) => r.entry.id}
          empty={<EmptyState icon={SlidersHorizontal} title="Nothing to show" description="Add more entries of different types." className={EMPTY_PANEL_CLASS} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default DiversityScreen;
