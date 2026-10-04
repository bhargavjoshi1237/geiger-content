"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Map, X } from "lucide-react";

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
import { EmptyPanel, StageMix } from "./personalization_kit";

// Topic Journey Stages: User -> Topic -> Stage -> Recommended Content, with inline stage editing.
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
        <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
          <span className="truncate font-medium text-foreground">{r.topicLabel || "—"}</span>
          <span className="block max-w-[16rem] truncate font-mono text-xs text-text-secondary">{r.profileId || "anonymous"}</span>
        </div>
      ),
    },
    {
      key: "stage", header: "Stage",
      render: (r) => (
        <Select value={r.stage} onValueChange={(v) => handleStageChange(r, v)}>
          <SelectTrigger className="h-8 w-32 capitalize" aria-label="Stage"><SelectValue/></SelectTrigger>
          <SelectContent>
            {TOPIC_STAGES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "score", header: "Score", align: "right", className: "tabular-nums text-text-secondary",
      render: (r) => Number(r.score).toFixed(2),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Topic Journey Stages"
        description="Where each profile sits on each topic — unaware, curious, engaged, advocate — feeding recommendations."
      />
      <StatsBar stats={stats} columns={3} />
      <Toolbar>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Input
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              placeholder="Filter by profile id…"
              aria-label="Filter by profile id"
              className="h-9 pr-9 font-mono text-xs"
            />
            {profileFilter ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Clear profile filter"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary"
                onClick={() => setProfileFilter("")}
              >
                <X />
              </Button>
            ) : null}
          </div>
          <span className="text-sm text-text-secondary">{filtered.length} journeys</span>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search topics, stages…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={
            <EmptyPanel
              icon={Map}
              title={rows.length ? "No journeys match your filters" : "No topic journeys yet"}
              description={rows.length ? "Try clearing the search or filters." : "Stages appear as visitors consume topic-tagged content."}
              action={rows.length ? <Button variant="ghost" onClick={() => { setSearch(""); setProfileFilter(""); }}>Clear filters</Button> : null}
            />
          }
        />
      )}
      {rows.length ? (
        <SectionCard
          title="Stage mix"
          description="Stages advance as profiles consume topic-tagged content. Free-text topic labels stay the stable key until taxonomy terms replace them."
        >
          <StageMix stages={rows} />
        </SectionCard>
      ) : null}
    </MainScreenWrapper>
  );
}

export default StagesScreen;
