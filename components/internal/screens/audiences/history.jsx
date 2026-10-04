"use client";

import React, { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@geiger/ui/select";
import { EVENT_TYPE_MAP, formatDateTime } from "./constants";
import { listEvents } from "@/lib/supabase/events";
import { listProfiles } from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

function contextSummary(context) {
  if (!context || typeof context !== "object") return "—";
  const keys = Object.keys(context);
  if (!keys.length) return "—";
  return keys
    .slice(0, 3)
    .map((k) => {
      const v = context[k];
      const s =
        typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      return `${k}: ${s.length > 28 ? `${s.slice(0, 28)}…` : s}`;
    })
    .join(" · ");
}

// One profile's event timeline, newest first.
export function HistoryScreen() {
  const [profiles, setProfiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listProfiles(projectId), listEvents(projectId)]).then(
      ([p, e]) => {
        if (!alive) return;
        const list = p ?? [];
        setProfiles(list);
        setEvents(e ?? []);
        if (list.length) setProfileId(list[0].id);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [projectId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId],
  );

  const timeline = useMemo(() => {
    if (!selected) return [];
    const ids = new Set([
      selected.primaryIdentifier,
      ...(selected.identifiers || []),
    ]);
    return events.filter(
      (e) => ids.has(e.anonymousId) || (e.userId && ids.has(e.userId)),
    );
  }, [events, selected]);

  const stats = useMemo(() => {
    const conversions = timeline.filter(
      (e) => e.type === "conversion",
    ).length;
    const entries = new Set(
      timeline.map((e) => e.entryId).filter(Boolean),
    ).size;
    const span =
      timeline.length > 1
        ? Math.max(
            1,
            Math.round(
              (new Date(timeline[0].at) - new Date(timeline[timeline.length - 1].at)) /
                86400000,
            ),
          )
        : timeline.length;
    return [
      { label: "Events", value: String(timeline.length), footer: selected?.primaryIdentifier || "—" },
      { label: "Entries touched", value: String(entries), footer: "Distinct content" },
      { label: "Conversions", value: String(conversions), footer: "Attributed outcomes" },
      { label: "Span (days)", value: String(span), footer: "First to last event" },
    ];
  }, [timeline, selected]);

  const columns = [
    {
      key: "at",
      header: "Time",
      render: (r) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDateTime(r.at) || "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Event",
      render: (r) => (
        <StatusPill
          status={r.type}
          map={{
            ...EVENT_TYPE_MAP,
            [r.type]: EVENT_TYPE_MAP[r.type] || {
              label: r.type,
              variant: "neutral",
            },
          }}
        />
      ),
    },
    {
      key: "entry",
      header: "Entry",
      render: (r) => (
        <span className="font-mono text-xs text-text-secondary">
          {r.entryId ? r.entryId.slice(0, 8) : "—"}
        </span>
      ),
    },
    {
      key: "detail",
      header: "Detail",
      align: "right",
      render: (r) => (
        <span
          className="ml-auto block max-w-[16rem] truncate text-sm text-text-secondary sm:max-w-sm"
          title={contextSummary(r.context)}
        >
          {contextSummary(r.context)}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Profile History"
        description="Every tracked event for one profile — the timeline identity resolution and segments reason over."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <Select value={profileId} onValueChange={setProfileId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Select a profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.primaryIdentifier || p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={timeline}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={History}
                title={
                  profiles.length ? "No events for this profile" : "No profiles yet"
                }
                description={
                  profiles.length
                    ? "Events land here once the beacon attributes them to this identity."
                    : "Profiles appear once the collect beacon receives events."
                }
              />
            </div>
          }
        />
      )}
    </MainScreenWrapper>
  );
}

export default HistoryScreen;
