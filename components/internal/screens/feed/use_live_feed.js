"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { feedEvents, feedExclude, feedNext, feedProbe, feedProfile, feedReset, feedSearch, feedSettings, feedSimilar, feedStatus, feedSteering } from "@/lib/supabase/feed_live";
import { FEED_RECENCY_MAP } from "@/components/internal/screens/recommendations/constants";
import { HIDE_REASON_BY_ID, REACTION_BY_ID, RESET_SCOPE_META } from "./constants";

const FLUSH_MS = 3000;
// On screen for less than this before moving on counts as a skip, otherwise as a dwell.
const SKIP_UNDER_MS = 1000;
// The events route accepts at most this many per request.
const MAX_BATCH = 50;
// The server keeps undoable events in its journal for 30 minutes.
const UNDO_WINDOW_MS = 30 * 60000;
const UNDO_TOAST_ID = "feed-undo";
// Settings merged one level deep, like lib/feed/settings.mjs mergeSettings.
const NESTED_SETTINGS = ["rabbitHole", "topics", "emotionDials", "depth", "signalWeights"];
// The cleared value of each mark, set when its action is undone.
const CLEARED = { like: false, save: false, hide: false, reaction: null, knew: false, learned: false, shared: false };
const MARK_TYPE = { like: "like", save: "save", knew: "knew_this", learned: "learned" };

const newEid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

// Optimistic copy of the server's settings merge (mutes win over boosts).
function mergeSettingsPatch(current, patch) {
  const next = { ...current, ...patch };
  for (const key of NESTED_SETTINGS) if (isObject(patch[key])) next[key] = { ...(isObject(current?.[key]) ? current[key] : {}), ...patch[key] };
  if (isObject(next.topics) && Array.isArray(next.topics.mute)) next.topics = { ...next.topics, boost: (next.topics.boost || []).filter((id) => !next.topics.mute.includes(id)) };
  return next;
}

// The reader's unsent engagement plus time on screen per item; activate() finalises the previous
// item once, as a dwell (≥1 s) or a skip. Undoable actions carry a client eid, remembered per item mark
// so a second tap (or the toast's Undo) can send {type:"undo", of: eid}. Plain mutable state outside React.
function createSession() {
  let views = new Map();
  let active = null;
  let pending = [];
  let retried = new WeakSet();
  let owned = new Map();
  let undoable = [];
  const now = () => performance.now();
  const emit = (event) => pending.push(event);
  const markKey = (id, mark) => `${id}:${mark}`;
  return {
    // Queues one event; undoable ones get an eid remembered (with the mark's value) against the item's mark.
    send(item, event, mark = null, value = true) {
      const eid = mark ? newEid() : null;
      emit({ postId: item.id, slot: item.slot, ...event, ...(eid ? { eid } : {}) });
      if (event.type === "hide") this.end(item.id);
      if (mark) {
        owned.set(markKey(item.id, mark), { eid, value });
        undoable.push({ eid, itemId: item.id, mark, at: Date.now() });
      }
      return eid;
    },
    // The live value of an item's mark (source of truth for rapid taps between renders).
    markValue: (itemId, mark) => owned.get(markKey(itemId, mark))?.value ?? null,
    // Undoes the remembered action behind an item's mark; false when there is none.
    revert(itemId, mark) {
      const key = markKey(itemId, mark);
      const eid = owned.get(key)?.eid;
      if (!eid) return false;
      owned.delete(key);
      undoable = undoable.filter((u) => u.eid !== eid);
      emit({ postId: itemId, type: "undo", of: eid });
      return true;
    },
    // The undoable action for an eid (or the newest one) still inside the undo window.
    undoTarget(eid = null) {
      const cutoff = Date.now() - UNDO_WINDOW_MS;
      undoable = undoable.filter((u) => u.at >= cutoff);
      return eid ? undoable.find((u) => u.eid === eid) || null : undoable.at(-1) || null;
    },
    canUndo: () => undoable.length > 0,
    current: () => active,
    drain() {
      const out = pending.slice(0, MAX_BATCH);
      pending = pending.slice(MAX_BATCH);
      return out;
    },
    // A failed send goes back to the front of the queue once; a second failure drops it.
    requeue(events) {
      const again = events.filter((e) => !retried.has(e));
      again.forEach((e) => retried.add(e));
      pending = [...again, ...pending];
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
      retried = new WeakSet();
      owned = new Map();
      undoable = [];
    },
  };
}

// Live feed state for one reader: batches, the engagement queue (flushed every few seconds and before
// each next batch), per-item view timing, undoable actions, probes, steering, settings and similarity search.
// UI-agnostic; the Shorts screen and the "Your algorithm" panel drive it.
export function useLiveFeed(projectId) {
  const [status, setStatus] = useState(null);
  const [profileName, setProfileName] = useState("default");
  const [summary, setSummary] = useState(null);
  const [options, setOptions] = useState({ topics: [] });
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [marks, setMarks] = useState({});
  const [explore, setExplore] = useState(null);
  const [probe, setProbe] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [pending, setPending] = useState({ settings: false, steering: false, reset: false });
  const [session] = useState(createSession);
  const fetchingRef = useRef(false);
  const flushChain = useRef(Promise.resolve());
  const exploreKind = useRef(null);
  // Bumped on reader switch/reset so a batch requested for the previous reader is dropped.
  const generation = useRef(0);

  // Sends queued events in order; flushes are chained so an undo never overtakes the event it reverts.
  const flush = useCallback(() => {
    flushChain.current = flushChain.current.then(async () => {
      if (!projectId) return;
      for (let events = session.drain(); events.length; events = session.drain()) {
        const result = await feedEvents(projectId, profileName, events).catch((error) => ({ ok: false, error: error.message }));
        if (!result.ok) {
          session.requeue(events);
          toast.error(result.error);
          return;
        }
        setSummary(result.data.summary);
      }
    });
    return flushChain.current;
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
      // A new probe sits right after the short on screen (or the batch's first short), replacing any unanswered one.
      if (result.data.probe) setProbe({ ...result.data.probe, afterId: session.current() || result.data.items[0]?.id || null });
    } else toast.error(result.error);
    setReady(true);
  }, [flush, profileName, projectId, session]);

  const clear = useCallback(() => {
    generation.current += 1;
    session.reset();
    setItems([]);
    setMarks({});
    setProbe(null);
    setCanUndo(false);
  }, [session]);

  // Status + profile, then the first batch, whenever the project or reader changes.
  useEffect(() => {
    if (!projectId) return undefined;
    let alive = true;
    generation.current += 1;
    Promise.all([feedStatus(projectId), feedProfile(projectId, profileName)]).then(([s, p]) => {
      if (!alive) return;
      if (s.ok) setStatus(s.data);
      if (p.ok) {
        setSummary(p.data.summary);
        if (p.data.options) setOptions(p.data.options);
      }
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

  // The item now on screen (the previous one is finalised as a dwell or a skip); null while a probe card is.
  const setActiveItem = useCallback((item) => session.activate(item), [session]);

  const setMark = useCallback((id, mark, value) => {
    setMarks((m) => ({ ...m, [id]: { ...m[id], [mark]: value } }));
  }, []);

  // Reverts one item mark (emits its undo) and clears it.
  const revertMark = useCallback((itemId, mark) => {
    if (!session.revert(itemId, mark)) return false;
    setMark(itemId, mark, CLEARED[mark]);
    setCanUndo(session.canUndo());
    return true;
  }, [session, setMark]);

  // Undoes a specific action by eid, or the newest one.
  const undo = useCallback((eid = null) => {
    const target = session.undoTarget(eid);
    if (!target) {
      setCanUndo(session.canUndo());
      return false;
    }
    revertMark(target.itemId, target.mark);
    toast.dismiss(UNDO_TOAST_ID);
    return true;
  }, [revertMark, session]);

  const undoLast = useCallback(() => undo(), [undo]);

  // Sends an undoable action, marks the item and offers Undo in one replacing toast.
  const commit = useCallback((item, mark, value, event, message) => {
    const eid = session.send(item, event, mark, value);
    setMark(item.id, mark, value);
    setCanUndo(true);
    if (message) toast(message, { id: UNDO_TOAST_ID, action: { label: "Undo", onClick: () => undo(eid) } });
    return eid;
  }, [session, setMark, undo]);

  // Like/save (and knew-this/learned): optimistic; a second tap emits the undo for the first.
  const toggle = useCallback((item, mark) => {
    const type = MARK_TYPE[mark];
    if (!type) return;
    if (revertMark(item.id, mark)) return;
    const copy = { like: "Liked", save: "Saved", knew: "Marked as known", learned: "Marked as learned" };
    commit(item, mark, true, { type }, copy[mark]);
  }, [commit, revertMark]);

  // Hide with a reason: cancels an active like, swaps a different reason, and the same reason again unhides.
  const hide = useCallback((item, reason) => {
    const current = session.markValue(item.id, "hide");
    revertMark(item.id, "hide");
    if (current && current === (reason || true)) return;
    revertMark(item.id, "like");
    commit(item, "hide", reason || true, { type: "hide", ...(reason ? { reason } : {}) }, HIDE_REASON_BY_ID[reason]?.label ? `${HIDE_REASON_BY_ID[reason].label} — noted` : "Hidden");
  }, [commit, revertMark, session]);

  // One reaction per item: a new one undoes the previous; the same one again clears it.
  const react = useCallback((item, emotion) => {
    if (!REACTION_BY_ID[emotion]) return;
    const current = session.markValue(item.id, "reaction");
    revertMark(item.id, "reaction");
    if (current === emotion) return;
    commit(item, "reaction", emotion, { type: "react", emotion }, `Reacted: ${REACTION_BY_ID[emotion].label}`);
  }, [commit, revertMark, session]);

  const knewThis = useCallback((item) => toggle(item, "knew"), [toggle]);
  const learned = useCallback((item) => toggle(item, "learned"), [toggle]);

  // Native share sheet, else a copied link; the share event (with the item's reaction) is sent once per item.
  const share = useCallback(async (item) => {
    if (!item.permalink) return;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: item.permalink });
      else {
        await navigator.clipboard.writeText(item.permalink);
        toast.success("Link copied");
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      return toast.error("Couldn't share this post.");
    }
    if (session.markValue(item.id, "shared")) return;
    const emotion = session.markValue(item.id, "reaction");
    session.send(item, { type: "share", ...(emotion ? { emotion } : {}) }, "shared");
    setMark(item.id, "shared", true);
    setCanUndo(true);
  }, [session, setMark]);

  const exploreClick = useCallback((item, source) => {
    session.send(item, { type: "explore_click", source });
  }, [session]);

  // Counts the click-through, then opens the post.
  const outbound = useCallback((item) => {
    if (!item.permalink) return;
    session.send(item, { type: "outbound" });
    window.open(item.permalink, "_blank", "noopener,noreferrer");
  }, [session]);

  // Probe answers are learned on the next flush; dismissing cools the subject down server-side.
  const answerProbe = useCallback((value) => {
    if (!probe) return;
    if (probe.postId) session.send({ id: probe.postId }, { type: "probe_answer", probe: probe.kind, answer: value, sub: probe.sub });
    setProbe(null);
    toast.success("Thanks — your feed will follow that.");
    flush();
  }, [flush, probe, session]);

  const dismissProbe = useCallback(async () => {
    if (!probe) return;
    setProbe(null);
    const result = await feedProbe(projectId, profileName, "dismiss", { sub: probe.sub });
    if (!result.ok) toast.error(result.error);
  }, [probe, profileName, projectId]);

  // Swaps the unviewed shorts after the current one for a batch that reflects new settings/steering.
  const refreshUpcoming = useCallback(() => {
    setItems((prev) => {
      const at = prev.findIndex((i) => i.id === session.current());
      return at < 0 ? prev : prev.slice(0, at + 1);
    });
    loadMore();
  }, [loadMore, session]);

  const setBusy = useCallback((key, value) => setPending((p) => ({ ...p, [key]: value })), []);

  // Optimistic settings patch; rolls back with a toast on error. Composition changes refresh the upcoming shorts.
  const updateSettings = useCallback(async (patch) => {
    if (!projectId || !isObject(patch)) return false;
    const previous = summary?.settings;
    setSummary((s) => s && { ...s, settings: mergeSettingsPatch(s.settings || {}, patch) });
    setBusy("settings", true);
    const result = await feedSettings(projectId, profileName, patch);
    setBusy("settings", false);
    if (!result.ok) {
      setSummary((s) => s && { ...s, settings: previous });
      toast.error(result.error);
      return false;
    }
    setSummary(result.data.summary);
    if (Object.keys(patch).some((key) => key !== "emotionDials")) refreshUpcoming();
    return true;
  }, [profileName, projectId, refreshUpcoming, setBusy, summary?.settings]);

  // Recency mode for this reader (a thin wrapper over updateSettings).
  const setRecency = useCallback(async (recency) => {
    if (summary?.settings?.recency === recency) return;
    if (await updateSettings({ recency })) toast.success(`${FEED_RECENCY_MAP[recency]?.label || recency} feed`);
  }, [summary?.settings?.recency, updateSettings]);

  // Topic mute/boost lists (area id or subject path); a mute drops the same id from boosts.
  const topicList = useCallback((key) => summary?.settings?.topics?.[key] || [], [summary?.settings?.topics]);
  const muteTopic = useCallback((id) => updateSettings({ topics: { mute: [...new Set([...topicList("mute"), id])] } }), [topicList, updateSettings]);
  const unmuteTopic = useCallback((id) => updateSettings({ topics: { mute: topicList("mute").filter((x) => x !== id) } }), [topicList, updateSettings]);
  const boostTopic = useCallback((id) => updateSettings({ topics: { boost: [...new Set([...topicList("boost"), id])] } }), [topicList, updateSettings]);
  const unboostTopic = useCallback((id) => updateSettings({ topics: { boost: topicList("boost").filter((x) => x !== id) } }), [topicList, updateSettings]);

  const setEmotionDial = useCallback((bucket, value) => updateSettings({ emotionDials: { [bucket]: value } }), [updateSettings]);

  // Time-boxed steering requests; adding or removing one refreshes the upcoming shorts.
  const steer = useCallback(async (action, payload, success) => {
    if (!projectId) return false;
    setBusy("steering", true);
    const result = await feedSteering(projectId, profileName, action, payload);
    setBusy("steering", false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setSummary(result.data.summary);
    toast.success(success);
    refreshUpcoming();
    return true;
  }, [profileName, projectId, refreshUpcoming, setBusy]);

  const addSteering = useCallback((text) => steer("add", { text: String(text || "").trim() }, "Request added — your feed will lean that way."), [steer]);
  const removeSteering = useCallback((id) => steer("remove", { id }, "Request removed"), [steer]);

  const reset = useCallback(async () => {
    setBusy("reset", true);
    const result = await feedReset(projectId, profileName);
    setBusy("reset", false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Reader “${profileName}” starts fresh`);
    clear();
    setSummary(result.data.summary);
    if (result.data.options) setOptions(result.data.options);
    loadMore();
    return true;
  }, [clear, loadMore, profileName, projectId, setBusy]);

  // Clears one learning scope (topic/subject, emotion, knowledge); "all" is a full reset.
  const scopedReset = useCallback(async ({ scope, id } = {}) => {
    if (!scope || scope === "all") return reset();
    setBusy("reset", true);
    const result = await feedReset(projectId, profileName, scope, id);
    setBusy("reset", false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setSummary(result.data.summary);
    if (result.data.options) setOptions(result.data.options);
    toast.success(`${RESET_SCOPE_META[scope]?.label || "Reset"} done`);
    if (scope === "topic") refreshUpcoming();
    return true;
  }, [profileName, projectId, refreshUpcoming, reset, setBusy]);

  // Leaves an item, a topic/subject or this session out of learning (session: on/off private session).
  const excludeFromTaste = useCallback(async ({ scope, id, on = true } = {}) => {
    if (!projectId) return false;
    setBusy("reset", true);
    await flush();
    const result = await feedExclude(projectId, profileName, { scope, ...(id ? { id } : {}), on });
    setBusy("reset", false);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setSummary(result.data.summary);
    const copy = scope === "session" ? (on ? "Private session on — nothing here is learned" : "Private session ended") : on ? `Left out of your taste (${result.data.excluded} events)` : "Back in your taste";
    toast.success(copy);
    return true;
  }, [flush, profileName, projectId, setBusy]);

  // Similar images for an item; clicking a result tile also counts as an explore click.
  const showSimilar = useCallback(async (item, { fromResult = false } = {}) => {
    if (fromResult && exploreKind.current) session.send(item, { type: "explore_click", source: exploreKind.current });
    exploreKind.current = "similar";
    const title = `More like “${String(item.title).slice(0, 60)}”`;
    setExplore({ kind: "similar", title, loading: true, results: [] });
    const result = await feedSimilar(projectId, item.id);
    setExplore({ kind: "similar", title, loading: false, results: result.ok ? result.data.results : [], note: result.ok ? result.data.reason : result.error });
  }, [projectId, session]);

  const search = useCallback(async (query) => {
    const text = query.trim();
    if (!text) return;
    exploreKind.current = "search";
    const title = `Images matching “${text}”`;
    setExplore({ kind: "search", title, loading: true, results: [] });
    const result = await feedSearch(projectId, text);
    setExplore({ kind: "search", title, loading: false, results: result.ok ? result.data.results : [], note: result.ok ? null : result.error });
  }, [projectId]);

  const switchReader = useCallback((name) => {
    const next = name.trim() || "default";
    if (next === profileName) return;
    setReady(false);
    setProfileName(next);
  }, [profileName]);

  // Legacy single-action entry point (like/save toggle, plain hide).
  const act = useCallback((item, type) => (type === "hide" ? hide(item) : toggle(item, type)), [hide, toggle]);

  return {
    status, summary, profileName, items, ready, fetching, marks, explore, options, probe, canUndo, pending,
    loadMore, setActiveItem, act, toggle, hide, react, knewThis, learned, share, exploreClick, outbound,
    answerProbe, dismissProbe, undoLast, showSimilar, search, reset, switchReader,
    updateSettings, setRecency, muteTopic, unmuteTopic, boostTopic, unboostTopic, setEmotionDial,
    addSteering, removeSteering, scopedReset, excludeFromTaste,
  };
}
