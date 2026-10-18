"use client";

import React, { Suspense } from "react";
import { WorkspaceShell } from "@/components/internal/workspace/workspace_shell";
import { PlaygroundProjectProvider } from "@/context/project-context";
import { WorkspaceUrlContext, useMemoryWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { usePlaygroundMode } from "@/lib/playground/use_playground_mode";
import { playgroundHandlers, playgroundRoutes } from "@/lib/playground/handlers";
import { PLAYGROUND_PROJECT } from "@/lib/playground/mode";

// Live copy of the Content workspace for the landing page, served from /playground and iframed by the
// showcase: the same WorkspaceShell as /project on Halcyon Studio's seeded in-memory database (lib/playground).
// Edits persist for the session and reset on reload; navigation stays in memory, so the URL never moves.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MODE_OPTIONS = { routes: playgroundRoutes, basePath: BASE_PATH };

function PlaygroundWorkspace() {
  const workspaceUrl = useMemoryWorkspaceUrl(PLAYGROUND_PROJECT.id, "Overview");
  return (
    <WorkspaceUrlContext.Provider value={workspaceUrl}>
      <WorkspaceShell className="h-full" />
    </WorkspaceUrlContext.Provider>
  );
}

// No RbacProvider: useRbac() falls back to permissive, so the visitor (the project owner) sees every screen.
export function ContentPlayground() {
  usePlaygroundMode(playgroundHandlers, MODE_OPTIONS);

  return (
    <Suspense fallback={null}>
      <PlaygroundProjectProvider project={PLAYGROUND_PROJECT}>
        <PlaygroundWorkspace />
      </PlaygroundProjectProvider>
    </Suspense>
  );
}

export default ContentPlayground;
