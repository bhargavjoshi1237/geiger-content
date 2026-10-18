"use client";

import React, { useState } from "react";
import { Badge } from "@geiger/ui/badge";
import { Slider } from "@geiger/ui/slider";
import { formatPercent } from "@/components/internal/screens/recommendations/constants";
import { PanelSection, useSettingsDraft } from "./algorithm_dials";
import { DRIFT_COPY, DRIFT_META, EMOTION_DIAL_RANGE, KNOWLEDGE_COPY, LEVEL_LABELS, REACTION_META } from "./constants";

const DIAL_LABELS = { "-1": "Fewer", "-0.5": "Slightly fewer", 0: "Neutral", 0.5: "Slightly more", 1: "More" };
const levelPct = (level) => ((Math.min(KNOWLEDGE_COPY.levelMax, Math.max(KNOWLEDGE_COPY.levelMin, Number(level) || 1)) - KNOWLEDGE_COPY.levelMin) / (KNOWLEDGE_COPY.levelMax - KNOWLEDGE_COPY.levelMin)) * 100;

function Bar({ pct }) {
  return (
    <div className="h-1.5 rounded-full bg-surface-strong dark:bg-surface-card">
      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

// Diverging bar for affinity in -1..1: right of centre is positive, left is negative.
function AffinityBar({ value }) {
  const v = Math.max(-1, Math.min(1, Number(value) || 0));
  return (
    <div className="relative h-1.5 rounded-full bg-surface-strong dark:bg-surface-card">
      <div className="pointer-events-none absolute inset-y-[-2px] left-1/2 w-px bg-border-strong" />
      <div
        className={`absolute inset-y-0 rounded-full ${v >= 0 ? "bg-emerald-600 dark:bg-emerald-400" : "bg-red-600 dark:bg-red-400"}`}
        style={v >= 0 ? { left: "50%", width: `${v * 50}%` } : { right: "50%", width: `${-v * 50}%` }}
      />
    </div>
  );
}

function Row({ label, value, title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-foreground" title={title}>{label}</span>
        <span className="shrink-0 tabular-nums text-text-tertiary">{value}</span>
      </div>
      {children}
    </div>
  );
}

const Empty = ({ children }) => <p className="text-sm text-text-secondary">{children}</p>;

// "Your profile": interest (topic tree), liking (taste vectors), emotional reactions (with dials), knowledge levels and drift, kept apart.
export function AlgorithmProfile({ feed, nameOf }) {
  const summary = feed.summary || {};
  const { settings, save, busy } = useSettingsDraft(feed);
  const [dragging, setDragging] = useState({});
  const topics = summary.topics || [];
  const subtopics = (summary.subtopics || []).slice(0, 6);
  const maxLift = Math.max(1, ...topics.map((t) => t.lift || 0));
  const liking = summary.taste?.interests || [];
  const maxWeight = Math.max(1, ...liking.map((i) => i.weight || 0));
  const emotions = summary.emotion?.profile || [];
  const emotionById = Object.fromEntries(emotions.map((e) => [e.bucket, e]));
  const dials = { ...(summary.emotion?.dials || {}), ...(settings.emotionDials || {}) };
  const knowledge = summary.knowledge?.subjects || [];
  const drift = summary.drift || [];

  const commitDial = (bucket, value) => {
    setDragging((d) => ({ ...d, [bucket]: undefined }));
    if (value === (Number(dials[bucket]) || 0)) return;
    save({ emotionDials: { [bucket]: value } }, () => feed.setEmotionDial?.(bucket, value));
  };

  return (
    <>
      <PanelSection title="Interest" description="What you engage with: likes, saves, time spent and skips, per topic. Drives the topic mix.">
        {topics.length ? (
          <div className="flex flex-col gap-3">
            {topics.map((t) => (
              <Row key={t.id} label={nameOf(t.id)} title={t.id} value={`${Number(t.lift || 0).toFixed(2)}×`}>
                <Bar pct={(100 * (t.lift || 0)) / maxLift} />
              </Row>
            ))}
            {subtopics.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                {subtopics.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-text-secondary" title={s.id}>{nameOf(s.id)}</span>
                    <span className="shrink-0 tabular-nums text-text-tertiary">{Number(s.lift || 0).toFixed(2)}× · level {s.depth || 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Empty>Like, save, linger on or skip a few posts and your interests appear here.</Empty>
        )}
      </PanelSection>

      <PanelSection title="Liking" description={`What the posts you like look like. Pulls visually similar posts · readiness ${formatPercent(summary.taste?.readiness)}.`}>
        {liking.length ? (
          <div className="flex flex-col gap-3">
            {liking.map((i) => (
              <Row key={i.topicId} label={nameOf(i.topicId)} title={i.topicId} value={Number(i.weight || 0).toFixed(1)}>
                <Bar pct={(100 * (i.weight || 0)) / maxWeight} />
              </Row>
            ))}
          </div>
        ) : (
          <Empty>Like or save a few posts to build your taste vectors.</Empty>
        )}
      </PanelSection>

      <PanelSection title="Emotional reactions" description="How posts make you feel, kept apart from interest. Outrage never boosts a topic. Dials tilt the mix.">
        <div className="flex flex-col gap-4">
          {REACTION_META.map((r) => {
            const e = emotionById[r.id] || {};
            const dial = dragging[r.id] ?? (Number(dials[r.id]) || 0);
            return (
              <div key={r.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-foreground"><r.icon className={`h-3.5 w-3.5 ${r.tone}`} />{r.label}</span>
                  <span className="shrink-0 tabular-nums text-xs text-text-tertiary">
                    {e.evidence > 0 ? `${e.affinity > 0 ? "+" : ""}${Number(e.affinity || 0).toFixed(2)} · ${Number(e.evidence).toFixed(1)} signals` : "No reactions yet"}
                  </span>
                </div>
                <AffinityBar value={e.evidence > 0 ? e.affinity : 0} />
                <div className="flex items-center gap-3">
                  <Slider
                    min={EMOTION_DIAL_RANGE.min}
                    max={EMOTION_DIAL_RANGE.max}
                    step={EMOTION_DIAL_RANGE.step}
                    value={[dial]}
                    disabled={busy}
                    aria-label={`${r.label} dial`}
                    onValueChange={([v]) => setDragging((d) => ({ ...d, [r.id]: v }))}
                    onValueCommit={([v]) => commitDial(r.id, v)}
                  />
                  <span className="w-24 shrink-0 text-right text-xs text-text-secondary">{DIAL_LABELS[dial] ?? dial}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Knowledge" description="How well you know each subject (levels 1–5). Shapes how advanced posts get.">
        {knowledge.length ? (
          <div className="flex flex-col gap-4">
            {knowledge.map((k) => {
              const meta = LEVEL_LABELS[k.label];
              const lo = Number(k.band?.lo) || 1;
              const hi = Number(k.band?.hi) || lo;
              return (
                <div key={k.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground" title={k.id}>{nameOf(k.id)}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-xs text-text-tertiary">L{Number(k.level || 1).toFixed(1)} · {k.n} signals</span>
                      <Badge variant={meta?.variant || "outline"} title={meta?.description}>{meta?.label || KNOWLEDGE_COPY.unlabelled}</Badge>
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-surface-strong dark:bg-surface-card">
                    <div className="absolute inset-y-0 rounded-full bg-primary/25" style={{ left: `${levelPct(lo)}%`, width: `${Math.max(2, levelPct(hi) - levelPct(lo))}%` }} />
                    <div className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${levelPct(k.level)}%` }} />
                  </div>
                  <p className="text-xs text-text-tertiary">{KNOWLEDGE_COPY.bandHint.replace("{lo}", lo.toFixed(1)).replace("{hi}", hi.toFixed(1))}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>{KNOWLEDGE_COPY.empty}</Empty>
        )}
      </PanelSection>

      <PanelSection title="Drift" description="How your interests are moving across sessions.">
        {drift.length ? (
          <div className="flex flex-col divide-y divide-border">
            {drift.map((d) => {
              const meta = DRIFT_META[d.label];
              return (
                <div key={`${d.scope}:${d.id}`} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground" title={d.id}>{nameOf(d.id)}</p>
                    <p className="text-xs text-text-tertiary">{meta?.description} {d.ratio ? `· ${Number(d.ratio).toFixed(2)}× usual` : ""}</p>
                  </div>
                  <Badge variant={meta?.variant || "neutral"} className="shrink-0">{meta?.label || d.label}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>{DRIFT_COPY.empty}</Empty>
        )}
      </PanelSection>
    </>
  );
}

export default AlgorithmProfile;
