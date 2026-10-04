"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";

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
import { Badge } from "@geiger/ui/badge";
import { Input } from "@geiger/ui/input";
import { listContent } from "@/lib/supabase/content";
import { listTopicStages } from "@/lib/supabase/topics";
import { useProject } from "@/context/project-context";
import { EMPTY_PANEL_CLASS } from "./constants";

// Collaborative Ranking: "profiles like this one also engaged with…".
// True collaborative filtering needs dense cross-profile behavior (nascent),
// so this screen finds profiles sharing topics with the given profile and
// surfaces their high-stage topics' matching entries — labeled an estimate.
export function CollabRankScreen() {
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

  const { peers, ranked } = useMemo(() => {
    if (!profileId) return { peers: [], ranked: [] };
    const mine = new Set(stages.filter((s) => s.profileId === profileId).map((s) => s.topicLabel));
    if (mine.size === 0) return { peers: [], ranked: [] };
    const peerIds = [...new Set(stages.filter((s) => s.profileId !== profileId && mine.has(s.topicLabel)).map((s) => s.profileId))];
    const peerTopics = stages.filter((s) => peerIds.includes(s.profileId) && (s.stage === "engaged" || s.stage === "advocate") && !mine.has(s.topicLabel));
    const seen = new Set();
    const ranked = [];
    for (const t of peerTopics) {
      if (seen.has(t.topicLabel)) continue;
      seen.add(t.topicLabel);
      const match = entries.find((e) => `${e.title} ${e.excerpt} ${e.body}`.toLowerCase().includes(t.topicLabel.toLowerCase()));
      if (match) ranked.push({ entry: match, topic: t.topicLabel, peers: peerIds.length });
      if (ranked.length >= 8) break;
    }
    return { peers: peerIds, ranked };
  }, [stages, entries, profileId]);

  const stats = useMemo(() => [
    { label: "Peer profiles", value: String(peers.length), footer: "Sharing ≥ 1 topic (estimate)" },
    { label: "Suggestions", value: String(ranked.length), footer: "From peer topics" },
    { label: "Method", value: "Estimate", footer: "Sparse-data proxy" },
  ], [peers, ranked]);

  const columns = [
    {
      key: "entry", header: "Suggested",
      render: (r) => (
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-lg">
          <span className="line-clamp-2 font-medium text-foreground">{r.entry.title || r.entry.slug}</span>
          <span className="text-xs text-text-secondary">{r.entry.type} · {r.entry.status}</span>
        </div>
      ),
    },
    {
      key: "topic", header: "Via topic",
      render: (r) => <Badge variant="outline" className="max-w-[12rem]"><span className="truncate">{r.topic}</span></Badge>,
    },
    {
      key: "peers", header: "Peers", align: "right",
      render: (r) => <span className="text-sm tabular-nums text-text-secondary">{r.peers}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Collaborative Ranking" description="What similar profiles engage with — an estimate until behavior data densifies." />
      <StatsBar stats={stats} columns={3} />
      <SectionCard title="Profile" description="Peer overlap is computed from stored topic stages only. With sparse data, treat suggestions as directional.">
        <Field label="Profile id" htmlFor="collab-profile" className="w-full sm:max-w-sm">
          <Input id="collab-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Enter a profile id…" />
        </Field>
      </SectionCard>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : !profileId ? (
        <EmptyState icon={UsersRound} title="Pick a profile" description="Enter a profile id above to find its peers." className={EMPTY_PANEL_CLASS} />
      ) : (
        <DataTable
          columns={columns}
          data={ranked}
          getRowKey={(r) => r.entry.id}
          empty={<EmptyState icon={UsersRound} title="No peer suggestions" description="No overlapping profiles with high-stage topics were found." className={EMPTY_PANEL_CLASS} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default CollabRankScreen;
