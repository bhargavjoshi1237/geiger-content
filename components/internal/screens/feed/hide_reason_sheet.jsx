"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@geiger/ui/lib/utils";
import { HIDE_REASON_META } from "./constants";

// "Not for me" reasons for one short; picking the active reason again unhides it.
// The trigger is the caller's rail button (passed as the only child).
export function HideReasonSheet({ value, onPick, children }) {
  const [open, setOpen] = useState(false);
  const pick = (id) => {
    onPick(id);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="left" align="center" className="w-60 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-text-secondary">Why not for you?</p>
        <div role="group" aria-label="Hide reasons" className="flex flex-col">
          {HIDE_REASON_META.map(({ id, label, icon: Icon }) => {
            const active = value === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                aria-pressed={active}
                className={cn("flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface-active", active && "bg-surface-active")}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default HideReasonSheet;
