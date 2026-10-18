"use client";

import React from "react";
import { MessageCircleQuestion, X } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { PROBE_OPTION_LABELS } from "./constants";

// In-feed stated-preference question (interest or knowledge) shown as its own short-sized slide.
export function ProbeCard({ probe, onAnswer, onDismiss }) {
  const labels = PROBE_OPTION_LABELS[probe.kind] || {};
  const options = probe.options?.length ? probe.options : Object.entries(labels).map(([value, label]) => ({ value, label }));
  return (
    <article className="relative flex aspect-[9/16] h-full max-w-[calc(100vw-2rem)] flex-col justify-center gap-6 rounded-xl border border-border bg-surface-subtle p-6 shadow-lg">
      <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label="Dismiss question" className="absolute top-3 right-3">
        <X className="h-4 w-4" />
      </Button>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-muted-foreground"><MessageCircleQuestion className="h-6 w-6" /></span>
        <Badge variant="outline">{probe.kind === "knowledge" ? "Quick check" : "Your taste"}</Badge>
        <h2 className="text-lg font-semibold leading-snug text-foreground">{probe.question}</h2>
        <p className="text-sm text-text-secondary">
          {probe.kind === "knowledge" ? "Your answer tunes how deep posts about" : "Your answer tunes how often you see"} {probe.subName || probe.sub}.
        </p>
      </div>
      <div className="flex flex-col gap-2" role="group" aria-label="Answers">
        {options.map((o) => (
          <Button key={o.value} variant="outline" onClick={() => onAnswer(o.value)} className="w-full">
            {o.label || labels[o.value] || o.value}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="self-center text-text-secondary">Not now</Button>
    </article>
  );
}

export default ProbeCard;
