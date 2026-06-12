"use client";

import { Hammer, Sparkles } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";

export function ComingSoonScreen({ title, description, details }) {
  return (
    <MainScreenWrapper>
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-background px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-subtle text-muted-foreground">
          <Hammer className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">
            {title} is coming soon
          </p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-text-secondary">
            {details}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Coming soon
        </span>
      </div>
    </MainScreenWrapper>
  );
}
