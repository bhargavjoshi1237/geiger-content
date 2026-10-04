"use client";

import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { WorkspaceShell } from "@/components/internal/workspace/workspace_shell";
import { PlaygroundProjectProvider } from "@/context/project-context";
import { WorkspaceUrlContext, useMemoryWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { createDemoClient } from "@/supabase/demo/demo-client";
import { setDemoClient, setDemoWriteHandler } from "@/supabase/demo/demo-mode";
import { DEMO_PROJECT } from "@/supabase/demo/demo-store";

// Live, embeddable copy of the Content workspace for the landing page (like geiger-flow's FlowPlayground):
// the same WorkspaceShell as /project, on the demonstrator project's fixtures, read-only, URL untouched.

const demoClient = createDemoClient();

// Armed when this lazy chunk evaluates, i.e. before any screen mounts: a screen that fetched a tick
// early would hit the real client, get nothing, and sit on an empty state.
setDemoClient(demoClient);

function PlaygroundWorkspace() {
  const workspaceUrl = useMemoryWorkspaceUrl(DEMO_PROJECT.id, "Overview");
  const armedRef = useRef(false);

  // Disarm on unmount so a later client-side route can't render fixtures. Deferred a microtask because
  // StrictMode's simulated remount runs this cleanup and immediately re-arms.
  useEffect(() => {
    armedRef.current = true;
    setDemoClient(demoClient);
    return () => {
      armedRef.current = false;
      queueMicrotask(() => {
        if (!armedRef.current) setDemoClient(null);
      });
    };
  }, []);

  // One message for every rejected write; the fixed id collapses a burst into a single toast.
  useEffect(() => {
    setDemoWriteHandler(() =>
      toast.error("This is a read-only demo.", {
        id: "playground-read-only",
        description: "Changes aren't saved here. Open the workspace to try it for real.",
      }),
    );
    return () => setDemoWriteHandler(null);
  }, []);

  return (
    <WorkspaceUrlContext.Provider value={workspaceUrl}>
      <WorkspaceShell className="h-full" />
    </WorkspaceUrlContext.Provider>
  );
}

// No RbacProvider: useRbac() falls back to permissive, so the demo reader sees every screen.
export function ContentPlayground() {
  return (
    <PlaygroundProjectProvider project={DEMO_PROJECT}>
      <PlaygroundWorkspace />
    </PlaygroundProjectProvider>
  );
}

export default ContentPlayground;
