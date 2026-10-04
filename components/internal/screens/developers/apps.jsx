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
} from "@geiger/ui/screen-kit";
import { Button } from "@geiger/ui/button";
import { Switch } from "@geiger/ui/switch";

// Static plugin registry; toggles are session-only state until the install lifecycle (OAuth, scopes, secrets) lands.
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

      <StatsBar stats={stats} columns={3} />

      <Toolbar>
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
            action={
              <Button
                variant="outline"
                className="border-border bg-transparent text-muted-foreground hover:bg-surface-active hover:text-foreground"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            }
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
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-text-secondary sm:inline">
                        {on ? "Enabled" : "Off"}
                      </span>
                      <Switch
                        checked={on}
                        aria-label={`Enable ${p.name}`}
                        onCheckedChange={() =>
                          setEnabled((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                        }
                      />
                    </div>
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
