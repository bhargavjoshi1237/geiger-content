"use client";

import React, { useMemo } from "react";
import { ArrowRight, Hammer } from "lucide-react";

import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  ScreenHeader,
  SectionCard,
} from "@geiger/ui/screen-kit";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { workspaceNav } from "@/components/internal/sidebar/sidebar_nav";
import { isScreenImplemented } from "./registry";

// The nav group a title belongs to, so a placeholder can offer its siblings.
function findSection(title) {
  for (const item of workspaceNav) {
    if (item.title === title) return item;
    if (item.subItems?.some((sub) => sub.title === title)) return item;
  }
  return null;
}

// One built entry point per nav group — the fallback when nothing in this
// screen's own group is ready yet.
function builtEntryPoints() {
  return workspaceNav.flatMap((item) => {
    const built = (item.subItems || []).filter((sub) =>
      isScreenImplemented(sub.title),
    );
    return built.length ? [{ group: item.title, ...built[0] }] : [];
  });
}

function DestinationButton({ title, icon: Icon, onNavigate }) {
  return (
    <Button
      variant="outline"
      className="h-9 justify-start gap-2 border-border bg-surface-card text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      onClick={() => onNavigate?.(title)}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {title}
      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
    </Button>
  );
}

// Placeholder for every nav title without a registered screen. It shares the
// ScreenHeader frame with real screens so the shell never changes shape, states
// plainly that the area isn't built, and routes the user somewhere that is.
export function ComingSoonScreen({ title, description, details, onNavigate }) {
  const section = useMemo(() => findSection(title), [title]);

  const siblings = useMemo(
    () =>
      (section?.subItems || []).filter(
        (sub) => sub.title !== title && isScreenImplemented(sub.title),
      ),
    [section, title],
  );

  const fallbacks = useMemo(
    () => (siblings.length ? [] : builtEntryPoints()),
    [siblings.length],
  );

  const destinations = siblings.length ? siblings : fallbacks;
  const destinationsTitle = siblings.length
    ? `Available in ${section.title}`
    : "Built and ready";
  const destinationsDescription = siblings.length
    ? "Other screens in this area that are already wired to live data."
    : "The areas of the workspace that are implemented today.";

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title={title}
        description={description}
        actions={<Badge variant="warning">Planned</Badge>}
      />

      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-card text-text-secondary">
          <Hammer className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-foreground">
            {title} has not been built yet
          </p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-text-secondary">
            {details}
          </p>
        </div>
        {section?.title && section.title !== title ? (
          <span className="text-xs text-text-tertiary">
            Part of {section.title}
          </span>
        ) : null}
      </div>

      {destinations.length ? (
        <SectionCard
          title={destinationsTitle}
          description={destinationsDescription}
        >
          <div className="flex flex-wrap gap-2">
            {destinations.map((item) => (
              <DestinationButton
                key={item.title}
                title={item.title}
                icon={item.icon}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </MainScreenWrapper>
  );
}

export default ComingSoonScreen;
