"use client";

import React, { Suspense } from "react";
import { AppSidebar } from "@/components/internal/sidebar/sidebar";
import { Topbar } from "@/components/internal/topbar/topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ComingSoonScreen } from "@/components/internal/screens/coming_soon";
import { getScreen } from "@/components/internal/screens/registry";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { ProjectProvider } from "@/context/project-context";

// The project-scoped Content workspace. Mirrors geiger-events'
// /project/[projectId]/[[...rest]] shell: Topbar + Sidebar + the active screen,
// with the current tab living in the URL path so a refresh keeps the user in
// place. Content inherits the parent session and has no per-project data yet, so
// the shell renders regardless of whether the path's project resolves.
function WorkspaceContent() {
  const { tab: currentTab, setTab: setCurrentTab } = useWorkspaceUrl();

  const findActiveItem = () => {
    for (const item of workspaceNav) {
      if (item.title === currentTab) return item;
      const sub = item.subItems?.find((s) => s.title === currentTab);
      if (sub) return sub;
    }
    return workspaceNav[0] || { title: "Overview" };
  };

  const activeItem = findActiveItem();
  const screen = getScreen(activeItem.title);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-surface-strong">
      <SidebarProvider
        className="!flex h-full min-w-0 flex-col"
        style={{ flexDirection: "column" }}
      >
        <Topbar />
        <div className="relative flex flex-1 overflow-hidden">
          <AppSidebar activeTab={currentTab} onTabChange={setCurrentTab} />
          <SidebarInset className="relative flex h-full flex-1 flex-col overflow-hidden border-none bg-transparent">
            <div className="pointer-events-none absolute right-0 top-0 h-[300px] w-[500px] rounded-full bg-foreground/[0.02] blur-[120px]" />
            <main
              aria-label={`${activeItem.title} workspace`}
              className="relative z-10 min-w-0 flex-1 overflow-y-auto p-4 md:p-8"
            >
              <ComingSoonScreen {...screen} />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  // ProjectProvider reads the URL (useWorkspaceUrl) so it needs a Suspense
  // boundary, matching the suite shell.
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
      }
    >
      <ProjectProvider>
        <WorkspaceContent />
      </ProjectProvider>
    </Suspense>
  );
}
