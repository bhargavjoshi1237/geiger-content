"use client";

import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CircleUserRound,
  Settings,
  Wallet,
  LogOut,
  Moon,
  Sun,
  UsersRound,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  BookMarked,
  ExternalLink,
} from "lucide-react";
import { getUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const itemBaseStyle =
  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-default transition-colors outline-none";

const itemHoverStyle =
  "text-muted-foreground hover:bg-surface-hover focus:bg-surface-hover hover:text-foreground focus:text-foreground";

export function ProfileDropdown({ children }) {
  const [user, setUser] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getUser().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  const pfpUrl = user?.id
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pfp/${user.id}/latest.jpg`
    : null;

  const displayName = user?.name || "User";
  const displayEmail = user?.email || "user@email.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="w-8 h-8 p-0 rounded-full border border-border hover:border-border-strong overflow-hidden ml-1 transition-colors"
          >
            <Avatar className="size-full">
              {pfpUrl && (
                <AvatarImage
                  src={pfpUrl}
                  alt={displayName}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-[10px] font-semibold border-0">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 overflow-hidden rounded-xl border border-border bg-surface-dialog p-0 text-foreground shadow-2xl"
        sideOffset={8}
        align="end"
      >
        <div className="bg-surface-dialog p-4 pb-3">
          <DropdownMenuLabel className="p-0">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-border">
                {pfpUrl && (
                  <AvatarImage
                    src={pfpUrl}
                    alt={displayName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-semibold border-0">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </div>

        <DropdownMenuSeparator className="mx-0 bg-border" />

        <div className="bg-surface-dialog p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <CircleUserRound className="size-4 text-muted-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <UsersRound className="size-4 text-muted-foreground" />
              <span>Organization Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <Wallet className="size-4 text-muted-foreground" />
              <span>Billing & Plans</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-border" />

          <DropdownMenuGroup>
            <DropdownMenuItem className="hover:bg-transparent focus:bg-transparent p-2 cursor-default">
              <ToggleGroup
                type="single"
                value={theme}
                onValueChange={(value) => { if (value) setTheme(value); }}
                className="flex w-full items-center justify-evenly rounded-lg border border-border bg-surface-card p-0.5"
              >
                <ToggleGroupItem
                  value="light"
                  className="h-7 flex-1 justify-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground hover:bg-surface-active hover:text-foreground data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
                >
                  <Sun className="size-3.5" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  className="h-7 flex-1 justify-center gap-1.5 rounded-md px-3 text-xs text-muted-foreground hover:bg-surface-active hover:text-foreground data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
                >
                  <Moon className="size-3.5" />
                </ToggleGroupItem>
              </ToggleGroup>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <ShieldCheck className="size-4 text-muted-foreground" />
              <span>Security</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-border" />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <BookMarked className="size-4 text-muted-foreground" />
              <span>Documentation</span>
              <ExternalLink className="size-3 ml-auto text-text-secondary" />
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <MessageCircle className="size-4 text-muted-foreground" />
              <span>Send Feedback</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className={`${itemBaseStyle} ${itemHoverStyle}`}
            >
              <LifeBuoy className="size-4 text-muted-foreground" />
              <span>Help & Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleSignOut}
              className={`${itemBaseStyle} hover:bg-destructive/10 focus:bg-destructive/10 text-muted-foreground hover:text-destructive focus:text-destructive group`}
            >
              <LogOut className="size-4 group-hover:text-red-400" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </div>

        <div className="border-t border-border bg-surface-active px-4 py-2.5">
          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <span>Content v1.0.0</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Online
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
