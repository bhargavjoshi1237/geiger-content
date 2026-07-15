"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ProjectProvider,
  useProject,
  pickDefaultProjectId,
} from "@/context/project-context";
import { LoadingArea } from "@/components/internal/workspace/workspace_states";

// Entry resolver for the project-scoped workspace. Opens the last-used (or
// first) project. Unlike geiger-events, Content inherits the parent app's
// session and has no /login page — so with no reachable project it still opens
// a workspace (project-less) at /project/default rather than bouncing away.
function ProjectResolver() {
  const router = useRouter();
  const { projects, loading } = useProject();

  useEffect(() => {
    if (loading) return;
    const id = pickDefaultProjectId(projects) || "default";
    router.replace(`/project/${id}`);
  }, [loading, projects, router]);

  return <LoadingArea />;
}

export default function ProjectIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
      }
    >
      <ProjectProvider>
        <div className="h-[100dvh] w-full bg-background text-foreground">
          <ProjectResolver />
        </div>
      </ProjectProvider>
    </Suspense>
  );
}
