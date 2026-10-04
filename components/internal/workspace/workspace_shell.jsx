"use client";

import React from "react";
import { Bell, TriangleAlert } from "lucide-react";
import { Topbar } from "@geiger/ui/topbar";
import { Button } from "@geiger/ui/button";
import { EmptyState } from "@geiger/ui/screen-kit";
import { SidebarProvider, SidebarInset } from "@geiger/ui/sidebar";
import { AppSidebar } from "@/components/internal/sidebar/sidebar";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { NotificationsDropdown } from "@/components/internal/topbar/dialogue/notifications_dropdown";
import { ProfileDropdown } from "@/components/internal/topbar/dialogue/profile_dropdown";
import { ComingSoonScreen } from "@/components/internal/screens/coming_soon";
import { getScreen, getScreenComponent } from "@/components/internal/screens/registry";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// One failing screen must not take the shell (or the landing playground) down; keyed by tab so it retries on navigation.
class ScreenErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[workspace] screen failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        icon={TriangleAlert}
        title={`${this.props.title} couldn't load`}
        description="Pick another screen from the sidebar, or reload to try again."
      />
    );
  }
}

function findActiveItem(tab) {
  for (const item of workspaceNav) {
    if (item.title === tab) return item;
    const sub = item.subItems?.find((s) => s.title === tab);
    if (sub) return sub;
  }
  return workspaceNav[0] || { title: "Overview" };
}

// The Content workspace: Topbar + Sidebar + the active screen, driven by useWorkspaceUrl. Shared by
// /project/[projectId] (URL-backed) and the landing playground (in-memory WorkspaceUrlContext).
export function WorkspaceShell({ className = "h-[100dvh]" }) {
  const { tab, setTab } = useWorkspaceUrl();
  const activeItem = findActiveItem(tab);
  const screenComponent = getScreenComponent(activeItem.title);

  return (
    <div className={`flex w-full flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-surface-strong ${className}`}>
      <SidebarProvider className="!flex h-full min-w-0 flex-col" style={{ flexDirection: "column" }}>
        <Topbar
          label="Content"
          logoSrc={`${BASE_PATH}/logo1.svg`}
          homeHref={`${BASE_PATH}/`}
          searchNav={workspaceNav}
          searchPlaceholder="Search screens…"
          searchRecentsKey="geiger:content:palette:recents"
          onSearchSelect={(item) => setTab(item.title)}
          notifications={
            <NotificationsDropdown>
              <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="hidden h-8 w-8 rounded-full text-muted-foreground hover:bg-surface-hover hover:text-foreground sm:flex">
                <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
              </Button>
            </NotificationsDropdown>
          }
          profile={<ProfileDropdown />}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <AppSidebar activeTab={tab} onTabChange={setTab} />
          <SidebarInset className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-none bg-transparent">
            <div className="pointer-events-none absolute right-0 top-0 h-[300px] w-[500px] rounded-full bg-foreground/[0.02] blur-[120px]" />
            <main
              aria-label={`${activeItem.title} workspace`}
              className="relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-8"
            >
              <ScreenErrorBoundary key={activeItem.title} title={activeItem.title}>
                {screenComponent
                  ? React.createElement(screenComponent)
                  : React.createElement(ComingSoonScreen, { ...getScreen(activeItem.title), onNavigate: setTab })}
              </ScreenErrorBoundary>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

export default WorkspaceShell;
