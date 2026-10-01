"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Map } from "lucide-react";

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
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { TOPIC_STAGES, listTopicStages, setStage } from "@/lib/supabase/topics";
import { useProject } from "@/context/project-context";

// Topic Journey Stages: the User -> Topic -> Stage -> Recommended Content
// model. Viewer over content.topic_stages with inline stage/score editing.
export function StagesScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listTopicStages(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const filtered = useMemo(
    () => rows.filter((r) => {
      if (profileFilter && r.profileId !== profileFilter) return false;
      if (search && !`${r.topicLabel} ${r.stage} ${r.profileId}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [rows, search, profileFilter],
  );

  const stats = useMemo(() => {
    const count = (stage) => rows.filter((r) => r.stage === stage).length;
    return [
      { label: "Tracked journeys", value: String(rows.length), footer: `${new Set(rows.map((r) => r.profileId)).size} profiles` },
      { label: "Engaged+", value: String(count("engaged") + count("advocate")), footer: "High-intent pairs" },
      { label: "Unaware", value: String(count("unaware")), footer: "Early journeys" },
    ];
  }, [rows]);

  const handleStageChange = async (row, stage) => {
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, stage } : r)));
    const saved = await setStage(projectId, row.profileId, row.topicLabel, { stage });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't update the stage.");
    } else {
      toast.success("Stage updated.");
    }
  };

  const columns = [
    {
      key: "topic", header: "Profile → Topic",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{r.topicLabel || "—"}</span>
          <span className="truncate text-xs text-text-secondary">{r.profileId || "anonymous"}</span>
        </div>
      ),
    },
    {
      key: "stage", header: "Stage",
      render: (r) => (
        <Select value={r.stage} onValueChange={(v) => handleStageChange(r, v)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TOPIC_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "score", header: "Score",
      render: (r) => <span className="text-sm text-text-secondary">{Number(r.score).toFixed(2)}</span>,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Topic Journey Stages"
        description="Where each profile sits on each topic — unaware, curious, engaged, advocate — feeding recommendations."
      />
      <StatsBar stats={stats} />
      <SectionCard title="About stages" description="Stages advance as profiles consume topic-tagged content. Taxonomy terms (Phase 3) will replace free-text topic labels; until then topic_label is the stable key.">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Filter by profile:</span>
          <Input value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} placeholder="profile id…" className="h-8 max-w-xs" />
          {profileFilter && <Button variant="ghost" size="sm" onClick={() => setProfileFilter("")}>Clear</Button>}
        </div>
      </SectionCard>
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} journeys</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search topics, stages…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={<EmptyState icon={Map} title={rows.length ? "No journeys match your filters" : "No topic journeys yet"} description={rows.length ? "Try clearing the search or filters." : "Stages appear as visitors consume topic-tagged content."} />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default StagesScreen;
