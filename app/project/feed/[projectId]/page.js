"use client";

import React, { Suspense } from "react";
import { FeedShortsScreen } from "@/components/internal/screens/feed/shorts_feed";
import { ProjectProvider } from "@/context/project-context";

// /project/feed/<projectId>: the live test feed, full screen in the YouTube Shorts layout (no workspace
// sidebar). The static "feed" segment wins over /project/[projectId], so it never collides with a project id.
export default function ProjectFeedPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] w-full bg-background" />}>
      <ProjectProvider>
        <FeedShortsScreen />
      </ProjectProvider>
    </Suspense>
  );
}
