"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Switch } from "@geiger/ui/switch";
import { formatPercent } from "@/components/internal/screens/recommendations/constants";
import { ConfirmDialog, PanelSection, runAction } from "./algorithm_dials";
import { FUNNEL_META, PRIVATE_SESSION_COPY, RESET_SCOPE_META } from "./constants";

const TILE_KEYS = ["circlingIndex", "entropy", "maxRun", "topicChurn", "explorationYield", "sensitiveShare", "intenseShare"];

function formatMetric(value, format) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  if (format === "percent") return formatPercent(value);
  if (format === "bits") return `${Number(value).toFixed(2)} bits`;
  if (format === "count") return String(Math.round(Number(value)));
  return Number(value).toFixed(1);
}

function Tile({ label, value, help }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2.5" title={help}>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      <p className="line-clamp-2 text-[11px] text-text-tertiary">{help}</p>
    </div>
  );
}

// Resets offered here ("all" goes through feed.reset); topic resets live in the topic menus.
const RESET_SCOPES = ["emotion", "knowledge", "all"];

// Funnel health, governor usage, stated-preference calibration, and the reset / private-session controls.
export function AlgorithmHealth({ feed, nameOf }) {
  const summary = feed.summary || {};
  const funnel = summary.funnel || {};
  const governor = summary.governor || {};
  const stated = summary.stated || {};
  const depth = funnel.depthPerSubject || [];
  const used = Object.entries(governor.levelsUsed || {}).filter(([, n]) => n > 0);
  const blocked = governor.blockedThemes || [];
  const busy = Boolean(feed.pending?.reset);
  const [privateDraft, setPrivateDraft] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [resetting, setResetting] = useState(false);
  const privateOn = privateDraft ?? Boolean(summary.privateSession);

  const togglePrivate = async (on) => {
    setPrivateDraft(on);
    await runAction(feed.excludeFromTaste, { scope: "session", on });
    setPrivateDraft(null);
  };

  const runReset = async () => {
    setResetting(true);
    await (confirm === "all" ? runAction(feed.reset) : runAction(feed.scopedReset, { scope: confirm }));
    setResetting(false);
    setConfirm(null);
  };

  return (
    <>
      <PanelSection title="Funnel health" description="Whether the feed is narrowing around you. Last 50 posts.">
        <div className="grid grid-cols-2 gap-2">
          {TILE_KEYS.map((key) => (
            <Tile key={key} label={FUNNEL_META[key].label} value={formatMetric(funnel[key], FUNNEL_META[key].format)} help={FUNNEL_META[key].help} />
          ))}
          <Tile label="Stated vs inferred" value={stated.agreement == null ? "—" : formatPercent(stated.agreement)} help={stated.answered ? `${stated.answered} answers to "Want more?" cards; agreement with what the feed inferred.` : "Answer a few \"Want more?\" cards to calibrate."} />
        </div>
      </PanelSection>

      <PanelSection title={FUNNEL_META.depthPerSubject.label} description={FUNNEL_META.depthPerSubject.help}>
        {depth.length ? (
          <div className="flex flex-col gap-1.5">
            {depth.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-text-secondary" title={d.id}>{nameOf(d.id)}</span>
                <span className="shrink-0 tabular-nums text-text-tertiary">level {d.depth}{d.sessionDescent ? ` · +${d.sessionDescent} this session` : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">Every subject is still at its first level.</p>
        )}
      </PanelSection>

      <PanelSection title="Session limits" description={`Rabbit holes may descend ${governor.maxLevels || 1} level${(governor.maxLevels || 1) === 1 ? "" : "s"} per subject per session.`}>
        {used.length ? (
          <div className="flex flex-col gap-2">
            {used.map(([id, n]) => (
              <div key={id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-secondary" title={id}>{nameOf(id)}</span>
                  <span className="shrink-0 tabular-nums text-text-tertiary">{n}/{governor.maxLevels || 1} used</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-strong dark:bg-surface-card">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(100, (100 * n) / (governor.maxLevels || 1))}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No descent this session.</p>
        )}
        {blocked.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-text-secondary">Paused for now (intensity limit reached):</p>
            <div className="flex flex-wrap gap-1.5">{blocked.map((t) => <Badge key={t} variant="warning">{t}</Badge>)}</div>
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">No sensitive themes paused.</p>
        )}
      </PanelSection>

      <PanelSection title="Privacy & resets" description="Keep a session out of your profile, or clear part of what the feed learned.">
        <SettingsList>
          <SettingRow
            title={PRIVATE_SESSION_COPY.title}
            description={PRIVATE_SESSION_COPY.description}
            control={<Switch checked={privateOn} disabled={busy || privateDraft !== null || Boolean(summary.nonProfiled)} onCheckedChange={togglePrivate} aria-label={privateOn ? PRIVATE_SESSION_COPY.off : PRIVATE_SESSION_COPY.on} />}
          />
          {RESET_SCOPES.map((scope) => (
            <SettingRow
              key={scope}
              title={RESET_SCOPE_META[scope].label}
              description={RESET_SCOPE_META[scope].description}
              control={
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirm(scope)} aria-label={RESET_SCOPE_META[scope].label}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              }
            />
          ))}
        </SettingsList>
        <p className="text-xs text-text-tertiary">To reset one topic, use its menu under Tune → Your topics.</p>
      </PanelSection>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? `${RESET_SCOPE_META[confirm].label}?` : ""}
        description={confirm ? `${RESET_SCOPE_META[confirm].description} This can't be undone.` : ""}
        confirmLabel={confirm ? RESET_SCOPE_META[confirm].label : "Reset"}
        busy={resetting}
        onConfirm={runReset}
      />
    </>
  );
}

export default AlgorithmHealth;
