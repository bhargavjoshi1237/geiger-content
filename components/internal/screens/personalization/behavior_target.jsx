"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";

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
import { listTopicStages } from "@/lib/supabase/topics";
import { useProject } from "@/context/project-context";

const BEHAVIOR_FIELDS = new Set(["stage", "topic", "visits", "last_seen", "converted"]);

function clausesOf(rules) {
  if (Array.isArray(rules)) return rules;
  if (rules && typeof rules === "object" && Array.isArray(rules.all)) return rules.all;
  if (rules && typeof rules === "object") return Object.entries(rules).map(([field, value]) => ({ field, op: "equals", value }));
  return [];
}

// Behavior Targeting: variants keyed off observed behavior (topic stage,
// visit depth, past conversion) plus the live topic-stage distribution that
// feeds the `stage` clause.
export function BehaviorTargetScreen() {
  const [variants, setVariants] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listVariants(projectId), listTopicStages(projectId)]).then(([v, s]) => {
      if (!alive) return;
      setVariants(v ?? []);
      setStages(s ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const behavioral = useMemo(
    () => variants
      .map((v) => ({ variant: v, clauses: clausesOf(v.rules).filter((c) => BEHAVIOR_FIELDS.has(String(c.field).split(".")[0])) }))
      .filter((r) => r.clauses.length > 0 && (!search || r.clauses.some((c) => `${c.field} ${c.value}`.toLowerCase().includes(search.toLowerCase())))),
    [variants, search],
  );

  const stageMix = useMemo(() => {
    const counts = {};
    for (const s of stages) counts[s.stage] = (counts[s.stage] || 0) + 1;
    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
  }, [stages]);

  const stats = useMemo(() => [
    { label: "Behavior-targeted", value: String(behavioral.length), footer: "Variants with behavior clauses" },
    { label: "Profiles staged", value: String(new Set(stages.map((s) => s.profileId)).size), footer: "Distinct profiles" },
    { label: "Topics tracked", value: String(new Set(stages.map((s) => s.topicLabel)).size), footer: "Distinct topics" },
  ], [behavioral, stages]);

  const columns = [
    {
      key: "behavior", header: "Behavior",
      render: (r) => (
        <span className="font-medium text-foreground">
          {r.clauses.map((c) => `${c.field} ${c.op || "equals"} "${c.value}"`).join(" · ")}
        </span>
      ),
    },
    {
      key: "variant", header: "Variant",
      render: (r) => <span className="text-sm text-text-secondary">priority {r.variant.priority} · weight {r.variant.weight} · {r.variant.status}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Behavior Targeting"
        description="Variants served by what visitors do — topic stage, visit depth, past conversion — not who they are."
      />
      <StatsBar stats={stats} />
      <SectionCard title="Live stage mix" description="Topic-stage rows observed in this project. Behavior stages are nascent — treat small counts as directional, not precise.">
        {stageMix.length === 0 ? (
          <p className="text-sm text-text-secondary">No staged profiles yet. Stages are written as visitors consume topic-tagged content.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stageMix.map((m) => (
              <span key={m.stage} className="rounded-full border border-border bg-surface-card px-3 py-1 text-xs text-foreground">
                {m.stage}: {m.count}
              </span>
            ))}
          </div>
        )}
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{behavioral.length} mappings</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search behaviors…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={behavioral}
          getRowKey={(r) => r.variant.id}
          empty={<EmptyState icon={Activity} title="No behavior targeting yet" description="Add a clause with key stage, topic, visits or converted on any variant." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default BehaviorTargetScreen;
