"use client";

import React from "react";

import { EmptyState, SectionCard, StatusPill } from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Progress } from "@geiger/ui/progress";
import { TOPIC_STAGES } from "@/lib/supabase/topics";

// Shared lookups + presentation bits for the personalization screens (config only, never row data).
export const ACTIVE_STATUS_MAP = {
  Active: { label: "Active", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "neutral", dotClass: "bg-text-secondary" },
};

export const VARIANT_STATUS_MAP = {
  ...ACTIVE_STATUS_MAP,
  Archived: { label: "Archived", variant: "outline", dotClass: "bg-text-tertiary" },
};

// Normalizes a variant's `rules` (array, `{ all: [] }` or flat object) into clause rows.
export function clausesOf(rules) {
  if (Array.isArray(rules)) return rules;
  if (rules && typeof rules === "object" && Array.isArray(rules.all)) return rules.all;
  if (rules && typeof rules === "object") return Object.entries(rules).map(([field, value]) => ({ field, op: "equals", value }));
  return [];
}

// One mono chip per clause, wrapping instead of running off the row.
export function ClauseChips({ clauses, empty = "Default (no rules)" }) {
  if (!clauses?.length) return <span className="text-xs text-text-secondary">{empty}</span>;
  return (
    <div className="flex min-w-0 max-w-[16rem] flex-wrap gap-1.5 sm:max-w-sm">
      {clauses.map((c, i) => (
        <Badge key={`${c.field}-${i}`} variant="neutral" className="max-w-full font-mono" title={`${c.field} ${c.op || "equals"} ${String(c.value)}`}>
          <span className="truncate">
            {c.field} <span className="text-text-tertiary">{c.op || "equals"}</span> {String(c.value)}
          </span>
        </Badge>
      ))}
    </div>
  );
}

// Variant identity cell: slot name (when known) over a priority/weight meta line.
export function VariantCell({ variant, slotName }) {
  return (
    <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
      {slotName ? <span className="truncate text-sm font-medium text-foreground" title={slotName}>{slotName}</span> : null}
      <span className="text-xs text-text-secondary tabular-nums">
        priority {variant.priority ?? 0} · weight {variant.weight ?? 1}
      </span>
    </div>
  );
}

export function VariantStatus({ status }) {
  return <StatusPill status={status} map={VARIANT_STATUS_MAP} />;
}

// EmptyState in the bordered table-shell surface, matching the events lists.
export function EmptyPanel(props) {
  return (
    <div className="rounded-xl border border-border bg-surface-subtle">
      <EmptyState {...props} />
    </div>
  );
}

// Numbered explainer steps; replaces walls of description text.
export function HowItWorks({ steps, title = "How it works", description }) {
  return (
    <SectionCard title={title} description={description}>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex min-w-0 gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card text-xs font-semibold text-text-secondary tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-text-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

// Topic-stage distribution tiles in journey order, with any unknown stages appended.
export function StageMix({ stages }) {
  const counts = {};
  for (const s of stages) counts[s.stage] = (counts[s.stage] || 0) + 1;
  const order = [...TOPIC_STAGES, ...Object.keys(counts).filter((k) => !TOPIC_STAGES.includes(k))];
  const total = stages.length;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {order.map((stage) => {
        const count = counts[stage] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stage} className="min-w-0 space-y-2 rounded-lg border border-border bg-surface-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium uppercase tracking-wider text-text-secondary">{stage}</span>
              <span className="text-xs text-text-tertiary tabular-nums">{pct}%</span>
            </div>
            <p className="text-xl font-semibold leading-none text-foreground tabular-nums">{count}</p>
            <Progress value={pct} className="h-1.5" />
          </div>
        );
      })}
    </div>
  );
}
