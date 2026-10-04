"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { listVariants } from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";
import {
  EmptyPanel,
  HowItWorks,
  VariantCell,
  VariantStatus,
  clausesOf,
} from "./personalization_kit";

const STEPS = [
  { title: "Visitor arrives with a segment", body: "The caller passes the visitor's segment in the profile bag at decision time." },
  { title: "Clauses compare with equals", body: "Each variant's segment clause is matched against it; variants without one serve every segment." },
  { title: "Priority, then weight", body: "The highest-priority match wins; ties split by weight. Edit clauses under Targeting Rules." },
];

// Segment Targeting: variants whose rules match on `segment` (definitions live in Audiences, Phase 5).
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

  const mappings = useMemo(
    () => variants
      .map((v) => ({ variant: v, segment: clausesOf(v.rules).find((c) => c.field === "segment")?.value || null }))
      .filter((r) => r.segment),
    [variants],
  );

  const segmented = useMemo(
    () => mappings.filter((r) => !search || String(r.segment).toLowerCase().includes(search.toLowerCase())),
    [mappings, search],
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
      render: (r) => <Badge variant="info" className="max-w-[16rem] font-mono"><span className="truncate">{String(r.segment)}</span></Badge>,
    },
    {
      key: "variant", header: "Variant",
      render: (r) => <VariantCell variant={r.variant} slotName={slotName(r.variant.slotId)} />,
    },
    {
      key: "status", header: "Status",
      render: (r) => <VariantStatus status={r.variant.status} />,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Segment Targeting"
        description="Which segments each variant serves, read from the segment clauses on your variants."
      />
      <StatsBar stats={stats} columns={3} />
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
          empty={
            <EmptyPanel
              icon={UsersRound}
              title={mappings.length ? "No segments match your search" : "No segment targeting yet"}
              description={mappings.length ? "Try a different segment value." : "Add a clause with key segment on any variant under Targeting Rules."}
              action={mappings.length ? <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button> : null}
            />
          }
        />
      )}
      <HowItWorks steps={STEPS} description="Segment definitions live in Audiences; this screen reads the clauses your variants already carry." />
    </MainScreenWrapper>
  );
}

export default SegmentsTargetScreen;
