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
} from "@/components/internal/shared/screen_kit";
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

// Diversity Controls: cap how many results may share one type so a single
// format never swallows the list. Live demo over similar-content ranking.
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
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.type} · score {r.score.toFixed(2)}</span>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Diversity Controls" description="Keep recommendations varied — cap how many results may share one format." />
      <StatsBar stats={stats} />
      <SectionCard title="Controls" description="Diversification runs live over the similarity ranking. No stored config yet — caps apply to this demo.">
        <div className="flex flex-wrap items-end gap-4">
          {entries.length > 0 && (
            <Field label="Reference entry">
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entries.map((e) => <SelectItem key={e.id} value={e.id}>{e.title || e.slug}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Max per type" hint="Hard cap per content type.">
            <Input type="number" min="1" max="8" value={maxPerType} onChange={(e) => setMaxPerType(e.target.value)} className="w-28" />
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
          empty={<EmptyState icon={SlidersHorizontal} title="Nothing to show" description="Add more entries of different types." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default DiversityScreen;
