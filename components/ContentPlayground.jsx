"use client";

import React, { Suspense, useState } from "react";
import { AppSidebar } from "@/components/internal/sidebar/sidebar";
import { Topbar } from "@/components/internal/topbar/topbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ComingSoonScreen } from "@/components/internal/screens/coming_soon";
import { getScreen } from "@/components/internal/screens/registry";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { ProjectProvider } from "@/context/project-context";

// Live, embeddable copy of the Content dashboard used on the landing page.
// Mirrors the /project workspace but fills its container (h-full) instead of the
// viewport so it can be mounted inside the playground showcase. The tab is local
// state here (not the URL) — it's a throwaway, fully interactive instance of the
// real interface. No save, no load.
function ContentPlaygroundContent() {
  const [currentTab, setCurrentTab] = useState("Overview");

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
    <div className="flex h-full w-full flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-surface-strong">
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
              className="relative z-10 min-w-0 flex-1 overflow-y-auto p-4 md:p-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <ComingSoonScreen {...screen} />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

// Screens may read the active project via useProject(), so the playground brings
// its own ProjectProvider (like the real shell). Suspense matches the suite
// pattern. On the public landing no project resolves, so it stays project-less.
export function ContentPlayground() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-background" />}>
      <ProjectProvider>
        <ContentPlaygroundContent />
      </ProjectProvider>
    </Suspense>
  );
}

export default ContentPlayground;
