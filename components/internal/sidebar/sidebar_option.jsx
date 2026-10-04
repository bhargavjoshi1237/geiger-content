"use client";

import React from "react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@geiger/ui/sidebar";
import { cn } from "@geiger/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@geiger/ui/tooltip";
import { isScreenImplemented } from "@/components/internal/screens/registry";

export function SidebarOption({
  title,
  icon: Icon,
  isActive,
  onClick,
  badge,
  className,
  subItems,
  isExpanded,
  onToggle,
  activeSubTab,
  iconColor,
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const activeIconColor = iconColor || "text-foreground";
  const inactiveIconColor = iconColor || "text-sidebar-foreground/70";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={subItems ? onToggle : () => onClick?.()}
        isActive={isActive}
        tooltip={title}
        className={cn(
          "transition-all text-sm h-9 group-data-[collapsible=icon]:justify-center",
          isExpanded || (isActive && !subItems)
            ? "bg-sidebar-accent text-foreground"
            : "text-sidebar-foreground",
          className,
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              isExpanded || isActive
                ? activeIconColor
                : inactiveIconColor,
            )}
          />
        )}
        {!isCollapsed && <span>{title}</span>}
        {subItems && !isCollapsed && (
          <ChevronDown
            className={cn(
              "ml-auto w-4 h-4 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        )}
        {badge && !subItems && !isCollapsed && (
          <SidebarMenuBadge className="mr-2 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded border border-border ml-auto">
            {badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuButton>

      {subItems && isExpanded && !isCollapsed && (
        <ul className="mt-1 flex flex-col gap-0.5 pl-2">
          {subItems.map((sub) => {
            const isBuilt = isScreenImplemented(sub.title);
            const isSubActive = activeSubTab === sub.title;
            return (
              <li key={sub.title}>
                <Button
                  type="button"
                  variant="ghost"
                  title={isBuilt ? undefined : `${sub.title} — not built yet`}
                  onClick={(e) => {
                    e.preventDefault();
                    onClick(sub.title);
                  }}
                  className={cn(
                    "relative flex h-8 w-full items-center justify-start gap-2 rounded-md px-2 text-left text-sm leading-none transition-colors",
                    isSubActive
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    // Unbuilt destinations sit a step back so the nav reflects
                    // what actually exists without shouting about it.
                    isSubActive
                      ? null
                      : isBuilt
                        ? "text-sidebar-foreground/70"
                        : "text-sidebar-foreground/40",
                  )}
                >
                  {sub.icon && (
                    <sub.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isSubActive
                          ? iconColor || "text-foreground"
                          : iconColor ||
                            (isBuilt
                              ? "text-sidebar-foreground/70"
                              : "text-sidebar-foreground/40"),
                      )}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-left">
                    {sub.title}
                  </span>
                  {isBuilt ? null : (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-foreground/30"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {subItems && isExpanded && isCollapsed && (
        <ul className="flex flex-col gap-0.5 pt-2">
          {subItems.map((sub) => (
            <li key={sub.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      onClick(sub.title);
                    }}
                    className={cn(
                      "relative w-full flex items-center justify-center px-2 h-[35px] rounded-md text-sm leading-none transition-colors",
                      activeSubTab === sub.title
                        ? "bg-sidebar-accent text-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50",
                    )}
                  >
                    {sub.icon && (
                      <sub.icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          activeSubTab === sub.title
                            ? iconColor || "text-foreground"
                            : iconColor || "text-sidebar-foreground/70",
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {sub.title}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </SidebarMenuItem>
  );
}
