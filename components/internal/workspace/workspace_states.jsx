"use client";

import React from "react";
import { LogoLoading } from "@geiger/ui";

// Shared gate states for the project-scoped workspace. Used by the /project
// resolver and the /project/[projectId] shell.

export function LoadingArea() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-sm text-text-secondary">
      <LogoLoading size={56} />
      Loading…
    </div>
  );
}
