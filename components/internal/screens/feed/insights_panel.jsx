"use client";

import React, { useMemo, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Field } from "@geiger/ui/screen-kit";
import { SegmentedTabs } from "@geiger/ui/segmented-tabs";
import { cn } from "@geiger/ui/lib/utils";
import { FEED_RECENCY_MAP, FEED_RECENCY_TABS, formatPercent } from "@/components/internal/screens/recommendations/constants";
import { AlgorithmDials, ConfirmDialog, Lockable, PanelSection as Section, runAction } from "./algorithm_dials";
import { AlgorithmHealth } from "./algorithm_health";
import { AlgorithmProfile } from "./algorithm_profile";
import { AlgorithmSteering } from "./algorithm_steering";
import { AlgorithmTopics } from "./algorithm_topics";
import { NON_PROFILED_COPY, PRIVATE_SESSION_COPY, RESET_SCOPE_META } from "./constants";

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "tune", label: "Tune" },
  { value: "profile", label: "Profile" },
  { value: "health", label: "Health" },
];

function Stat({ label, value, footer }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {footer && <p className="truncate text-[11px] text-text-tertiary">{footer}</p>}
    </div>
  );
}

function SectionLoader() {
  return <div className="flex justify-center py-16"><LogoLoading size={36} aria-label="Loading your algorithm" /></div>;
}

// "Your algorithm" panel beside the short (aside on md+, sheet below): session overview and exploration, the tuning
// controls, the learned profile and funnel health. Reads and writes only through the feed hook.
export function InsightsPanel({ feed, names = {}, onClose, variant = "aside" }) {
  const { status, summary, profileName, explore } = feed;
  const [tab, setTab] = useState("overview");
  const [draftName, setDraftName] = useState(profileName);
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const recent = Object.values(summary?.recentSlots || {}).reduce((a, b) => a + b, 0);
  const interests = summary?.taste?.interests || [];
  const recency = summary?.settings?.recency || "balanced";
  const options = feed.options?.topics;

  // Display names: catalog options, then names seen on items, then the summary's own map.
  const lookup = useMemo(() => {
    const out = {};
    for (const t of options || []) {
      out[t.id] = t.name;
      for (const s of t.subjects || []) out[s.path] = s.name;
    }
    return { ...out, ...names, ...(summary?.names || {}) };
  }, [options, names, summary?.names]);
  const nameOf = (id) => lookup[id] || id;

  const reset = async () => {
    setResetting(true);
    await runAction(feed.reset);
    setResetting(false);
    setConfirmReset(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">Your algorithm</h2>
          {summary?.nonProfiled && <Badge variant="info">{NON_PROFILED_COPY.badge}</Badge>}
          {summary?.privateSession && <Badge variant="purple">{PRIVATE_SESSION_COPY.badge}</Badge>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close insights"><X className="h-4 w-4" /></Button>
      </div>
      <div className={cn("shrink-0 border-b border-border py-2", variant === "sheet" ? "px-4" : "px-5")}>
        <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} fullWidth />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" && (
          <>
            {status && summary ? (
              <Section title="This session">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Events learned" value={summary.events} footer={`${summary.shown} shown`} />
                  <Stat label="Taste readiness" value={formatPercent(summary.taste?.readiness)} footer={`${interests.length} interest vectors`} />
                  <Stat label="Similar share" value={formatPercent(recent ? (summary.recentSlots.similar || 0) / recent : 0)} footer="Last 50 shown" />
                  <Stat label="Embedded" value={status.embedded.toLocaleString()} footer={`of ${status.images.toLocaleString()} images`} />
                </div>
              </Section>
            ) : (
              <SectionLoader />
            )}
            <Section title="Explore by similarity" description="Describe what you want, or tap Similar on a short.">
              <form onSubmit={(e) => { e.preventDefault(); feed.search(query); }} className="flex gap-2">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. anime cover art or Formula 1 cars" />
                <Button type="submit" variant="ghost" size="icon" aria-label="Search images"><Search className="h-4 w-4" /></Button>
              </form>
              {explore && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-text-tertiary">{explore.title}</p>
                  {explore.loading ? (
                    <div className="flex justify-center py-6"><LogoLoading size={36} aria-label="Searching" /></div>
                  ) : explore.results.length ? (
                    <div className="grid grid-cols-3 gap-2">
                      {explore.results.map((r) => (
                        <button key={r.id} type="button" onClick={() => feed.showSimilar(r, { fromResult: true })} className="group relative aspect-[9/16] overflow-hidden rounded-md bg-surface-card" title={`${r.title} · ${Math.round(r.similarity * 100)}%`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.imageUrl} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-opacity group-hover:opacity-80" />
                          <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-background/80 px-1 text-[10px] tabular-nums text-foreground">{Math.round(r.similarity * 100)}%</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">{explore.note || "No matches."}</p>
                  )}
                </div>
              )}
            </Section>
            <Section title="Reader" description="Each reader has its own interests, taste vectors and history.">
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); feed.switchReader(draftName); }}>
                <Field label="Name" hint="Switch to test another persona.">
                  <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={40} className="w-40" />
                </Field>
                <Button type="submit" variant="ghost">Open</Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)} disabled={Boolean(feed.pending?.reset)}><RotateCcw className="h-4 w-4" /> Reset</Button>
              </form>
            </Section>
          </>
        )}
        {tab !== "overview" && !summary && <SectionLoader />}
        {tab === "tune" && summary && (
          <>
            <Section title="Recency" description="How strongly this reader's feed favours the newest posts.">
              <Lockable disabled={Boolean(feed.pending?.settings)}>
                <SegmentedTabs tabs={FEED_RECENCY_TABS} value={recency} onChange={(v) => v !== recency && feed.setRecency(v)} fullWidth />
                <p className="text-xs text-text-tertiary">{FEED_RECENCY_MAP[recency]?.description}</p>
              </Lockable>
            </Section>
            <AlgorithmSteering feed={feed} />
            <AlgorithmDials feed={feed} />
            <AlgorithmTopics feed={feed} nameOf={nameOf} />
          </>
        )}
        {tab === "profile" && summary && <AlgorithmProfile feed={feed} nameOf={nameOf} />}
        {tab === "health" && summary && <AlgorithmHealth feed={feed} nameOf={nameOf} />}
      </div>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`Reset reader “${profileName}”?`}
        description={`${RESET_SCOPE_META.all.description} This can't be undone.`}
        confirmLabel={RESET_SCOPE_META.all.label}
        busy={resetting}
        onConfirm={reset}
      />
    </div>
  );
}

export default InsightsPanel;
