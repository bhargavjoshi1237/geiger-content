"use client";

import React, { useState } from "react";
import { ArrowUp, Ellipsis, EyeOff, RotateCcw, VolumeX, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import { Field } from "@geiger/ui/screen-kit";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { ConfirmDialog, Lockable, PanelSection, runAction, useSettingsDraft } from "./algorithm_dials";
import { RESET_SCOPE_META } from "./constants";

// Caps from lib/feed/settings.mjs validation.
const LIMITS = { boost: 10, mute: 30, exclude: 20 };

const LISTS = [
  { key: "boost", title: "More of", empty: "Nothing boosted.", icon: ArrowUp },
  { key: "mute", title: "Muted", empty: "Nothing muted.", icon: VolumeX },
  { key: "exclude", title: "Not learned from", empty: "Everything you do is learned.", icon: EyeOff },
];

const without = (list, id) => list.filter((x) => x !== id);

function Chip({ label, title, onRemove, disabled }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-surface-card py-0.5 pl-2 pr-0.5 text-xs text-foreground" title={title}>
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${label}`} className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// Per-topic controls: boost, mute, exclude from learning and scoped reset, for learned topics and any catalog topic or subject.
export function AlgorithmTopics({ feed, nameOf }) {
  const { settings, save, busy: savingSettings } = useSettingsDraft(feed);
  const busy = savingSettings || Boolean(feed.pending?.reset);
  const topics = { boost: [], mute: [], exclude: [], ...(settings.topics || {}) };
  const options = feed.options?.topics || [];
  const learned = [...(feed.summary?.topics || []).map((t) => ({ id: t.id, lift: t.lift })), ...(feed.summary?.subtopics || []).slice(0, 4).map((s) => ({ id: s.id, lift: s.lift }))];
  const [picked, setPicked] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const has = (key, id) => topics[key].includes(id);
  const full = (key, id) => !has(key, id) && topics[key].length >= LIMITS[key];

  // A mute drops the same id from boost (settings.mjs rule), so the overlay mirrors it.
  const toggle = (key, id, on = !has(key, id)) => {
    if (key === "boost") return save({ topics: { boost: on ? [...without(topics.boost, id), id] : without(topics.boost, id) } }, () => (on ? feed.boostTopic?.(id) : feed.unboostTopic?.(id)));
    if (key === "mute") return save({ topics: { mute: on ? [...without(topics.mute, id), id] : without(topics.mute, id), ...(on ? { boost: without(topics.boost, id) } : {}) } }, () => (on ? feed.muteTopic?.(id) : feed.unmuteTopic?.(id)));
    return save({ topics: { exclude: on ? [...without(topics.exclude, id), id] : without(topics.exclude, id) } }, () => feed.excludeFromTaste?.({ scope: "topic", id, on }));
  };

  const confirmReset = async () => {
    setResetting(true);
    await runAction(feed.scopedReset, { scope: "topic", id: resetTarget });
    setResetting(false);
    setResetTarget(null);
  };

  const actions = (id) => [
    { key: "boost", label: "More of this", icon: ArrowUp },
    { key: "mute", label: "Mute (never show)", icon: VolumeX },
    { key: "exclude", label: "Don't learn from this", icon: EyeOff },
  ].map((a) => ({ ...a, checked: has(a.key, id), disabled: busy || full(a.key, id) }));

  return (
    <>
      <PanelSection title="Your topics" description="What the feed has learned you like. Boost, mute or stop it learning per topic.">
        {learned.length ? (
          <div className="flex flex-col divide-y divide-border">
            {learned.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground" title={t.id}>{nameOf(t.id)}</p>
                  <p className="text-xs tabular-nums text-text-tertiary">
                    {t.id.includes("/") ? "Subject" : "Topic"} · {Number(t.lift || 0).toFixed(2)}× interest
                    {has("boost", t.id) && " · boosted"}{has("mute", t.id) && " · muted"}{has("exclude", t.id) && " · not learned"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${nameOf(t.id)}`} disabled={busy}><Ellipsis className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {actions(t.id).map((a) => (
                      <DropdownMenuCheckboxItem key={a.key} checked={a.checked} disabled={a.disabled} onCheckedChange={(on) => toggle(a.key, t.id, on)}>
                        {a.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setResetTarget(t.id)}>
                      <RotateCcw className="h-4 w-4" /> Reset what it learned
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No topics learned yet. Engage with a few posts, or set a rule below.</p>
        )}
      </PanelSection>

      <PanelSection title="Topic rules" description="Pick any topic or subject in the catalog.">
        <Lockable disabled={busy}>
          <Field label="Topic or subject">
            <Select value={picked} onValueChange={setPicked} disabled={busy || !options.length}>
              <SelectTrigger size="sm" aria-label="Topic or subject"><SelectValue placeholder={options.length ? "Choose a topic" : "Catalog loading…"} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {options.map((t) => (
                  <SelectGroup key={t.id}>
                    <SelectLabel>{t.name}</SelectLabel>
                    <SelectItem value={t.id}>All of {t.name}</SelectItem>
                    {(t.subjects || []).map((s) => <SelectItem key={s.path} value={s.path}>{s.name}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {picked && (
            <div className="flex flex-wrap gap-1.5">
              {actions(picked).map((a) => (
                <Button key={a.key} type="button" size="sm" variant={a.checked ? "secondary" : "outline"} disabled={a.disabled} onClick={() => toggle(a.key, picked)} aria-pressed={a.checked}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setResetTarget(picked)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {LISTS.map((list) => (
              <div key={list.key} className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                  <list.icon className="h-3.5 w-3.5" /> {list.title}
                  <span className="tabular-nums text-text-tertiary">{topics[list.key].length}/{LIMITS[list.key]}</span>
                </p>
                {topics[list.key].length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {topics[list.key].map((id) => <Chip key={id} label={nameOf(id)} title={id} disabled={busy} onRemove={() => toggle(list.key, id, false)} />)}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary">{list.empty}</p>
                )}
              </div>
            ))}
          </div>
        </Lockable>
      </PanelSection>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title={`Reset “${resetTarget ? nameOf(resetTarget) : ""}”?`}
        description={`${RESET_SCOPE_META.topic.description} Its interest, taste, knowledge and logged events are cleared. Your rules for it stay.`}
        confirmLabel={RESET_SCOPE_META.topic.label}
        busy={resetting}
        onConfirm={confirmReset}
      />
    </>
  );
}

export default AlgorithmTopics;
