"use client";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";

export function ComingSoonScreen({ title, description, details }) {
  return (
    <MainScreenWrapper>
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-background px-6 py-20 text-center">
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">
            {title} is coming soon
          </p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-text-secondary">
            {details}
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      </div>
    </MainScreenWrapper>
  );
}
