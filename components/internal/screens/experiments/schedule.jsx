"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { listExperiments, updateExperiment } from "@/lib/supabase/experiments";
import { useProject } from "@/context/project-context";
import { ExperimentCell } from "./parts";

function toInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

// Experiment Schedule: starts_at / ends_at per experiment. Assignment treats
// an experiment as live only inside its window when both bounds are set.
export function ScheduleScreen() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [now] = useState(() => Date.now());
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    listExperiments(projectId).then((result) => {
      if (!alive) return;
      setRows(result ?? []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const filtered = useMemo(
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const stats = useMemo(() => {
    const live = rows.filter((r) => {
      const s = r.startsAt ? new Date(r.startsAt).getTime() : -Infinity;
      const e = r.endsAt ? new Date(r.endsAt).getTime() : Infinity;
      return s <= now && now <= e;
    }).length;    return [
      { label: "Scheduled", value: String(rows.filter((r) => r.startsAt || r.endsAt).length), footer: "With a time window" },
      { label: "In window now", value: String(live), footer: "Estimate from stored bounds" },
      { label: "Unscheduled", value: String(rows.filter((r) => !r.startsAt && !r.endsAt).length), footer: "Manual status only" },
    ];
  }, [rows, now]);

  const save = async (row) => {
    const draft = drafts[row.id] || {};
    const startsAt = draft.startsAt !== undefined ? draft.startsAt || null : row.startsAt;
    const endsAt = draft.endsAt !== undefined ? draft.endsAt || null : row.endsAt;
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      toast.error("Start must be before end.");
      return;
    }
    const startIso = startsAt ? new Date(startsAt).toISOString() : null;
    const endIso = endsAt ? new Date(endsAt).toISOString() : null;
    const prev = rows;
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, startsAt: startIso, endsAt: endIso } : r)));
    const saved = await updateExperiment(row.id, { startsAt: startIso, endsAt: endIso });
    if (!saved) {
      setRows(prev);
      toast.error("Couldn't save the schedule.");
    } else {
      toast.success("Schedule updated.");
    }
  };

  const columns = [
    {
      key: "exp", header: "Experiment",
      render: (r) => (
        <ExperimentCell name={r.name} meta={r.status} />
      ),
    },
    {
      key: "window", header: "Window",
      render: (r) => (
        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            type="datetime-local" className="h-8 w-56"
            aria-label={`Start time for ${r.name}`}
            value={drafts[r.id]?.startsAt ?? toInput(r.startsAt)}
            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], startsAt: e.target.value } }))}
          />
          <span className="text-xs text-text-secondary">→</span>
          <Input
            type="datetime-local" className="h-8 w-56"
            aria-label={`End time for ${r.name}`}
            value={drafts[r.id]?.endsAt ?? toInput(r.endsAt)}
            onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: { ...d[r.id], endsAt: e.target.value } }))}
          />
          <Button size="sm" variant="outline" onClick={() => save(r)}>Save</Button>
        </div>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader title="Experiment Schedule" description="Time windows for each experiment — assignment honors the window when set." />
      <StatsBar stats={stats} />
      <Toolbar>
        <span className="text-sm text-text-secondary">{filtered.length} experiments</span>
        <SearchInput value={search} onChange={setSearch} placeholder="Search experiments…" />
      </Toolbar>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(r) => r.id}
          empty={<EmptyState icon={CalendarClock} title="No experiments yet" description="Create one under All Experiments first." />}
        />
      )}
    </MainScreenWrapper>
  );
}

export default ScheduleScreen;
