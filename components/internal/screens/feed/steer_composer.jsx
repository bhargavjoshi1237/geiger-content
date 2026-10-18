"use client";

import React, { useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@geiger/ui/popover";
import { Textarea } from "@geiger/ui/textarea";
import { STEERING_COPY } from "./constants";

// Header popover for "show me more X" steering requests; the active list (with remove) lives in the insights panel.
export function SteerComposer({ feed }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const active = feed.summary?.steering?.length || 0;
  const atLimit = active >= STEERING_COPY.maxActive;
  const busy = feed.pending?.steering;
  const length = text.trim().length;
  const valid = length >= STEERING_COPY.minLength && length <= STEERING_COPY.maxLength;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy || atLimit) return;
    if (await feed.addSteering(text)) {
      setText("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" aria-label={STEERING_COPY.title}>
          <Compass className="h-4 w-4" /> <span className="hidden sm:inline">Steer</span>
          {active > 0 && <span className="rounded-full bg-surface-active px-1.5 text-[11px] text-text-secondary">{active}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <PopoverHeader>
            <PopoverTitle>{STEERING_COPY.title}</PopoverTitle>
            <PopoverDescription className="text-xs">{STEERING_COPY.description}</PopoverDescription>
          </PopoverHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
            placeholder={STEERING_COPY.placeholder}
            maxLength={STEERING_COPY.maxLength}
            disabled={atLimit}
            aria-label="Steering request"
            className="min-h-[72px] resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-tertiary">
              {atLimit ? STEERING_COPY.limitReached : `${active} of ${STEERING_COPY.maxActive} active · ${length}/${STEERING_COPY.maxLength}`}
            </span>
            <Button type="submit" size="sm" disabled={!valid || busy || atLimit}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {STEERING_COPY.submit}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default SteerComposer;
