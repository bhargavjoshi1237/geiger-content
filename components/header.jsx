"use client";

import { useEffect, useState } from "react";
import { SuiteHeader } from "@geiger/ui/suite-header";
import { getUser } from "@/lib/supabase/user";
import { ProfileDropdown } from "@/components/internal/topbar/dialogue/profile_dropdown";

// Landing header on the suite session (geiger-dash's Supabase auth cookie, shared across zones), like geiger-flow's Header.
// Signed in → profile menu; signed out → SuiteHeader's "Sign In" to dash's /login. dashboardHref defaults to dash's /org.
export function Header({ dashboardHref }) {
  const [user, setUser] = useState(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    getUser()
      .catch(() => null)
      .then((u) => active && setUser(u))
      .finally(() => active && setResolved(true));
    return () => {
      active = false;
    };
  }, []);

  // Placeholder until the session resolves so a signed-in user never sees "Sign In" flash.
  const profile = user ? (
    <ProfileDropdown user={user} />
  ) : resolved ? null : (
    <div className="h-8 w-8 rounded-full border border-border bg-surface-subtle" />
  );

  return (
    <SuiteHeader userId={user?.id} profile={profile} dashboardHref={dashboardHref} />
  );
}
