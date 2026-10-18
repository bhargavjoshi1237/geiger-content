"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, BookCheck, Bookmark, ChartNoAxesColumn, ChevronDown, ChevronUp, Compass, Ellipsis, ExternalLink, EyeOff, GraduationCap, ImageOff, Loader2, Rss, Share2, SmilePlus, Sparkles, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";
import { LogoLoading } from "@geiger/ui";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@geiger/ui/dropdown-menu";
import { EmptyState } from "@geiger/ui/screen-kit";
import { Sheet, SheetContent, SheetTitle } from "@geiger/ui/sheet";
import { FEED_SLOT_MAP, formatPostAge } from "@/components/internal/screens/recommendations/constants";
import { useProject } from "@/context/project-context";
import { cn } from "@geiger/ui/lib/utils";
import { HIDE_REASON_BY_ID, NON_PROFILED_COPY, PRIVATE_SESSION_COPY, REACTION_BY_ID } from "./constants";
import { HideReasonSheet } from "./hide_reason_sheet";
import { InsightsPanel } from "./insights_panel";
import { ProbeCard } from "./probe_card";
import { ReactionPicker } from "./reaction_picker";
import { SteerComposer } from "./steer_composer";
import { useLiveFeed } from "./use_live_feed";

// Load the next batch when this many shorts are left.
const PREFETCH_REMAINING = 4;
// Only shorts this close to the current one load their image.
const IMAGE_WINDOW = 2;
// The insights panel is an aside from md up and a bottom sheet below.
const DESKTOP_QUERY = "(min-width: 768px)";
const MARKED = "bg-foreground text-background group-hover:bg-foreground";

const subscribeDesktop = (onChange) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const useIsDesktop = () => useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches, () => true);

// Live feed in the desktop YouTube Shorts layout: one 9:16 short per screen with scroll-snap, the action
// rail beside it, up/down buttons and arrow keys, in-feed probe questions, and an insights panel that
// slides in like comments (a bottom sheet on mobile).
export function FeedShortsScreen() {
  const { projectId } = useProject();
  const feed = useLiveFeed(projectId);
  const { items, ready, fetching, loadMore, setActiveItem, probe } = feed;
  const isDesktop = useIsDesktop();

  // Shorts plus the probe card, which sits right after the short it was asked on.
  const slides = useMemo(() => {
    const out = items.map((item, index) => ({ key: item.id, item, index }));
    if (probe && out.length) {
      const at = out.findIndex((s) => s.key === probe.afterId);
      out.splice(at < 0 ? 1 : at + 1, 0, { key: `probe:${probe.id}`, probe });
    }
    return out;
  }, [items, probe]);
  const slideKeys = slides.map((s) => s.key).join("|");

  const [activeKey, setActiveKey] = useState(null);
  // A cleared list (reader switch/reset) has no active key → back to the first short.
  const activeSlide = Math.max(0, slides.findIndex((s) => s.key === activeKey));
  // The probe card counts as the short before it for prefetching and image loading.
  const activeIndex = useMemo(() => slides.slice(0, activeSlide + 1).findLast((s) => s.item)?.index ?? 0, [activeSlide, slides]);
  const [panelOpen, setPanelOpen] = useState(false);
  const scroller = useRef(null);
  const slideNodes = useRef([]);

  // The slide ≥60% in view is the current one.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActiveKey(e.target.dataset.key);
    }, { root, threshold: 0.6 });
    slideNodes.current.slice(0, slideKeys.split("|").length).forEach((node) => node && io.observe(node));
    return () => io.disconnect();
  }, [slideKeys]);

  // Time on screen per short (none while the probe card is up), and the next batch before the reader runs out.
  const activeItem = slides[activeSlide]?.item || null;
  useEffect(() => { setActiveItem(activeItem); }, [activeItem, setActiveItem]);
  useEffect(() => {
    if (ready && items.length && activeIndex >= items.length - PREFETCH_REMAINING) loadMore();
  }, [activeIndex, items.length, ready, loadMore]);
  const go = useCallback((delta) => {
    const target = Math.max(0, Math.min(slides.length - 1, activeSlide + delta));
    slideNodes.current[target]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSlide, slides.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, [contenteditable=true], [role=menu], [role=dialog]")) return;
      if (["ArrowDown", "PageDown", "j"].includes(e.key)) { e.preventDefault(); go(1); }
      if (["ArrowUp", "PageUp", "k"].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Topic/subtopic display names from the items seen so far, then the server's names for everything else.
  const summaryNames = feed.summary?.names;
  const names = useMemo(() => {
    const out = { ...summaryNames };
    for (const i of items) {
      out[i.topicId] = i.topicName;
      out[`${i.topicId}/${i.subtopicId}`] = `${i.topicName} › ${i.subtopicName}`;
    }
    return out;
  }, [items, summaryNames]);

  const similar = (item) => {
    setPanelOpen(true);
    feed.showSimilar(item);
  };

  // Answering or dismissing removes the probe slide; the next short takes its place on screen.
  const closeProbe = (handler) => (...args) => {
    const at = slides.findIndex((s) => s.probe);
    if (at >= 0 && at === activeSlide) setActiveKey(slides[at + 1]?.key ?? slides[at - 1]?.key ?? null);
    handler(...args);
  };

  const panel = (variant) => <InsightsPanel feed={feed} names={names} onClose={() => setPanelOpen(false)} variant={variant} />;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-2 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to Feed Lab">
            <Link href={projectId ? `/project/${projectId}/feedlab` : "/project"}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-base font-semibold">Feed</h1>
          <Badge variant="outline" className="hidden sm:inline-flex">Live test</Badge>
          {feed.summary?.nonProfiled && <Badge variant="warning" title={NON_PROFILED_COPY.description}>{NON_PROFILED_COPY.badge}</Badge>}
          {feed.summary?.privateSession && <Badge variant="purple" title={PRIVATE_SESSION_COPY.description}><EyeOff /> {PRIVATE_SESSION_COPY.badge}</Badge>}
          <span className="hidden truncate text-sm text-text-tertiary lg:inline">
            Reader “{feed.profileName}”{feed.status ? ` · ${feed.status.embedded.toLocaleString()} embedded images` : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <span className="hidden text-xs text-text-tertiary xl:inline">↑ ↓ or scroll to move</span>
          {feed.canUndo && (
            <Button variant="ghost" size="icon" onClick={feed.undoLast} aria-label="Undo last action" title="Undo last action">
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          <SteerComposer feed={feed} />
          <Button variant="ghost" onClick={() => setPanelOpen((o) => !o)} aria-pressed={panelOpen} aria-label="Insights">
            <ChartNoAxesColumn className="h-4 w-4" /> <span className="hidden sm:inline">Insights</span>
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
              {slides.map((slide, s) => (
                <section
                  key={slide.key}
                  ref={(node) => { slideNodes.current[s] = node; }}
                  data-key={slide.key}
                  className="flex h-full snap-start snap-always items-center justify-center gap-2 px-2 py-4 sm:gap-4 sm:px-4"
                  aria-label={slide.item ? `Short ${slide.index + 1}: ${slide.item.title}` : "Question about your feed"}
                >
                  {slide.item ? (
                    <>
                      <ShortCard item={slide.item} marks={feed.marks[slide.item.id] || {}} near={Math.abs(slide.index - activeIndex) <= IMAGE_WINDOW} onUnhide={feed.hide} />
                      <ActionRail item={slide.item} marks={feed.marks[slide.item.id] || {}} feed={feed} onSimilar={similar} onInsights={() => setPanelOpen((o) => !o)} />
                    </>
                  ) : (
                    <ProbeCard probe={slide.probe} onAnswer={closeProbe(feed.answerProbe)} onDismiss={closeProbe(feed.dismissProbe)} />
                  )}
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
              <NavButton label="Previous short" onClick={() => go(-1)} disabled={activeSlide === 0}><ChevronUp className="h-6 w-6" /></NavButton>
              <NavButton label="Next short" onClick={() => go(1)} disabled={activeSlide >= slides.length - 1 && !fetching}><ChevronDown className="h-6 w-6" /></NavButton>
            </div>
          )}
        </div>
        {panelOpen && isDesktop && (
          <aside className="w-[400px] shrink-0 border-l border-border bg-surface-subtle">
            {panel("aside")}
          </aside>
        )}
      </div>
      <Sheet open={panelOpen && !isDesktop} onOpenChange={setPanelOpen}>
        <SheetContent side="bottom" showCloseButton={false} aria-describedby={undefined} className="h-[85dvh] gap-0 rounded-t-xl bg-surface-subtle p-0">
          <SheetTitle className="sr-only">Insights</SheetTitle>
          {panel("sheet")}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ShortCard({ item, marks, near, onUnhide }) {
  const [broken, setBroken] = useState(false);
  const slot = FEED_SLOT_MAP[item.slot] || FEED_SLOT_MAP.fresh;
  const hidden = marks.hide ? HIDE_REASON_BY_ID[marks.hide] || null : null;
  const dim = Boolean(marks.hide) && (hidden ? hidden.dim : true);
  const emotion = REACTION_BY_ID[item.emotion];
  return (
    <article className="relative aspect-[9/16] h-full max-w-[calc(100vw-5rem)] overflow-hidden rounded-xl bg-black shadow-lg md:max-w-[calc(100vw-7rem)]">
      {near && !broken && (
        <>
          {/* Blurred copy fills the 9:16 frame behind non-vertical images, like Shorts does for landscape video. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.title} onError={() => setBroken(true)} className={cn("relative h-full w-full object-contain transition-opacity", dim && "opacity-20")} />
        </>
      )}
      {broken && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/60"><ImageOff className="h-6 w-6" /> Image no longer available</div>
      )}
      {marks.hide && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="rounded-lg bg-black/60 px-3 py-2 text-sm text-white/90 backdrop-blur">{hidden?.hiddenText || "Hidden — the feed will show less like this."}</p>
          <Button size="xs" variant="outline" onClick={() => onUnhide(item, marks.hide === true ? undefined : marks.hide)}><Undo2 /> Undo</Button>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={slot.variant} className="pointer-events-auto bg-black/40 backdrop-blur" title={item.reason}>{slot.label}</Badge>
          {item.steered && <Badge variant="info" className="pointer-events-auto bg-black/40 backdrop-blur" title={item.reason}><Compass /> Requested</Badge>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur">depth {item.depth}{item.createdAt ? ` · ${formatPostAge(item.createdAt)}` : ""}</span>
          {item.level && (
            <span className="pointer-events-auto rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur" title={item.level.estimated ? "Difficulty estimated from the post's type" : "Difficulty labelled from the image"}>
              level {item.level.value}{item.level.estimated ? " · est." : ""}
            </span>
          )}
          {emotion && (
            <span className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white/80 backdrop-blur" title="The feeling this post usually evokes">
              <emotion.icon className="h-3 w-3" /> {emotion.label}
            </span>
          )}
        </div>
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

// One rail action; spreads extra props and the ref so it can be a popover/menu trigger (asChild).
function RailButton({ label, active, activeClass = MARKED, children, className, ref, ...props }) {
  return (
    <button ref={ref} type="button" className={cn("group flex flex-col items-center gap-1 disabled:opacity-40", className)} {...props}>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-card text-foreground transition-colors group-hover:bg-surface-hover md:h-12 md:w-12 dark:border-transparent", active && activeClass)}>{children}</span>
      <span className="text-[11px] text-text-secondary md:text-xs">{label}</span>
    </button>
  );
}

function ActionRail({ item, marks, feed, onSimilar, onInsights }) {
  const reaction = REACTION_BY_ID[marks.reaction];
  const ReactionIcon = reaction?.icon || SmilePlus;
  // Knew/learned are precise only on items with a labelled difficulty; elsewhere they still count, lightly.
  const labelled = item.level?.estimated === false;
  const levelHint = labelled ? null : "Difficulty not labelled — counts as a light signal";
  return (
    <div className="flex h-full shrink-0 flex-col items-center justify-end gap-3 pb-2 md:gap-4">
      <RailButton label="Like" onClick={() => feed.toggle(item, "like")} aria-pressed={Boolean(marks.like)} active={marks.like}>
        <ThumbsUp className={cn("h-5 w-5", marks.like && "fill-current")} />
      </RailButton>
      <ReactionPicker value={marks.reaction} onPick={(emotion) => feed.react(item, emotion)}>
        <RailButton label={reaction?.label || "React"} active={Boolean(reaction)} activeClass="bg-surface-active">
          <ReactionIcon className={cn("h-5 w-5", reaction?.tone)} />
        </RailButton>
      </ReactionPicker>
      <HideReasonSheet value={marks.hide} onPick={(reason) => feed.hide(item, reason)}>
        <RailButton label="Not for me" active={Boolean(marks.hide)}>
          <ThumbsDown className={cn("h-5 w-5", marks.hide && "fill-current")} />
        </RailButton>
      </HideReasonSheet>
      <RailButton label="Save" onClick={() => feed.toggle(item, "save")} aria-pressed={Boolean(marks.save)} active={marks.save}>
        <Bookmark className={cn("h-5 w-5", marks.save && "fill-current")} />
      </RailButton>
      <RailButton label="Share" onClick={() => feed.share(item)} disabled={!item.permalink} active={marks.shared}>
        <Share2 className="h-5 w-5" />
      </RailButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <RailButton label="More"><Ellipsis className="h-5 w-5" /></RailButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left" align="end" className="w-60">
          <DropdownMenuItem inset onSelect={() => onSimilar(item)} disabled={!item.embedded}><Sparkles /> Similar images</DropdownMenuItem>
          <DropdownMenuItem inset onSelect={() => feed.outbound(item)} disabled={!item.permalink}><ExternalLink /> Open on Reddit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={Boolean(marks.knew)} onSelect={() => feed.knewThis(item)} className="items-start">
            <BookCheck className="mt-0.5 text-muted-foreground" />
            <span className="flex flex-col">I knew this{levelHint && <span className="text-xs text-text-tertiary">{levelHint}</span>}</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={Boolean(marks.learned)} onSelect={() => feed.learned(item)} className="items-start">
            <GraduationCap className="mt-0.5 text-muted-foreground" />
            <span className="flex flex-col">I learned something{levelHint && <span className="text-xs text-text-tertiary">{levelHint}</span>}</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem inset onSelect={onInsights}><ChartNoAxesColumn /> Insights</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-card text-foreground transition-colors hover:bg-surface-hover disabled:opacity-30 dark:border-transparent">
      {children}
    </button>
  );
}

export default FeedShortsScreen;
