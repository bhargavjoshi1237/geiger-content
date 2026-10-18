"use client";

import dynamic from "next/dynamic";
import { LogoLoading } from "@geiger/ui/logo-loading";

// Client-only: the playground runs the whole workspace in the browser on an in-memory database.
const ContentPlayground = dynamic(
  () => import("@/components/ContentPlayground").then((mod) => mod.ContentPlayground),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <LogoLoading size={80} />
      </div>
    ),
  },
);

export default ContentPlayground;
