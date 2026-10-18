"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { PlaygroundFrame } from "@/components/landing/PlaygroundFrame";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Landing showcase (mirrors geiger-flow FlowPlaygroundShowcase): intro copy + CTA over a themed photo wash, the live
// workspace below in an iframe of /playground.
export default function ContentPlaygroundShowcase({
  ctaHref = "/project",
  ctaLabel = "Open the workspace",
  backgroundImage,
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-surface-subtle bg-cover bg-center bg-no-repeat p-3 sm:rounded-3xl sm:p-6 md:p-8 xl:p-10"
      style={
        backgroundImage
          ? { backgroundImage: `url('${backgroundImage}')` }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-background/75" />
      <div className="relative z-10 flex flex-col gap-6 sm:gap-10">
        <div className="mx-auto mb-4 mt-4 flex w-[92%] flex-col items-start gap-4 sm:mb-6 sm:mt-6 sm:w-[90%]">
          <h3 className="text-3xl font-semibold leading-tight text-foreground">
            Try the full Content workspace in real time.
          </h3>
          <p className="max-w-lg text-muted-foreground">
            This playground runs live on the page with the complete workspace —
            sidebar navigation, the topbar, and every screen, filled with
            Halcyon Studio&apos;s content. Edit anything; it resets when you reload.
          </p>
          <Button asChild className="rounded-full">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative rounded-2xl border border-border/80 bg-background/70 p-2 shadow-2xl backdrop-blur-md sm:p-3">
          <PlaygroundFrame src={`${BASE_PATH}/playground`} title="Content workspace playground" className="rounded-xl" />
        </div>
      </div>
    </section>
  );
}
