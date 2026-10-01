"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Variable } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { TableSkeleton } from "@/components/internal/shared/table_skeleton";
import {
  DataTable,
  EmptyState,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { formatDate } from "./constants";
import { listEvents } from "@/lib/supabase/events";
import { listProfiles } from "@/lib/supabase/profiles";
import { useProject } from "@/context/project-context";

// Read-only derived attributes: event counts per profile computed from the
// raw events table (no stored rows — these are calculated on read).
export function CalculatedScreen() {
  const [profiles, setProfiles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { projectId } = useProject();

  useEffect(() => {
    let alive = true;
    Promise.all([listProfiles(projectId), listEvents(projectId)]).then(
      ([p, e]) => {
        if (!alive) return;
        setProfiles(p ?? []);
        setEvents(e ?? []);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [projectId]);

  const derived = useMemo(() => {
    return profiles.map((p) => {
      const ids = new Set([p.primaryIdentifier, ...(p.identifiers || [])]);
      const mine = events.filter(
        (e) => ids.has(e.anonymousId) || (e.userId && ids.has(e.userId)),
      );
      const views = mine.filter((e) => e.type === "page_view").length;
      const conversions = mine.filter((e) => e.type === "conversion").length;
      const last = mine.length
        ? mine.reduce((a, b) => (a.at > b.at ? a : b)).at
        : null;
      return { profile: p, total: mine.length, views, conversions, last };
    });
  }, [profiles, events]);

  const filtered = useMemo(() => {
    if (!search) return derived;
    const q = search.toLowerCase();
    return derived.filter((d) =>
      `${d.profile.primaryIdentifier}`.toLowerCase().includes(q),
    );
  }, [derived, search]);

  const stats = useMemo(() => {
    const totals = derived.reduce(
      (a, d) => ({ events: a.events + d.total, conv: a.conv + d.conversions }),
      { events: 0, conv: 0 },
    );
    const active = derived.filter((d) => d.total > 0).length;
    const avg = derived.length
      ? (totals.events / derived.length).toFixed(1)
      : "0";
    return [
      { label: "Total events", value: String(totals.events), footer: "Across profiles" },
      { label: "Active profiles", value: String(active), footer: `of ${derived.length}` },
      { label: "Avg. events / profile", value: avg, footer: "Engagement depth" },
      { label: "Conversions", value: String(totals.conv), footer: "Attributed outcomes" },
    ];
  }, [derived]);

  const columns = [
    {
      key: "profile",
      header: "Profile",
      render: (d) => (
        <span className="font-medium text-foreground">
          {d.profile.primaryIdentifier || "—"}
        </span>
      ),
    },
    {
      key: "views",
      header: "Page views",
      render: (d) => (
        <span className="text-sm text-text-secondary tabular-nums">
          {d.views}
        </span>
      ),
    },
    {
      key: "events",
      header: "Total events",
      render: (d) => (
        <span className="text-sm text-text-secondary tabular-nums">
          {d.total}
        </span>
      ),
    },
    {
      key: "conversions",
      header: "Conversions",
      render: (d) => (
        <span className="text-sm text-text-secondary tabular-nums">
          {d.conversions}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last active",
      align: "right",
      render: (d) => (
        <span className="text-sm text-text-secondary">
          {formatDate(d.last) || "—"}
        </span>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Calculated Attributes"
        description="Read-only engagement counters derived from raw events — views, totals and conversions per profile."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search profiles…"
        />
      </Toolbar>

      {loading ? (
        <TableSkeleton columns={columns} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(d) => d.profile.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              <EmptyState
                icon={Variable}
                title="Nothing to calculate yet"
                description="Calculated attributes appear once profiles and events exist."
              />
            </div>
          }
        />
      )}
    </MainScreenWrapper>
  );
}

export default CalculatedScreen;
