"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { listVariants } from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";

function clausesOf(rules) {
  if (Array.isArray(rules)) return rules;
  if (rules && typeof rules === "object" && Array.isArray(rules.all)) return rules.all;
  if (rules && typeof rules === "object") return Object.entries(rules).map(([field, value]) => ({ field, op: "equals", value }));
  return [];
}

// Segment Targeting: variants whose rules match on `segment`, grouped by the
// segment value they serve. Segments themselves are a Phase 5 concern — this
// screen reads the segment clauses variants already carry.
export function SegmentsTargetScreen() {
  const [variants, setVariants] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listVariants(projectId), listSlots(projectId)]).then(([v, s]) => {
      if (!alive) return;
      setVariants(v ?? []);
      setSlots(s ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const slotName = (id) => slots.find((s) => s.id === id)?.name || "—";

  const segmented = useMemo(
    () => variants
      .map((v) => ({ variant: v, segment: clausesOf(v.rules).find((c) => c.field === "segment")?.value || null }))
      .filter((r) => r.segment && (!search || String(r.segment).toLowerCase().includes(search.toLowerCase()))),
    [variants, search],
  );

  const stats = useMemo(() => {
    const segments = new Set(segmented.map((r) => String(r.segment)));
    return [
      { label: "Segmented variants", value: String(segmented.length), footer: "With a segment clause" },
      { label: "Segments served", value: String(segments.size), footer: "Distinct segment values" },
      { label: "Untargeted", value: String(variants.length - variants.filter((v) => clausesOf(v.rules).some((c) => c.field === "segment")).length), footer: "Catch-all variants" },
    ];
  }, [segmented, variants]);

  const columns = [
    {
      key: "segment", header: "Segment",
      render: (r) => <span className="font-medium text-foreground">{String(r.segment)}</span>,
    },
    {
      key: "variant", header: "Variant",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-foreground">{slotName(r.variant.slotId)}</span>
          <span className="text-xs text-text-secondary">priority {r.variant.priority} · weight {r.variant.weight} · {r.variant.status}</span>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Segment Targeting"
        description="Which segments each variant serves. Segment definitions live in Audiences (Phase 5); this screen reads the segment clauses on your variants."
      />
      <StatsBar stats={stats} />
      <SectionCard title="How it works" description="At decision time the visitor's segment is compared against each variant's segment clause (equals). Highest priority match wins; ties split by weight.">
        <p className="text-sm text-text-secondary">Edit clauses under Targeting Rules. Variants without a segment clause serve every segment.</p>
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{segmented.length} mappings</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search segments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={segmented}
          getRowKey={(r) => r.variant.id}
          empty={<EmptyState icon={UsersRound} title="No segment targeting yet" description="Add a clause with key segment on any variant under Targeting Rules." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default SegmentsTargetScreen;
