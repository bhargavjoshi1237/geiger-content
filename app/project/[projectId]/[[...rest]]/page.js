"use client";

import React, { Suspense } from "react";
import { WorkspaceShell } from "@/components/internal/workspace/workspace_shell";
import { ProjectProvider } from "@/context/project-context";
import { RbacProvider } from "@/context/rbac-context";

// The project-scoped Content workspace (mirrors geiger-events' /project/[projectId]/[[...rest]]). The
// current tab lives in the URL path so a refresh keeps the user in place; the shell renders whether or
// not the path's project resolves, since Content inherits the parent session.
export default function ProjectWorkspacePage() {
  // ProjectProvider reads the URL (useWorkspaceUrl), so it needs a Suspense boundary; RbacProvider
  // resolves the active project the same way.
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
      }
    >
      <ProjectProvider>
        <RbacProvider>
          <WorkspaceShell />
        </RbacProvider>
      </ProjectProvider>
    </Suspense>
  );
}
