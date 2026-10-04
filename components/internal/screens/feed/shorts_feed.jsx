"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, ChartNoAxesColumn, ChevronDown, ChevronUp, ExternalLink, ImageOff, Loader2, Rss, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { EmptyState } from "@geiger/ui/screen-kit";
import { FEED_SLOT_MAP } from "@/components/internal/screens/recommendations/constants";
import { useProject } from "@/context/project-context";
import { cn } from "@geiger/ui/lib/utils";
import { InsightsPanel } from "./insights_panel";
import { useLiveFeed } from "./use_live_feed";

// Load the next batch when this many shorts are left.
const PREFETCH_REMAINING = 4;
// Only shorts this close to the current one load their image.
const IMAGE_WINDOW = 2;

// Live feed in the desktop YouTube Shorts layout: one 9:16 short per screen with scroll-snap, the action
// rail beside it, up/down buttons and arrow keys, and an insights panel that slides in like comments.
export function FeedShortsScreen() {
  const { projectId } = useProject();
  const feed = useLiveFeed(projectId);
  const { items, ready, fetching, loadMore, setActiveItem } = feed;
  const [activeId, setActiveId] = useState(null);
  // A cleared list (reader switch/reset) has no active id → back to the first short.
  const activeIndex = Math.max(0, items.findIndex((i) => i.id === activeId));
  const [panelOpen, setPanelOpen] = useState(false);
  const scroller = useRef(null);
  const slides = useRef([]);

  // The short ≥60% in view is the current one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActiveId(e.target.dataset.id);
    }, { root, threshold: 0.6 });
    slides.current.slice(0, items.length).forEach((node) => node && io.observe(node));
    return () => io.disconnect();
  }, [items.length]);

  // Time on screen per short, and the next batch before the reader runs out.
  useEffect(() => { setActiveItem(items[activeIndex]); }, [activeIndex, items, setActiveItem]);
  useEffect(() => {
    if (ready && items.length && activeIndex >= items.length - PREFETCH_REMAINING) loadMore();
  }, [activeIndex, items.length, ready, loadMore]);
  const go = useCallback((delta) => {
    const target = Math.max(0, Math.min(items.length - 1, activeIndex + delta));
    slides.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeIndex, items.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable=true]")) return;
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) { e.preventDefault(); go(1); }
      if (["ArrowUp", "PageUp", "k"].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Topic/subtopic display names from the items seen so far.
  const names = useMemo(() => {
    const out = {};
    for (const i of items) {
      out[i.topicId] = i.topicName;
      out[`${i.topicId}/${i.subtopicId}`] = `${i.topicName} › ${i.subtopicName}`;
    }
    return out;
  }, [items]);

  const similar = (item) => {
    setPanelOpen(true);
    feed.showSimilar(item);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to Feed Lab">
            <Link href={projectId ? `/project/${projectId}/feedlab` : "/project"}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-base font-semibold">Feed</h1>
          <Badge variant="outline">Live test</Badge>
          <span className="hidden truncate text-sm text-text-tertiary md:inline">
            Reader “{feed.profileName}”{feed.status ? ` · ${feed.status.embedded.toLocaleString()} embedded images` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-text-tertiary lg:inline">↑ ↓ or scroll to move</span>
          <Button variant="ghost" onClick={() => setPanelOpen((o) => !o)} aria-pressed={panelOpen}>
            <ChartNoAxesColumn className="h-4 w-4" /> Insights
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {!ready && !items.length ? (
            <div className="flex h-full items-center justify-center" role="status">
              <LogoLoading size={88} aria-label="Loading feed" />
            </div>
          ) : !items.length ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState icon={Rss} title="Nothing to show" description="The catalog is empty or this reader has seen everything." action={<Button variant="ghost" onClick={feed.reset}>Reset reader</Button>} />
            </div>
          ) : (
            <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {items.map((item, i) => (
                <section
                  key={item.id}
                  ref={(node) => { slides.current[i] = node; }}
                  data-id={item.id}
                  className="flex h-full snap-start snap-always items-center justify-center gap-4 px-4 py-4"
                  aria-label={`Short ${i + 1}: ${item.title}`}
                >
                  <ShortCard item={item} marks={feed.marks[item.id] || {}} near={Math.abs(i - activeIndex) <= IMAGE_WINDOW} />
                  <ActionRail item={item} marks={feed.marks[item.id] || {}} onAct={feed.act} onSimilar={similar} onInsights={() => setPanelOpen((o) => !o)} />
                </section>
              ))}
              {fetching && (
                <div className="flex h-24 snap-start items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" aria-label="Loading more" />
                </div>
              )}
            </div>
          )}
          {items.length > 0 && (
            <div className="pointer-events-none absolute inset-y-0 right-6 hidden flex-col items-center justify-center gap-4 md:flex">
              <NavButton label="Previous short" onClick={() => go(-1)} disabled={activeIndex === 0}><ChevronUp className="h-6 w-6" /></NavButton>
              <NavButton label="Next short" onClick={() => go(1)} disabled={activeIndex >= items.length - 1 && !fetching}><ChevronDown className="h-6 w-6" /></NavButton>
            </div>
          )}
        </div>
        {panelOpen && (
          <aside className="hidden w-[400px] shrink-0 border-l border-border bg-surface-subtle md:block">
            <InsightsPanel feed={feed} names={names} onClose={() => setPanelOpen(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}

function ShortCard({ item, marks, near }) {
  const [broken, setBroken] = useState(false);
  const slot = FEED_SLOT_MAP[item.slot] || FEED_SLOT_MAP.fresh;
  return (
    <article className="relative aspect-[9/16] h-full max-w-[calc(100vw-7rem)] overflow-hidden rounded-xl bg-black shadow-lg">
      {near && !broken && (
        <>
          {/* Blurred copy fills the 9:16 frame behind non-vertical images, like Shorts does for landscape video. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title} onError={() => setBroken(true)} className={cn("relative h-full w-full object-contain transition-opacity", marks.hide && "opacity-20")} />
        </>
      )}
      {broken && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/60"><ImageOff className="h-6 w-6" /> Image no longer available</div>
      )}
      {marks.hide && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-white/80">Hidden — the feed will show less like this.</div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-3">
        <Badge variant={slot.variant} className="pointer-events-auto bg-black/40 backdrop-blur" title={item.reason}>{slot.label}</Badge>
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur">depth {item.depth}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold uppercase">{item.subreddit?.[0]}</span>
          <span className="truncate text-sm font-medium">r/{item.subreddit}</span>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-black">{item.topicName}</span>
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
        {item.description && <p className="line-clamp-2 text-xs leading-snug text-white/70">{item.description}</p>}
        {item.tags?.length > 0 && <p className="truncate text-xs font-medium text-white/90">{item.tags.slice(0, 4).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}</p>}
        <p className="truncate text-[11px] text-white/50">{item.subtopicName} · {item.horizontalName} — {item.reason}</p>
      </div>
    </article>
  );
}

function RailButton({ label, onClick, active, activeClass, children, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className="group flex flex-col items-center gap-1 disabled:opacity-40">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-foreground transition-colors group-hover:bg-surface-hover", active && activeClass)}>{children}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </button>
  );
}

function ActionRail({ item, marks, onAct, onSimilar, onInsights }) {
  return (
    <div className="flex h-full shrink-0 flex-col items-center justify-end gap-4 pb-2">
      <RailButton label="Like" onClick={() => onAct(item, "like")} active={marks.like} activeClass="bg-foreground text-background group-hover:bg-foreground">
        <ThumbsUp className={cn("h-5 w-5", marks.like && "fill-current")} />
      </RailButton>
      <RailButton label="Not for me" onClick={() => onAct(item, "hide")} active={marks.hide} activeClass="bg-foreground text-background group-hover:bg-foreground">
        <ThumbsDown className={cn("h-5 w-5", marks.hide && "fill-current")} />
      </RailButton>
      <RailButton label="Save" onClick={() => onAct(item, "save")} active={marks.save} activeClass="bg-foreground text-background group-hover:bg-foreground">
        <Bookmark className={cn("h-5 w-5", marks.save && "fill-current")} />
      </RailButton>
      <RailButton label="Similar" onClick={() => onSimilar(item)} disabled={!item.embedded}>
        <Sparkles className="h-5 w-5" />
      </RailButton>
      <RailButton label="Reddit" onClick={() => window.open(item.permalink, "_blank", "noopener,noreferrer")} disabled={!item.permalink}>
        <ExternalLink className="h-5 w-5" />
      </RailButton>
      <RailButton label="Insights" onClick={onInsights}>
        <ChartNoAxesColumn className="h-5 w-5" />
      </RailButton>
    </div>
  );
}

function NavButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-card text-foreground transition-colors hover:bg-surface-hover disabled:opacity-30">
      {children}
    </button>
  );
}

export default FeedShortsScreen;
