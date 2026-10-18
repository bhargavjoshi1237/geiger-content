"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { SegmentedTabs } from "@geiger/ui/segmented-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import {
  BASICS_SUPPRESSION_COPY,
  DEPTH_OPTIONS,
  DIAL_META,
  DRIFT_COPY,
  INTENSITY_OPTIONS,
  MINOR_COPY,
  NON_PROFILED_COPY,
  RABBIT_HOLE_COPY,
} from "./constants";

// Shared panel primitives for the algorithm_* sections (section frame, confirm dialog, guarded hook calls, optimistic settings).

// Settings keys that merge one level deep, mirroring lib/feed/settings.mjs mergeSettings.
const NESTED_KEYS = ["rabbitHole", "topics", "emotionDials", "depth", "signalWeights"];

export function mergePatch(base = {}, patch = {}) {
  const out = { ...base, ...patch };
  for (const key of NESTED_KEYS) {
    if (patch[key] && typeof patch[key] === "object") out[key] = { ...(base[key] || {}), ...patch[key] };
  }
  return out;
}

// Runs a feed hook method; the hook toasts its own results, so only a missing method or a throw is reported here.
export async function runAction(fn, ...args) {
  if (typeof fn !== "function") {
    toast.error("This control isn't available yet.");
    return false;
  }
  try {
    const result = await fn(...args);
    return result !== false;
  } catch (error) {
    toast.error(error?.message || "Something went wrong.");
    return false;
  }
}

// Optimistic overlay on summary.settings: each pending patch shows immediately and is dropped when its write settles (rollback on failure).
export function useSettingsDraft(feed) {
  const [drafts, setDrafts] = useState([]);
  const seq = useRef(0);
  const base = feed.summary?.settings;
  const update = feed.updateSettings;
  const settings = useMemo(() => drafts.reduce((s, d) => mergePatch(s, d.patch), base || {}), [drafts, base]);
  const save = useCallback(async (patch, run) => {
    const id = ++seq.current;
    setDrafts((d) => [...d, { id, patch }]);
    const ok = await runAction(run || update, ...(run ? [] : [patch]));
    setDrafts((d) => d.filter((x) => x.id !== id));
    return ok;
  }, [update]);
  return { settings, save, busy: Boolean(feed.pending?.settings) };
}

export function PanelSection({ title, description, action, children }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// Disables every native control inside (tabs, switches, selects) while a write is pending.
export function Lockable({ disabled, children, className = "" }) {
  return (
    <fieldset disabled={disabled} className={`m-0 flex min-w-0 flex-col gap-3 border-0 p-0 disabled:opacity-60 ${className}`}>
      {children}
    </fieldset>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Reset", busy = false, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Dial({ meta, value, onChange }) {
  const current = meta.options.find((o) => o.value === value) || meta.options.find((o) => o.value === "balanced");
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <p className="text-sm font-medium text-foreground">{meta.title}</p>
        <p className="text-xs text-text-secondary">{meta.description}</p>
      </div>
      <SegmentedTabs tabs={meta.options} value={current?.value} onChange={(v) => v !== value && onChange(v)} fullWidth />
      <p className="text-xs text-text-tertiary">{current?.description}</p>
    </div>
  );
}

// Composition presets, depth, rabbit holes, intensity and the non-profiled switch, all saved through feed.updateSettings.
export function AlgorithmDials({ feed }) {
  const { settings, save, busy } = useSettingsDraft(feed);
  const rabbit = settings.rabbitHole || {};
  const depth = settings.depth || {};
  const minor = Boolean(settings.minor);
  const intensity = INTENSITY_OPTIONS.find((o) => o.value === (settings.intensityCap || "moderate"));
  const depthTarget = DEPTH_OPTIONS.find((o) => o.value === (depth.target || "balanced"));
  const levels = String(minor ? 1 : rabbit.maxLevelsPerSession || 1);

  return (
    <>
      <PanelSection title="Composition" description="What goes into each batch. Changes apply from the next batch.">
        <Lockable disabled={busy} className="gap-5">
          {Object.entries(DIAL_META).map(([key, meta]) => (
            <Dial key={key} meta={meta} value={settings[key] || "balanced"} onChange={(v) => save({ [key]: v })} />
          ))}
        </Lockable>
      </PanelSection>

      <PanelSection title="Depth" description="How advanced posts should be, based on your knowledge levels.">
        <Lockable disabled={busy}>
          <SegmentedTabs tabs={DEPTH_OPTIONS} value={depthTarget?.value} onChange={(v) => save({ depth: { target: v } })} fullWidth />
          <p className="text-xs text-text-tertiary">{depthTarget?.description}</p>
          <SettingsList>
            <SettingRow
              title={BASICS_SUPPRESSION_COPY.title}
              description={BASICS_SUPPRESSION_COPY.description}
              control={<Switch checked={depth.basicsSuppression !== false} onCheckedChange={(on) => save({ depth: { basicsSuppression: on } })} aria-label={BASICS_SUPPRESSION_COPY.title} />}
            />
          </SettingsList>
        </Lockable>
      </PanelSection>

      <PanelSection title={RABBIT_HOLE_COPY.title} description={RABBIT_HOLE_COPY.description}>
        <Lockable disabled={busy}>
          <SettingsList>
            <SettingRow
              title="Go deeper"
              description="Descend into a subject when you keep engaging with it."
              control={<Switch checked={Boolean(rabbit.enabled)} onCheckedChange={(on) => save({ rabbitHole: { enabled: on } })} aria-label="Rabbit holes" />}
            />
            <SettingRow
              title={RABBIT_HOLE_COPY.levelsLabel}
              description={minor ? RABBIT_HOLE_COPY.minorNote : RABBIT_HOLE_COPY.levelsHint}
              control={
                <Select value={levels} onValueChange={(v) => save({ rabbitHole: { maxLevelsPerSession: Number(v) } })} disabled={busy || minor || !rabbit.enabled}>
                  <SelectTrigger size="sm" className="w-28" aria-label={RABBIT_HOLE_COPY.levelsLabel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RABBIT_HOLE_COPY.levelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
            />
          </SettingsList>
        </Lockable>
      </PanelSection>

      <PanelSection title="Intensity" description="Limits on sensitive themes and intense negative posts.">
        <Lockable disabled={busy}>
          <SegmentedTabs tabs={INTENSITY_OPTIONS} value={intensity?.value} onChange={(v) => save({ intensityCap: v })} fullWidth />
          <p className="text-xs text-text-tertiary">{intensity?.description}</p>
          <SettingsList>
            <SettingRow
              title={MINOR_COPY.title}
              description={MINOR_COPY.description}
              control={<Switch checked={minor} onCheckedChange={(on) => save({ minor: on })} aria-label={MINOR_COPY.title} />}
            />
          </SettingsList>
        </Lockable>
      </PanelSection>

      <PanelSection title="Personalisation" description="Turn learning off entirely, or let the feed widen when your taste moves.">
        <Lockable disabled={busy}>
          <SettingsList>
            <SettingRow
              title={DRIFT_COPY.driftBoostTitle}
              description={DRIFT_COPY.driftBoostDescription}
              control={<Switch checked={Boolean(settings.driftBoost)} onCheckedChange={(on) => save({ driftBoost: on })} aria-label={DRIFT_COPY.driftBoostTitle} />}
            />
            <SettingRow
              title={NON_PROFILED_COPY.title}
              description={`${NON_PROFILED_COPY.description} ${NON_PROFILED_COPY.persistNote}`}
              control={<Switch checked={Boolean(settings.nonProfiled)} onCheckedChange={(on) => save({ nonProfiled: on })} aria-label={NON_PROFILED_COPY.title} />}
            />
          </SettingsList>
          <p className="text-xs text-text-tertiary">Settings survive a reset; only what the feed learned is cleared.</p>
        </Lockable>
      </PanelSection>
    </>
  );
}

export default AlgorithmDials;
