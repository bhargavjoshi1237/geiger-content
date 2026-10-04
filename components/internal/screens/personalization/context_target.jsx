"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Route } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { listVariants } from "@/lib/supabase/variants";
import { listSlots } from "@/lib/supabase/slots";
import { useProject } from "@/context/project-context";
import {
  ClauseChips,
  EmptyPanel,
  HowItWorks,
  VariantCell,
  VariantStatus,
  clausesOf,
} from "./personalization_kit";

const CONTEXT_FIELDS = new Set(["locale", "device", "country", "timezone"]);

const STEPS = [
  { title: "Caller passes context", body: "The edge request carries context alongside the profile — locale from Accept-Language, device from the user agent." },
  { title: "Context clauses match first", body: "Clauses on locale, device, country or timezone are checked before segment clauses." },
  { title: "Same tie-breaks", body: "Priority and weight rules apply as usual. Estimates only until real traffic flows — no fake match counts." },
];

// Context Targeting: variants whose rules match on request context rather than who the visitor is.
export function ContextTargetScreen() {
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
      .map((v) => ({ variant: v, clauses: clausesOf(v.rules).filter((c) => CONTEXT_FIELDS.has(c.field)) }))
      .filter((r) => r.clauses.length > 0),
    [variants],
  );

  const contextual = useMemo(
    () => mappings.filter((r) => !search || r.clauses.some((c) => `${c.field} ${c.value}`.toLowerCase().includes(search.toLowerCase()))),
    [mappings, search],
  );

  const stats = useMemo(() => [
    { label: "Context-targeted", value: String(contextual.length), footer: "Variants with context clauses" },
    { label: "Locales", value: String(new Set(contextual.flatMap((r) => r.clauses.filter((c) => c.field === "locale").map((c) => String(c.value)))).size), footer: "Distinct locales" },
    { label: "Devices", value: String(new Set(contextual.flatMap((r) => r.clauses.filter((c) => c.field === "device").map((c) => String(c.value)))).size), footer: "Distinct devices" },
  ], [contextual]);

  const columns = [
    {
      key: "context", header: "Context",
      render: (r) => <ClauseChips clauses={r.clauses} />,
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
        title="Context Targeting"
        description="Variants served by request context — locale, device, country, timezone — independent of identity."
      />
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{contextual.length} mappings</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search context values…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={contextual}
          getRowKey={(r) => r.variant.id}
          empty={
            <EmptyPanel
              icon={Route}
              title={mappings.length ? "No context values match your search" : "No context targeting yet"}
              description={mappings.length ? "Try a different locale, device or country." : "Add a clause with key locale, device, country or timezone on any variant."}
              action={mappings.length ? <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button> : null}
            />
          }
        />
      )}
      <HowItWorks steps={STEPS} description="Add locale / device / country clauses under Targeting Rules." />
    </MainScreenWrapper>
  );
}

export default ContextTargetScreen;
