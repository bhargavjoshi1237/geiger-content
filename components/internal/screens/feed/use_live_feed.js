"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feedEvents, feedNext, feedProfile, feedReset, feedSearch, feedSimilar, feedStatus } from "@/lib/supabase/feed_live";

const FLUSH_MS = 3000;
// On screen for less than this before moving on counts as a skip, otherwise as a dwell.
const SKIP_UNDER_MS = 1000;

// The reader's unsent engagement plus time on screen per item; activate() finalises the previous
// item once, as a dwell (≥1 s) or a skip. Plain mutable state outside React rendering.
function createSession() {
  let views = new Map();
  let active = null;
  let pending = [];
  let sent = new Set();
  const now = () => performance.now();
  const emit = (event) => pending.push(event);
  return {
    // Explicit actions count once per item and type.
    action(item, type) {
      if (sent.has(`${item.id}:${type}`)) return false;
      sent.add(`${item.id}:${type}`);
      emit({ postId: item.id, type, slot: item.slot });
      if (type === "hide") this.end(item.id);
      return true;
    },
    drain() {
      const out = pending;
      pending = [];
      return out;
    },
    activate(item) {
      if ((item?.id || null) === active) return;
      const prev = active && views.get(active);
      if (prev && !prev.done) {
        if (prev.since != null) prev.ms += now() - prev.since;
        prev.done = true;
        const ms = Math.round(prev.ms);
        emit({ postId: active, type: ms >= SKIP_UNDER_MS ? "dwell" : "skip", dwellMs: ms, slot: prev.slot });
      }
      active = item?.id || null;
      if (!item) return;
      const track = views.get(item.id);
      if (!track) views.set(item.id, { ms: 0, since: document.hidden ? null : now(), done: false, slot: item.slot });
      else if (!track.done && track.since == null) track.since = now();
    },
    // Pauses/resumes the clock of the item on screen (tab hidden/visible).
    visibility(hidden) {
      const track = active && views.get(active);
      if (!track || track.done) return;
      if (hidden && track.since != null) { track.ms += now() - track.since; track.since = null; }
      else if (!hidden && track.since == null) track.since = now();
    },
    end(id) {
      const track = views.get(id);
      if (track) track.done = true;
    },
    reset() {
      views = new Map();
      active = null;
      pending = [];
      sent = new Set();
    },
  };
}

// Live feed state for one reader: batches, the engagement queue (flushed every few seconds and before
// each next batch), per-item view timing, and similarity search. UI-agnostic; the Shorts screen drives it.
export function useLiveFeed(projectId) {
  const [status, setStatus] = useState(null);
  const [profileName, setProfileName] = useState("default");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [marks, setMarks] = useState({});
  const [explore, setExplore] = useState(null);
  const [session] = useState(createSession);
  const fetchingRef = useRef(false);
  // Bumped on reader switch/reset so a batch requested for the previous reader is dropped.
  const generation = useRef(0);

  const flush = useCallback(async () => {
    if (!projectId) return;
    const events = session.drain();
    if (!events.length) return;
    const result = await feedEvents(projectId, profileName, events);
    if (result.ok) setSummary(result.data.summary);
    else toast.error(result.error);
  }, [profileName, projectId, session]);

  const loadMore = useCallback(async () => {
    if (!projectId || fetchingRef.current) return;
    const gen = generation.current;
    fetchingRef.current = true;
    setFetching(true);
    // Learn from what was just seen before composing the next batch.
    await flush();
    const result = await feedNext(projectId, profileName);
    fetchingRef.current = false;
    setFetching(false);
    if (gen !== generation.current) return;
    if (result.ok) {
      setItems((prev) => {
        const have = new Set(prev.map((i) => i.id));
        return [...prev, ...result.data.items.filter((i) => !have.has(i.id))];
      });
      setSummary(result.data.summary);
    } else toast.error(result.error);
    setReady(true);
  }, [flush, profileName, projectId]);

  const clear = useCallback(() => {
    generation.current += 1;
    session.reset();
    setItems([]);
    setMarks({});
  }, [session]);

  // Status + profile, then the first batch, whenever the project or reader changes.
  useEffect(() => {
    if (!projectId) return undefined;
    let alive = true;
    generation.current += 1;
    Promise.all([feedStatus(projectId), feedProfile(projectId, profileName)]).then(([s, p]) => {
      if (!alive) return;
      if (s.ok) setStatus(s.data);
      if (p.ok) setSummary(p.data.summary);
      if (!s.ok || !p.ok) toast.error((s.ok ? p : s).error);
      clear();
      loadMore();
    });
    return () => { alive = false; };
  }, [profileName, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic flush; time on screen pauses while the tab is hidden.
  useEffect(() => {
    const timer = setInterval(() => { flush(); }, FLUSH_MS);
    const onVisibility = () => session.visibility(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [flush, session]);

  // The item now on screen (the previous one is finalised as a dwell or a skip).
  const setActiveItem = useCallback((item) => session.activate(item), [session]);

  // Explicit actions are sent once each; a hide also ends the item's view.
  const act = useCallback((item, type) => {
    if (session.action(item, type)) setMarks((m) => ({ ...m, [item.id]: { ...m[item.id], [type]: true } }));
  }, [session]);

  const showSimilar = useCallback(async (item) => {
    const title = `More like “${String(item.title).slice(0, 60)}”`;
    setExplore({ title, loading: true, results: [] });
    const result = await feedSimilar(projectId, item.id);
    setExplore({ title, loading: false, results: result.ok ? result.data.results : [], note: result.ok ? result.data.reason : result.error });
  }, [projectId]);

  const search = useCallback(async (query) => {
    const text = query.trim();
    if (!text) return;
    const title = `Images matching “${text}”`;
    setExplore({ title, loading: true, results: [] });
    const result = await feedSearch(projectId, text);
    setExplore({ title, loading: false, results: result.ok ? result.data.results : [], note: result.ok ? null : result.error });
  }, [projectId]);

  const reset = useCallback(async () => {
    const result = await feedReset(projectId, profileName);
    if (!result.ok) return toast.error(result.error);
    toast.success(`Reader “${profileName}” starts fresh`);
    clear();
    setSummary(result.data.summary);
    loadMore();
  }, [clear, loadMore, profileName, projectId]);

  const switchReader = useCallback((name) => {
    const next = name.trim() || "default";
    if (next === profileName) return;
    setReady(false);
    setProfileName(next);
  }, [profileName]);

  return { status, summary, profileName, items, ready, fetching, marks, explore, loadMore, setActiveItem, act, showSimilar, search, reset, switchReader };
}
