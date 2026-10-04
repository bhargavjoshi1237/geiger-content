"use client";

import React from "react";
import { Info } from "lucide-react";

import { EmptyState } from "@geiger/ui/screen-kit";
import { cn } from "@geiger/ui/lib/utils";

// Status lookup shared by every experiments screen (feeds StatusPill).
export const EXPERIMENT_STATUS_MAP = {
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-text-tertiary" },
  Running: { label: "Running", variant: "success", dotClass: "bg-emerald-400" },
  Paused: { label: "Paused", variant: "info", dotClass: "bg-sky-400" },
  Completed: { label: "Completed", variant: "outline", dotClass: "bg-border-strong" },
};

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...Object.keys(EXPERIMENT_STATUS_MAP).map((s) => ({ value: s, label: s })),
];

// 0–1 rate → "12.3%".
export const pct = (rate, digits = 1) => `${((Number(rate) || 0) * 100).toFixed(digits)}%`;

// Shared search + status filter for experiment rows.
export function matchesFilters(row, search, status, text = row.name) {
  if (status && status !== "all" && row.status !== status) return false;
  return !search || String(text || "").toLowerCase().includes(search.toLowerCase());
}

// EmptyState on the table surface, matching events' DataTable empties.
export function EmptyCard({ className, ...props }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface-subtle", className)}>
      <EmptyState {...props} />
    </div>
  );
}

// Identity cell: name over a meta line, with an optional trailing badge.
export function ExperimentCell({ name, meta, badge }) {
  return (
    <div className="flex min-w-0 max-w-[16rem] flex-col gap-1 sm:max-w-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="max-w-full truncate font-medium text-foreground" title={name}>{name}</span>
        {badge}
      </div>
      {meta ? <span className="truncate text-xs text-text-secondary" title={meta}>{meta}</span> : null}
    </div>
  );
}

// Quiet footnote explaining how a screen's numbers are derived.
export function InfoNote({ children, className }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-text-secondary", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
