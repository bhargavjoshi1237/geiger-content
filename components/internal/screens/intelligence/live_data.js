// Live-data bridge for Intelligence. Reads the real Phase 5 tables
// (content.events, content.metrics_daily, entries, profiles, segments) and
// shapes them into the exact datasets the four rewired screens render.
// When the tables are empty or unconfigured every builder returns null and
// the screens fall back to the static sample shapes (with a "Sample data"
// badge) — demo_data.js stays for the other screens, but the rewired four no
// longer import it; the fallback copies live here.

"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/context/project-context";
import { getDaily } from "@/lib/supabase/metrics";
import { listEvents } from "@/lib/supabase/events";
import { listContent } from "@/lib/supabase/content";
import { listProfiles, getTraitsMap } from "@/lib/supabase/profiles";
import { listSegments, evaluateSegment } from "@/lib/supabase/segments";
import {
  CONTENT_PERFORMANCE,
  AUDIENCE_PERFORMANCE,
  FUNNELS_JOURNEYS,
  TOPIC_INTEREST,
} from "./demo_data";

export const FALLBACK_CONTENT = {
  ...CONTENT_PERFORMANCE,
  underperforming: [
    { t: "Changelog — March", m: "44% engagement · high bounce" },
    { t: "Legacy import doc", m: "31% engagement · stale 45d" },
    { t: "Campaign templates", m: "-6% views week over week" },
  ],
};
export const FALLBACK_AUDIENCE = AUDIENCE_PERFORMANCE;
export const FALLBACK_FUNNELS = FUNNELS_JOURNEYS;
export const FALLBACK_TOPICS = TOPIC_INTEREST;

// Base fetch for every rewired screen. live is true once EITHER table has
// rows; individual builders still return null when their own inputs are thin
// (e.g. audience needs profiles), which also falls back to sample.
export function useLiveAnalytics() {
  const { projectId } = useProject();
  const [state, setState] = useState({
    loading: true,
    metrics: [],
    events: [],
    entries: [],
    profiles: [],
    segments: [],
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDaily(projectId),
      listEvents(projectId),
      listContent(projectId),
      listProfiles(projectId),
      listSegments(projectId),
    ]).then(([metrics, events, entries, profiles, segments]) => {
      if (!alive) return;
      setState({
        loading: false,
        metrics: metrics ?? [],
        events: events ?? [],
        entries: entries ?? [],
        profiles: profiles ?? [],
        segments: segments ?? [],
      });
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const live =
    !state.loading &&
    (state.metrics.length > 0 || state.events.length > 0);
  return { ...state, projectId, live };
}

// { profileIds signature: {traitKey: value} } for segment evaluation. Null
// until the first load lands; a signature mismatch also reads as null so a
// project switch never previews against stale maps.
export function useTraitMaps(profiles) {
  const [cached, setCached] = useState({ ids: null, maps: null });
  useEffect(() => {
    if (!profiles || profiles.length === 0) return;
    let alive = true;
    Promise.all(profiles.map((p) => getTraitsMap(p.id))).then((all) => {
      if (!alive) return;
      const next = {};
      profiles.forEach((p, i) => {
        next[p.id] = all[i] || {};
      });
      setCached({ ids: signature(profiles), maps: next });
    });
    return () => {
      alive = false;
    };
  }, [profiles]);
  if (!profiles || profiles.length === 0) return null;
  return cached.ids === signature(profiles) ? cached.maps : null;
}

function signature(profiles) {
  return (profiles || []).map((p) => p.id).join(",");
}

// --- shared helpers ---

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function dayLabel(isoDay) {
  const [y, m, d] = String(isoDay).split("-").map(Number);
  if (!y || !m || !d) return String(isoDay);
  return `${MONTHS[m - 1]} ${d}`;
}

function actorOf(e) {
  return e.userId || e.anonymousId || null;
}

function momentum(last, prev) {
  if (!prev) return last > 0 ? 100 : 0;
  return ((last - prev) / prev) * 100;
}

function momentumLabel(m) {
  const sign = m >= 0 ? "+" : "";
  return `${sign}${Math.round(m)}%`;
}

function weekStart(isoDay) {
  const d = new Date(`${isoDay}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday-first
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const days = ms / 86400000;
  if (days >= 1) return `${days.toFixed(1)}d`;
  const hours = ms / 3600000;
  if (hours >= 1) return `${Math.round(hours)}h`;
  return `${Math.max(1, Math.round(ms / 60000))}m`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function last7Window(metrics) {
  const today = new Date().toISOString().slice(0, 10);
  const ago = (n) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const inRange = (r, from, to) => r.date >= from && r.date <= to;
  return {
    last: metrics.filter((r) => inRange(r, ago(6), today)),
    prev: metrics.filter((r) => inRange(r, ago(13), ago(7))),
  };
}

// --- Content Performance ---

export function buildContentPerformance({ metrics = [], events = [], entries = [] }) {
  if (metrics.length === 0 && events.length === 0) return null;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const totalViews = metrics.reduce((a, r) => a + r.views, 0);
  const totalConv = metrics.reduce((a, r) => a + r.conversions, 0);

  const perEntry = new Map();
  for (const r of metrics) {
    if (!r.entryId) continue;
    const acc = perEntry.get(r.entryId) || { views: 0, conversions: 0, days: [] };
    acc.views += r.views;
    acc.conversions += r.conversions;
    acc.days.push(r);
    perEntry.set(r.entryId, acc);
  }

  const byDay = new Map();
  for (const r of metrics) {
    const acc = byDay.get(r.date) || { views: 0, conversions: 0 };
    acc.views += r.views;
    acc.conversions += r.conversions;
    byDay.set(r.date, acc);
  }
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, v]) => ({
      date: dayLabel(date),
      views: v.views,
      engaged: v.views,
      conversions: v.conversions,
    }));

  const byTypeMap = new Map();
  for (const [id, v] of perEntry) {
    const t = byId.get(id)?.type || "Unattributed";
    const acc = byTypeMap.get(t) || { views: 0 };
    acc.views += v.views;
    byTypeMap.set(t, acc);
  }
  const byType = [...byTypeMap.entries()].map(([type, v]) => ({
    type,
    views: v.views,
  }));

  const channelMap = new Map();
  for (const e of events) {
    const c = e.context?.channel || e.context?.utm_source || "Direct";
    channelMap.set(c, (channelMap.get(c) || 0) + 1);
  }
  const channels = [...channelMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const entryMomentum = (id) => {
    const days = (perEntry.get(id)?.days || []).filter((r) => r.date);
    const { last, prev } = last7Window(days);
    return momentum(
      last.reduce((a, r) => a + r.views, 0),
      prev.reduce((a, r) => a + r.views, 0),
    );
  };
  const ranked = [...perEntry.entries()].sort((a, b) => b[1].views - a[1].views);
  const top = ranked.slice(0, 6).map(([id, v]) => ({
    title: byId.get(id)?.title || id.slice(0, 8),
    type: byId.get(id)?.type || "—",
    views: fmt(v.views),
    rate: "—",
    conv: fmt(v.conversions),
    trend: entryMomentum(id) >= 0 ? "up" : "down",
  }));
  const underperforming = ranked.slice(-3).reverse().map(([id, v]) => ({
    t: byId.get(id)?.title || id.slice(0, 8),
    m: `${fmt(v.views)} views · needs attention`,
  }));

  return {
    stats: [
      { label: "Total views", value: fmt(totalViews), footer: "From daily rollups" },
      { label: "Conversions", value: fmt(totalConv), footer: "Attributed outcomes" },
      { label: "Tracked entries", value: String(perEntry.size), footer: `of ${entries.length} entries` },
      { label: "Active days", value: String(byDay.size), footer: "Days with traffic" },
    ],
    trend: trend.length ? trend : [{ date: "—", views: 0, engaged: 0, conversions: 0 }],
    byType: byType.length ? byType : [{ type: "Unattributed", views: 0 }],
    channels: channels.length ? channels : [{ name: "Direct", value: 0 }],
    top,
    underperforming,
  };
}

// --- Audience Performance ---

export function buildAudiencePerformance({ profiles = [], events = [], segments = [], traitMaps = null }) {
  if (profiles.length === 0 || !traitMaps) return null;
  const idsOf = (p) => new Set([p.primaryIdentifier, ...(p.identifiers || [])]);

  const byActor = new Map();
  for (const e of events) {
    const a = actorOf(e);
    if (!a) continue;
    if (!byActor.has(a)) byActor.set(a, []);
    byActor.get(a).push(e);
  }
  const profileEvents = (p) => {
    const ids = idsOf(p);
    const out = [];
    for (const id of ids) {
      const list = byActor.get(id);
      if (list) out.push(...list);
    }
    return out;
  };

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const info = profiles.map((p) => {
    const evts = profileEvents(p);
    const days = new Set(evts.map((e) => String(e.at || "").slice(0, 10)));
    return {
      profile: p,
      events: evts,
      eventCounts: evts.reduce((a, e) => {
        a[e.type] = (a[e.type] || 0) + 1;
        return a;
      }, {}),
      converted: evts.some((e) => e.type === "conversion"),
      returning: days.size > 1,
      recent: evts.some((e) => e.at && new Date(e.at).getTime() >= monthAgo),
      fresh: p.createdAt && new Date(p.createdAt).getTime() >= weekAgo,
    };
  });

  const active = info.filter((i) => i.events.length > 0);
  const converted = info.filter((i) => i.converted);
  const returning = info.filter((i) => i.returning);

  // Weekly active actors, split known vs anonymous, last 6 weeks.
  const weekKeys = [];
  for (let w = 5; w >= 0; w--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - w * 7);
    weekKeys.push(weekStart(d.toISOString().slice(0, 10)));
  }
  const knownIds = new Set();
  for (const i of info) {
    if (i.profile.identifiers.length > 1) {
      for (const id of idsOf(i.profile)) knownIds.add(id);
    }
  }
  const trend = weekKeys.map((wk) => {
    const next = weekStart(
      new Date(new Date(`${wk}T00:00:00Z`).getTime() + 7 * 86400000)
        .toISOString()
        .slice(0, 10),
    );
    const inWeek = events.filter((e) => {
      const day = String(e.at || "").slice(0, 10);
      return day >= wk && day < next;
    });
    const actors = new Set(inWeek.map(actorOf).filter(Boolean));
    let known = 0;
    for (const a of actors) if (knownIds.has(a)) known += 1;
    return { date: dayLabel(wk), known, anonymous: actors.size - known };
  });

  // Mutually exclusive maturity stages.
  const stages = [
    { name: "Converted", value: converted.length },
    { name: "Engaged", value: info.filter((i) => !i.converted && i.events.length >= 5).length },
    { name: "Active", value: info.filter((i) => !i.converted && i.events.length > 0 && i.events.length < 5 && i.recent).length },
    { name: "Dormant", value: info.filter((i) => !i.converted && (i.events.length === 0 || !i.recent)).length },
  ];

  const evaluated = segments.map((s) => {
    const members = info.filter((i) =>
      evaluateSegment(s.rule, {
        traits: traitMaps[i.profile.id] || {},
        eventCounts: i.eventCounts,
      }),
    );
    const engaged = members.filter((m) => m.events.length > 0).length;
    const conv = members.filter((m) => m.converted).length;
    const fresh = members.filter((m) => m.fresh).length;
    return {
      segment: s.name,
      reach: members.length,
      engagement: members.length ? Math.round((engaged / members.length) * 100) : 0,
      conversion: members.length ? ((conv / members.length) * 100).toFixed(1) : "0.0",
      profiles: fmt(members.length),
      convLabel: `${members.length ? ((conv / members.length) * 100).toFixed(1) : "0.0"}%`,
      growth: `+${fresh}`,
    };
  }).sort((a, b) => b.reach - a.reach);
  const rows = evaluated.slice(0, 5).map((e) => ({
    segment: e.segment,
    profiles: e.profiles,
    engagement: `${e.engagement}%`,
    conv: e.convLabel,
    growth: e.growth,
  }));

  return {
    stats: [
      { label: "Active profiles", value: fmt(active.length), footer: `of ${profiles.length} total` },
      {
        label: "Avg. conversion",
        value: active.length ? `${((converted.length / active.length) * 100).toFixed(1)}%` : "0%",
        footer: "Converted actives",
      },
      {
        label: "Returning rate",
        value: active.length ? `${Math.round((returning.length / active.length) * 100)}%` : "0%",
        footer: "Active on 2+ days",
      },
      { label: "Segments", value: String(segments.length), footer: "Reusable groups" },
    ],
    trend,
    trendSeries: [
      { key: "known", label: "Known" },
      { key: "anonymous", label: "Anonymous" },
    ],
    segments: evaluated.slice(0, 5),
    stages,
    rows,
  };
}

// --- Funnels & Journeys ---

export function buildFunnels({ events = [], metrics = [], entries = [] }) {
  if (events.length === 0) return null;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const actors = new Map();
  for (const e of events) {
    const a = actorOf(e);
    if (!a) continue;
    if (!actors.has(a)) actors.set(a, []);
    actors.get(a).push(e);
  }
  for (const list of actors.values()) {
    list.sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  const hasType = (list, t) => list.some((e) => e.type === t);
  const stepVisited = [...actors.values()].filter(
    (l) => hasType(l, "page_view") || l.length > 0,
  ).length;
  const stepEngaged = [...actors.values()].filter((l) => l.length >= 3).length;
  const stepReturned = [...actors.values()].filter(
    (l) => new Set(l.map((e) => String(e.at || "").slice(0, 10))).size > 1,
  ).length;
  const convertedActors = [...actors.values()].filter((l) => hasType(l, "conversion"));
  const stepConverted = convertedActors.length;

  const steps = [
    { name: "Visited content", value: stepVisited },
    { name: "Engaged 3+ events", value: stepEngaged },
    { name: "Returned 2+ days", value: stepReturned },
    { name: "Converted", value: stepConverted },
  ];
  const funnel = steps.map((s, i) => ({
    ...s,
    fill: `var(--chart-${(i % 5) + 1})`,
  }));

  let hotspot = "—";
  let worst = 0;
  for (let i = 1; i < steps.length; i++) {
    if (!steps[i - 1].value) continue;
    const loss = 1 - steps[i].value / steps[i - 1].value;
    if (loss > worst) {
      worst = loss;
      hotspot = `Step ${i + 1}`;
    }
  }

  const toConvert = convertedActors.map((l) => {
    const first = new Date(l[0].at).getTime();
    const conv = new Date(l.find((e) => e.type === "conversion").at).getTime();
    return conv - first;
  });
  const medMs = median(toConvert.filter((v) => v >= 0));

  const byWeek = new Map();
  for (const r of metrics) {
    const wk = weekStart(r.date);
    const acc = byWeek.get(wk) || { entered: 0, converted: 0 };
    acc.entered += r.views;
    acc.converted += r.conversions;
    byWeek.set(wk, acc);
  }
  const weekly = [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([wk, v]) => ({ week: dayLabel(wk), entered: v.entered, converted: v.converted }));

  const transitions = new Map();
  for (const [actor, list] of actors) {
    for (let i = 1; i < list.length; i++) {
      const from = list[i - 1].entryId;
      const to = list[i].entryId;
      if (!from || !to || from === to) continue;
      const key = `${from}→${to}`;
      if (!transitions.has(key)) transitions.set(key, { from, to, actors: new Set(), gaps: [] });
      const t = transitions.get(key);
      t.actors.add(actor);
      const gap = new Date(list[i].at) - new Date(list[i - 1].at);
      if (gap >= 0) t.gaps.push(gap);
    }
  }
  const convertedSet = new Set(convertedActors.flatMap((l) => l.map(actorOf)));
  const paths = [...transitions.values()]
    .sort((a, b) => b.actors.size - a.actors.size)
    .slice(0, 5)
    .map((t) => {
      const users = [...t.actors];
      const conv = users.filter((a) => convertedSet.has(a)).length;
      return {
        path: `${byId.get(t.from)?.title || t.from.slice(0, 8)} → ${byId.get(t.to)?.title || t.to.slice(0, 8)}`,
        users: fmt(users.length),
        conv: users.length ? `${Math.round((conv / users.length) * 100)}%` : "0%",
        time: formatDuration(median(t.gaps)),
      };
    });

  const endToEnd = stepVisited
    ? `${((stepConverted / stepVisited) * 100).toFixed(1)}%`
    : "0%";
  return {
    stats: [
      { label: "Journey entries", value: fmt(stepVisited), footer: "Actors with events" },
      { label: "End-to-end conv.", value: endToEnd, footer: "Visit to outcome" },
      { label: "Median time to convert", value: formatDuration(medMs), footer: "First touch to outcome" },
      { label: "Drop-off hotspot", value: hotspot, footer: worst ? `${Math.round(worst * 100)}% loss` : "No funnel yet" },
    ],
    funnel,
    weekly,
    paths,
  };
}

// --- Topic Interest (aggregated at entry-type level; taxonomies land in Phase 3) ---

export function buildTopics({ metrics = [], events = [], entries = [] }) {
  if (metrics.length === 0 && events.length === 0) return null;
  const byId = new Map(entries.map((e) => [e.id, e]));
  const typeOf = (entryId) => (entryId && byId.get(entryId)?.type) || "Unattributed";

  const agg = new Map();
  const ensure = (t) => {
    if (!agg.has(t)) {
      agg.set(t, { views: 0, conversions: 0, content: 0, actors: new Set(), engaged: new Set(), days: [] });
    }
    return agg.get(t);
  };
  for (const e of entries) ensure(e.type || "Unattributed").content += 1;
  for (const r of metrics) {
    const a = ensure(typeOf(r.entryId));
    a.views += r.views;
    a.conversions += r.conversions;
    a.days.push(r);
  }
  for (const e of events) {
    const a = ensure(typeOf(e.entryId));
    const actor = actorOf(e);
    if (!actor) continue;
    a.actors.add(actor);
    const count = (a._counts = a._counts || new Map());
    count.set(actor, (count.get(actor) || 0) + 1);
    if (count.get(actor) >= 3) a.engaged.add(actor);
  }

  const withMomentum = [...agg.entries()].map(([topic, a]) => {
    const { last, prev } = last7Window(a.days);
    const m = momentum(
      last.reduce((x, r) => x + r.views, 0),
      prev.reduce((x, r) => x + r.views, 0),
    );
    return { topic, ...a, momentum: m };
  }).sort((a, b) => b.views - a.views);

  const stageFor = (m, conversions) => {
    if (conversions > 0 && m >= 0) return "Evaluating";
    if (m >= 15) return "Expanding";
    if (m >= 0) return "Learning";
    if (m >= -10) return "Dormant";
    return "Negative";
  };

  const top3 = withMomentum.slice(0, 3);
  const daySet = new Set();
  for (const t of top3) for (const r of t.days) daySet.add(r.date);
  const days = [...daySet].sort().slice(-14);
  const keys = top3.map((_, i) => `s${i}`);
  const trend = days.map((date) => {
    const row = { date: dayLabel(date) };
    top3.forEach((t, i) => {
      row[keys[i]] = t.days
        .filter((r) => r.date === date)
        .reduce((a, r) => a + r.views, 0);
    });
    return row;
  });

  return {
    stats: [
      { label: "Tracked groups", value: String(agg.size), footer: "By entry type" },
      { label: "High-intent groups", value: String(withMomentum.filter((t) => t.conversions > 0).length), footer: "Drove outcomes" },
      { label: "Emerging groups", value: String(withMomentum.filter((t) => t.momentum >= 15).length), footer: "Fast momentum" },
      { label: "Declining groups", value: String(withMomentum.filter((t) => t.momentum < -10).length), footer: "Needs refresh" },
    ],
    trend,
    trendSeries: top3.map((t, i) => ({ key: keys[i], label: t.topic })),
    stages: withMomentum.slice(0, 5).map((t) => ({
      topic: t.topic,
      discovered: t.views,
      learning: t.actors.size,
      evaluating: t.engaged.size,
      converted: t.conversions,
    })),
    rows: withMomentum.slice(0, 6).map((t) => ({
      topic: t.topic,
      interest: t.views,
      momentum: momentumLabel(t.momentum),
      stage: stageFor(t.momentum, t.conversions),
      content: t.content,
    })),
  };
}
