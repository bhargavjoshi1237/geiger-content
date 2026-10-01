"use client";

import React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroupContent,
  SidebarGroup,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from "@geiger/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { SidebarOption } from "./sidebar_option";
import { workspaceNav } from "./sidebar_nav";
import { Button } from "@geiger/ui/button";
import { useRbac } from "@/context/rbac-context";
import { tabPermissionKey } from "@/lib/rbac";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function MobileSidebarHeader() {
  const { isMobile, toggleSidebar } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <SidebarHeader className="p-0 border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0">
            <img
              src={`${basePath}/logo1.svg`}
              alt=""
              className="geiger-logo w-5 h-5"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement.innerHTML =
                  '<div class="w-2 h-2 bg-foreground rounded-full"></div>';
              }}
            />
          </div>
          <span className="text-foreground font-semibold text-sm">Content</span>
        </div>
      </div>
    </SidebarHeader>
  );
}

export function AppSidebar({
  activeTab = "Overview",
  onTabChange = () => {},
}) {
  const { toggleSidebar } = useSidebar();
  const [expandedItems, setExpandedItems] = React.useState({});
  const { can, roles } = useRbac();

  // Advisory UI-gating only (real denial of data is per-table RLS): hide a
  // destination when the signed-in user lacks its view key. Default-open when
  // no roles are configured, so the workspace stays reachable in the demo and
  // before the first grant lands. While grants load, can() itself stays
  // permissive so nav never flashes empty on a project switch.
  //
  // Nav keys gate a whole sidebar SECTION (content.<section>.view — see
  // geiger-rbac.config.js). evaluate() fails closed on unknown keys, so
  // sub-items must NOT be gated by their own derived key (e.g.
  // content.webhooks.view is unknown → deny → emptied sections even for
  // Owners). Sub-items inherit their parent section's key instead; the
  // section row itself stays on its own key.
  const visibleNav = React.useMemo(() => {
    const allowed = (title) => {
      if (!roles || roles.length === 0) return true;
      try {
        return can(tabPermissionKey(title));
      } catch {
        return true;
      }
    };
    return workspaceNav
      .map((item) => {
        if (!item.subItems) {
          return allowed(item.title) ? item : null;
        }
        if (!allowed(item.title)) return null;
        return item;
      })
      .filter(Boolean);
  }, [can, roles]);

  const toggleExpand = (title) => {
    setExpandedItems((current) => ({
      ...current,
      [title]: !current[title],
    }));
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar border-r border-sidebar-border text-sidebar-foreground"
    >
      <MobileSidebarHeader />
      <SidebarContent className="py-1 space-y-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => (
                <SidebarOption
                  key={item.title}
                  title={item.title}
                  icon={item.icon}
                  isActive={activeTab === item.title}
                  subItems={item.subItems || null}
                  isExpanded={
                    expandedItems[item.title] !== undefined
                      ? expandedItems[item.title]
                      : !!item.subItems?.some((sub) => sub.title === activeTab)
                  }
                  onToggle={() => toggleExpand(item.title)}
                  activeSubTab={activeTab}
                  onClick={(subTitle) =>
                    onTabChange(
                      typeof subTitle === "string" ? subTitle : item.title,
                    )
                  }
                  badge={item.badge}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
        <Button
          type="button"
          variant="ghost"
          onClick={toggleSidebar}
          className="flex items-center gap-3 p-2 w-full rounded-lg hover:bg-sidebar-accent transition-all text-sidebar-foreground hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
        >
          <PanelLeft className="w-5 h-5 shrink-0" />
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
