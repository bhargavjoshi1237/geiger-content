"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Component } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  ScreenHeader,
  SearchInput,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { listVariants } from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";
import { ACTIVE_STATUS_MAP, EmptyPanel, HowItWorks } from "./personalization_kit";

const STEPS = [
  { title: "Apps request a slot key", body: "Every slot is a decision surface; its variants are the choices." },
  { title: "The engine picks a variant", body: "Among the slot's active variants, targeting, priority and weight decide the winner." },
  { title: "No variants, no choice", body: "A slot without variants always serves its fallback entry. Add variants under Content Variants." },
];

// Component Targeting: which components (slots) have personalized variants and how deep coverage goes.
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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
          <span className="truncate font-medium text-foreground">{r.slot.name}</span>
          <span className="truncate font-mono text-xs text-text-secondary">{r.slot.key}</span>
        </div>
      ),
    },
    {
      key: "coverage", header: "Coverage",
      render: (r) => (r.variants.length
        ? <Badge variant="success">Personalized</Badge>
        : <Badge variant="neutral">Fallback only</Badge>),
    },
    {
      key: "status", header: "Status",
      render: (r) => <StatusPill status={r.slot.status} map={ACTIVE_STATUS_MAP} />,
    },
    {
      key: "variants", header: "Variants", align: "right", className: "tabular-nums text-text-secondary",
      render: (r) => r.variants.length,
    },
    {
      key: "top", header: "Top priority", align: "right", className: "tabular-nums text-text-secondary",
      render: (r) => (r.variants.length ? Math.max(...r.variants.map((v) => Number(v.priority || 0))) : "—"),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Component Targeting"
        description="Personalization coverage per component — every slot is a decision surface, variants are its choices."
      />
      <StatsBar stats={stats} columns={3} />
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
          empty={
            <EmptyPanel
              icon={Component}
              title={slots.length ? "No components match your search" : "No components yet"}
              description={slots.length ? "Try a different name or key." : "Create slots under Content Slots first."}
              action={slots.length ? <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button> : null}
            />
          }
        />
      )}
      <HowItWorks steps={STEPS} description="Coverage is computed live from variants — no estimates, no sampled data." />
    </MainScreenWrapper>
  );
}

export default ComponentTargetScreen;
