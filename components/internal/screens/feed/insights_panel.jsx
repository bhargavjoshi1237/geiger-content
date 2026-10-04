"use client";

import React, { useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Field } from "@geiger/ui/screen-kit";
import { formatPercent } from "@/components/internal/screens/recommendations/constants";

function Section({ title, description, children }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, footer }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {footer && <p className="truncate text-[11px] text-text-tertiary">{footer}</p>}
    </div>
  );
}

// Side panel beside the short (where Shorts shows comments): what the feed has learned about this
// reader, reader switching/reset, and text → image / image → image exploration.
export function InsightsPanel({ feed, names, onClose }) {
  const { status, summary, profileName, explore } = feed;
  const [draftName, setDraftName] = useState(profileName);
  const [query, setQuery] = useState("");
  const recent = Object.values(summary?.recentSlots || {}).reduce((a, b) => a + b, 0);
  const interests = summary?.taste.interests || [];
  const maxWeight = Math.max(1, ...interests.map((i) => i.weight));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <h2 className="text-base font-semibold text-foreground">Insights</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close insights"><X className="h-4 w-4" /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status && summary && (
          <Section title="This session">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Events learned" value={summary.events} footer={`${summary.shown} shown`} />
              <Stat label="Taste readiness" value={formatPercent(summary.taste.readiness)} footer={`${interests.length} interest vectors`} />
              <Stat label="Similar share" value={formatPercent(recent ? (summary.recentSlots.similar || 0) / recent : 0)} footer="Last 50 shown" />
              <Stat label="Embedded" value={status.embedded.toLocaleString()} footer={`of ${status.images.toLocaleString()} images`} />
            </div>
          </Section>
        )}
        <Section title="What it's learning" description="Taste vectors pull the similar items; the topic tree drives the rest.">
          {interests.length || summary?.subtopics.length ? (
            <div className="flex flex-col gap-3">
              {interests.map((i) => (
                <div key={i.topicId} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm"><span className="text-foreground">{names[i.topicId] || i.topicId}</span><span className="tabular-nums text-text-tertiary">{i.weight.toFixed(1)}</span></div>
                  <div className="h-1.5 rounded-full bg-surface-card"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(100 * i.weight) / maxWeight}%` }} /></div>
                </div>
              ))}
              {(summary?.subtopics || []).slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-secondary">{names[s.id] || s.id}</span>
                  <span className="shrink-0 tabular-nums text-text-tertiary">{s.lift.toFixed(2)}× · depth {s.knowledgeDepth}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Like, save, linger on or skip a few images and the profile appears here.</p>
          )}
        </Section>
        <Section title="Explore by similarity" description="Describe what you want, or tap Similar on a short.">
          <form onSubmit={(e) => { e.preventDefault(); feed.search(query); }} className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. custom water-cooled gaming PC" />
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
                    <button key={r.id} type="button" onClick={() => feed.showSimilar(r)} className="group relative aspect-[9/16] overflow-hidden rounded-md bg-surface-card" title={`${r.title} · ${Math.round(r.similarity * 100)}%`}>
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
            <Button type="button" variant="ghost" onClick={feed.reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
          </form>
        </Section>
      </div>
    </div>
  );
}

export default InsightsPanel;
