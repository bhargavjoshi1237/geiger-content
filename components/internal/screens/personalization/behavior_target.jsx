"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { listVariants } from "@/lib/supabase/variants";
import { listTopicStages } from "@/lib/supabase/topics";
import { useProject } from "@/context/project-context";
import {
  ClauseChips,
  EmptyPanel,
  HowItWorks,
  StageMix,
  VariantCell,
  VariantStatus,
  clausesOf,
} from "./personalization_kit";

const BEHAVIOR_FIELDS = new Set(["stage", "topic", "visits", "last_seen", "converted"]);

const STEPS = [
  { title: "Behavior is observed", body: "Topic stages, visit depth and conversions are recorded as visitors consume content." },
  { title: "Clauses match behavior", body: "Variants with stage, topic, visits, last_seen or converted clauses match on what visitors do." },
  { title: "Same tie-breaks", body: "Priority and weight decide among matches, exactly like segment and context targeting." },
];

// Behavior Targeting: variants keyed off observed behavior, plus the live topic-stage mix feeding `stage`.
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

  const mappings = useMemo(
    () => variants
      .map((v) => ({ variant: v, clauses: clausesOf(v.rules).filter((c) => BEHAVIOR_FIELDS.has(String(c.field).split(".")[0])) }))
      .filter((r) => r.clauses.length > 0),
    [variants],
  );

  const behavioral = useMemo(
    () => mappings.filter((r) => !search || r.clauses.some((c) => `${c.field} ${c.value}`.toLowerCase().includes(search.toLowerCase()))),
    [mappings, search],
  );

  const stats = useMemo(() => [
    { label: "Behavior-targeted", value: String(behavioral.length), footer: "Variants with behavior clauses" },
    { label: "Profiles staged", value: String(new Set(stages.map((s) => s.profileId)).size), footer: "Distinct profiles" },
    { label: "Topics tracked", value: String(new Set(stages.map((s) => s.topicLabel)).size), footer: "Distinct topics" },
  ], [behavioral, stages]);

  const columns = [
    {
      key: "behavior", header: "Behavior",
      render: (r) => <ClauseChips clauses={r.clauses} />,
    },
    {
      key: "variant", header: "Variant",
      render: (r) => <VariantCell variant={r.variant} />,
    },
    {
      key: "status", header: "Status",
      render: (r) => <VariantStatus status={r.variant.status} />,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Behavior Targeting"
        description="Variants served by what visitors do — topic stage, visit depth, past conversion — not who they are."
      />
      <StatsBar stats={stats} columns={3} />
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
          empty={
            <EmptyPanel
              icon={Activity}
              title={mappings.length ? "No behaviors match your search" : "No behavior targeting yet"}
              description={mappings.length ? "Try a different stage, topic or value." : "Add a clause with key stage, topic, visits or converted on any variant."}
              action={mappings.length ? <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button> : null}
            />
          }
        />
      )}
      <SectionCard
        title="Live stage mix"
        description="Topic-stage rows observed in this project. Stages are nascent — treat small counts as directional."
      >
        {!loading && stages.length === 0 ? (
          <p className="text-sm text-text-secondary">No staged profiles yet. Stages are written as visitors consume topic-tagged content.</p>
        ) : (
          <StageMix stages={stages} />
        )}
      </SectionCard>
      <HowItWorks steps={STEPS} />
    </MainScreenWrapper>
  );
}

export default BehaviorTargetScreen;
