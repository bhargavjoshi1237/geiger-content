"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Component } from "lucide-react";

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

// Component Targeting: which components (slots) have personalized variants
// and how deep the coverage goes per component.
export function ComponentTargetScreen() {
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

  const coverage = useMemo(() => {
    const bySlot = new Map();
    for (const v of variants) {
      if (!bySlot.has(v.slotId)) bySlot.set(v.slotId, []);
      bySlot.get(v.slotId).push(v);
    }
    return slots
      .map((s) => ({ slot: s, variants: bySlot.get(s.id) || [] }))
      .filter(({ slot }) => !search || `${slot.name} ${slot.key}`.toLowerCase().includes(search.toLowerCase()));
  }, [slots, variants, search]);

  const stats = useMemo(() => {
    const covered = coverage.filter((c) => c.variants.length > 0).length;
    return [
      { label: "Components", value: String(slots.length), footer: "Slots in this project" },
      { label: "Personalized", value: String(covered), footer: "Slots with ≥ 1 variant" },
      { label: "Unpersonalized", value: String(slots.length - covered), footer: "Fallback only" },
    ];
  }, [coverage, slots]);

  const columns = [
    {
      key: "component", header: "Component",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.slot.name}</span>
          <span className="text-xs text-text-secondary">key: {r.slot.key} · {r.slot.status}</span>
        </div>
      ),
    },
    {
      key: "variants", header: "Variants",
      render: (r) => <span className="text-sm text-text-secondary">{r.variants.length}</span>,
    },
    {
      key: "top", header: "Top priority",
      render: (r) => (
        <span className="text-sm text-text-secondary">
          {r.variants.length ? Math.max(...r.variants.map((v) => Number(v.priority || 0))) : "—"}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Component Targeting"
        description="Personalization coverage per component — every slot is a decision surface, variants are its choices."
      />
      <StatsBar stats={stats} />
      <SectionCard title="How it works" description="Applications request a slot key; the decision engine picks among that slot's active variants. A slot with no variants always serves its fallback entry. Add variants under Content Variants.">
        <p className="text-sm text-text-secondary">Coverage is computed live from variants — no estimates, no sampled data.</p>
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{coverage.length} components</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search components…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={coverage}
          getRowKey={(r) => r.slot.id}
          empty={<EmptyState icon={Component} title="No components yet" description="Create slots under Content Slots first." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default ComponentTargetScreen;
