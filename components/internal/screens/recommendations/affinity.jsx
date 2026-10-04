"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UserCheck } from "lucide-react";

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
import { Input } from "@geiger/ui/input";
import { affinityRanking } from "@/lib/supabase/recommend";
import { listTopicStages } from "@/lib/supabase/topics";
import { listContent } from "@/lib/supabase/content";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

const STAGE_WEIGHT = { unaware: 0, curious: 1, engaged: 3, advocate: 5 };

// User Affinity: re-rank entries for one profile from its topic-stage
// scores. Enter a profile id — its per-topic scores become the affinity
// signal. Directional until behavior volume grows.
export function AffinityScreen() {
  const [entries, setEntries] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listContent(projectId), listTopicStages(projectId)]).then(([e, s]) => {
      if (!alive) return;
      setEntries(e ?? []);
      setStages(s ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const profileStages = useMemo(
    () => (profileId ? stages.filter((s) => s.profileId === profileId) : []),
    [stages, profileId],
  );

  const ranked = useMemo(() => {
    if (!profileId || profileStages.length === 0) return [];
    const counts = {};
    for (const e of entries) {
      let score = 0;
      const hay = `${e.title} ${e.excerpt} ${e.body}`.toLowerCase();
      for (const st of profileStages) {
        if (st.topicLabel && hay.includes(st.topicLabel.toLowerCase())) {
          score += (STAGE_WEIGHT[st.stage] ?? 0) + Number(st.score || 0);
        }
      }
      counts[e.id] = score;
    }
    return affinityRanking(entries, counts, { limit: 8 });
  }, [entries, profileStages, profileId]);

  const stats = useMemo(() => [
    { label: "Profile topics", value: String(profileStages.length), footer: profileId ? `${profileId.slice(0, 8)}…` : "Enter a profile id" },
    { label: "Candidates", value: String(entries.length), footer: "Ranked for this profile" },
    { label: "Signal", value: "Stages", footer: "Directional estimate" },
  ], [profileStages, entries, profileId]);

  const columns = [
    {
      key: "entry", header: "Recommended",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.type} · {r.entry.status}</span>
        </div>
      ),
    },
    {
      key: "score", header: "Affinity", align: "right",
      render: (r) => <span className="text-sm font-semibold tabular-nums text-foreground">{Number(r.score).toFixed(1)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="User Affinity" description="What one profile should see next, from its topic-stage footprint." />
      <StatsBar stats={stats} columns={3} />
      <SectionCard title="Profile" description="Affinity is computed live from stored topic stages — no sampled or fake behavior.">
        <Field label="Profile id" htmlFor="affinity-profile" className="w-full sm:max-w-sm">
          <Input id="affinity-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Enter a profile id…" />
        </Field>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : !profileId ? (
        <EmptyState icon={UserCheck} title="Pick a profile" description="Enter a profile id above to rank content for it." className={EMPTY_PANEL_CLASS} />
      ) : (
        <DataTable
          columns={columns}
          data={ranked}
          getRowKey={(r) => r.entry.id}
          empty={<EmptyState icon={UserCheck} title="No affinity signal" description="This profile has no topic stages yet, or no entries match its topics." className={EMPTY_PANEL_CLASS} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default AffinityScreen;
