"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/internal/sidebar/sidebar";
import { ComingSoonScreen } from "@/components/internal/screens/coming_soon";
import { getScreen } from "@/components/internal/screens/registry";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { Topbar } from "@/components/internal/topbar/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ContentShell() {
  const [currentTab, setCurrentTab] = useState("Overview");

  const activeParent = workspaceNav.find((item) =>
    item.subItems?.some((subItem) => subItem.title === currentTab),
  );
  const activeItem =
    activeParent?.subItems.find((subItem) => subItem.title === currentTab) ||
    workspaceNav.find((item) => item.title === currentTab) ||
    workspaceNav[0];
  const screen = getScreen(activeItem.title);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-surface-strong">
      <SidebarProvider
        className="!flex h-full min-w-0 flex-col"
        style={{ flexDirection: "column" }}
      >
        <Topbar />
        <div className="relative flex flex-1 overflow-hidden">
          <AppSidebar
            activeTab={currentTab}
            onTabChange={setCurrentTab}
          />
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
