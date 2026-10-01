"use client";

import React, { useMemo, useState } from "react";
import { Plug } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  EmptyState,
  ScreenHeader,
  SearchInput,
  SectionCard,
  SettingRow,
  SettingsList,
  StatsBar,
  Toolbar,
} from "@/components/internal/shared/screen_kit";
import { Button } from "@geiger/ui/button";

// Static plugin registry. Enable toggles are in-memory React state on purpose:
// installation lifecycle (OAuth, scopes, secrets) lands with a later phase,
// so nothing here persists.
const PLUGINS = [
  {
    id: "vercel-deploy",
    name: "Vercel Deploy Hook",
    description: "Rebuild the storefront on every publish.",
  },
  {
    id: "slack-notify",
    name: "Slack Notifications",
    description: "Post to #content when entries move to review.",
  },
  {
    id: "algolia-search",
    name: "Algolia Search Sync",
    description: "Mirror published entries into a search index.",
  },
  {
    id: "cloudinary-media",
    name: "Cloudinary Media",
    description: "Transform and serve assets through a CDN.",
  },
  {
    id: "transifex-i18n",
    name: "Transifex Sync",
    description: "Push new strings out for translation on publish.",
  },
  {
    id: "zapier-bridge",
    name: "Zapier Bridge",
    description: "Trigger zaps from publish and webhook events.",
  },
];

export function AppsScreen() {
  const [enabled, setEnabled] = useState({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PLUGINS;
    return PLUGINS.filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(q),
    );
  }, [search]);

  const enabledCount = useMemo(
    () => PLUGINS.filter((p) => enabled[p.id]).length,
    [enabled],
  );

  const stats = useMemo(
    () => [
      { label: "Plugins", value: String(PLUGINS.length), footer: "Static registry" },
      { label: "Enabled", value: String(enabledCount), footer: "This session only" },
      {
        label: "Disabled",
        value: String(PLUGINS.length - enabledCount),
        footer: "One click to try",
      },
    ],
    [enabledCount],
  );

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Apps & Plugins"
        description="Extend the workspace. Toggles are session-only until install lifecycle lands."
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <div />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plugins…"
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={Plug}
            title="No plugins match your filters"
            description="Try clearing the search."
          />
        </div>
      ) : (
        <SectionCard
          title="Plugin registry"
          description="Static catalog — enabling stages the plugin for this session."
        >
          <SettingsList>
            {filtered.map((p) => {
              const on = Boolean(enabled[p.id]);
              return (
                <SettingRow
                  key={p.id}
                  title={p.name}
                  description={p.description}
                  icon={Plug}
                  control={
                    <Button
                      size="sm"
                      variant={on ? "default" : "outline"}
                      className={
                        on
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                      }
                      onClick={() =>
                        setEnabled((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                      }
                    >
                      {on ? "Enabled" : "Enable"}
                    </Button>
                  }
                />
              );
            })}
          </SettingsList>
        </SectionCard>
      )}
    </MainScreenWrapper>
  );
}

export default AppsScreen;
