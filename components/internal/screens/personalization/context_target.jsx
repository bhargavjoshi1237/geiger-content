"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Route } from "lucide-react";

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

const CONTEXT_FIELDS = new Set(["locale", "device", "country", "timezone"]);

function clausesOf(rules) {
  if (Array.isArray(rules)) return rules;
  if (rules && typeof rules === "object" && Array.isArray(rules.all)) return rules.all;
  if (rules && typeof rules === "object") return Object.entries(rules).map(([field, value]) => ({ field, op: "equals", value }));
  return [];
}

// Context Targeting: variants whose rules match on request context
// (locale / device / country / timezone) rather than who the visitor is.
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

  const contextual = useMemo(
    () => variants
      .map((v) => ({ variant: v, clauses: clausesOf(v.rules).filter((c) => CONTEXT_FIELDS.has(c.field)) }))
      .filter((r) => r.clauses.length > 0 && (!search || r.clauses.some((c) => `${c.field} ${c.value}`.toLowerCase().includes(search.toLowerCase())))),
    [variants, search],
  );

  const stats = useMemo(() => [
    { label: "Context-targeted", value: String(contextual.length), footer: "Variants with context clauses" },
    { label: "Locales", value: String(new Set(contextual.flatMap((r) => r.clauses.filter((c) => c.field === "locale").map((c) => String(c.value)))).size), footer: "Distinct locales" },
    { label: "Devices", value: String(new Set(contextual.flatMap((r) => r.clauses.filter((c) => c.field === "device").map((c) => String(c.value)))).size), footer: "Distinct devices" },
  ], [contextual]);

  const columns = [
    {
      key: "context", header: "Context",
      render: (r) => (
        <span className="font-medium text-foreground">
          {r.clauses.map((c) => `${c.field} = "${c.value}"`).join(" · ")}
        </span>
      ),
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
        title="Context Targeting"
        description="Variants served by request context — locale, device, country, timezone — independent of identity."
      />
      <StatsBar stats={stats} />
      <SectionCard title="How it works" description="The edge caller passes context (e.g. locale from Accept-Language, device from the user agent) alongside the profile. Clauses on these keys match before segment clauses are even considered — same priority/weight rules apply.">
        <p className="text-sm text-text-secondary">Add locale / device / country clauses under Targeting Rules. Estimates only until real traffic flows — no fake match counts are shown.</p>
      </SectionCard>
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
          empty={<EmptyState icon={Route} title="No context targeting yet" description="Add a clause with key locale, device, country or timezone on any variant." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default ContextTargetScreen;
