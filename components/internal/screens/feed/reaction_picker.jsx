"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@geiger/ui/lib/utils";
import { REACTION_META } from "./constants";

// Emotional reaction popover for one short: one reaction per item, tapping the active one clears it.
// The trigger is the caller's rail button (passed as the only child).
export function ReactionPicker({ value, onPick, children }) {
  const [open, setOpen] = useState(false);
  const pick = (id) => {
    onPick(id);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="left" align="center" className="w-auto p-2">
        <p className="px-1 pb-2 text-xs font-medium text-text-secondary">How did this make you feel?</p>
        <div role="group" aria-label="Reactions" className="grid grid-cols-4 gap-1 sm:grid-cols-7">
          {REACTION_META.map(({ id, label, icon: Icon, tone }) => {
            const active = value === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-pressed={active}
                className={cn("flex w-16 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] text-text-secondary transition-colors hover:bg-surface-hover", active && "bg-surface-active text-foreground")}
              >
                <Icon className={cn("h-5 w-5", tone)} />
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ReactionPicker;
