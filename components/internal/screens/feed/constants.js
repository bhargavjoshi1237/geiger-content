// Lookups and copy for the Shorts feed and its "Your algorithm" panel. Config only — no logic, no lib/feed imports.
import { Angry, Annoyed, Ban, CheckCheck, EyeOff, Frown, Heart, Laugh, Lightbulb, ShieldAlert, Star } from "lucide-react";

// Reaction buckets in picker order (ids match lib/feed/emotion.mjs EMOTIONS); tone is the active icon colour.
export const REACTION_META = [
  { id: "amused", label: "Amused", icon: Laugh, tone: "text-amber-600 dark:text-amber-400" },
  { id: "amazed", label: "Amazed", icon: Star, tone: "text-sky-600 dark:text-sky-400" },
  { id: "moved", label: "Moved", icon: Heart, tone: "text-rose-600 dark:text-rose-400" },
  { id: "curious", label: "Curious", icon: Lightbulb, tone: "text-violet-600 dark:text-violet-300" },
  { id: "sad", label: "Sad", icon: Frown, tone: "text-blue-600 dark:text-blue-400" },
  { id: "angry", label: "Angry", icon: Angry, tone: "text-red-600 dark:text-red-400" },
  { id: "disgusted", label: "Disgusted", icon: Annoyed, tone: "text-emerald-600 dark:text-emerald-400" },
];

// Reaction lookup by bucket id, for profile bars and marked rail state.
export const REACTION_BY_ID = Object.fromEntries(REACTION_META.map((r) => [r.id, r]));

// Range for the per-bucket emotion dials (settings.emotionDials).
export const EMOTION_DIAL_RANGE = { min: -1, max: 1, step: 0.5 };

// "Not for me" reasons in menu order; hiddenText replaces the card, dim greys the image.
export const HIDE_REASON_META = [
  { id: "this_item", label: "Not this one", icon: EyeOff, hiddenText: "Hidden. We'll show fewer posts like this.", dim: true },
  { id: "this_topic", label: "Less of this topic", icon: Ban, hiddenText: "Got it — less of this topic from now on.", dim: true },
  { id: "seen_it", label: "I've seen this", icon: CheckCheck, hiddenText: "Marked as seen — you'll get deeper cuts.", dim: false },
  { id: "upsetting", label: "This upset me", icon: ShieldAlert, hiddenText: "Hidden. We'll steer away from content like this.", dim: true },
];

// Hide reason lookup by id.
export const HIDE_REASON_BY_ID = Object.fromEntries(HIDE_REASON_META.map((r) => [r.id, r]));

// Fallback labels for probe answers (the Probe payload already carries its own options).
export const PROBE_OPTION_LABELS = {
  interest: { more: "More of this", same: "About the same", less: "Less of this" },
  knowledge: { new: "New to me", some: "I know some", know: "I know it well" },
};

// Composition dials (settings.exploration/variety/similar/reactivity); options work directly as SegmentedTabs tabs.
export const DIAL_META = {
  exploration: {
    title: "Exploration",
    description: "How often the feed tries topics you haven't engaged with yet.",
    options: [
      { value: "focused", label: "Focused", description: "Mostly your proven interests, few detours." },
      { value: "balanced", label: "Balanced", description: "Your interests first, with a steady trickle of new topics." },
      { value: "adventurous", label: "Adventurous", description: "Roughly a third of each batch is new or neighbouring topics." },
    ],
  },
  variety: {
    title: "Variety",
    description: "How tightly a batch can cluster around one topic.",
    options: [
      { value: "tight", label: "Tight", description: "Longer runs of the same topic are fine." },
      { value: "balanced", label: "Balanced", description: "Topics are spaced out without forcing a mix." },
      { value: "wide", label: "Wide", description: "Topics rotate quickly; no back-to-back repeats." },
    ],
  },
  similar: {
    title: "Similar posts",
    description: "How much of each batch comes from posts that look like ones you liked.",
    options: [
      { value: "off", label: "Off", description: "No look-alike posts; topics only." },
      { value: "low", label: "Low", description: "About a fifth of each batch." },
      { value: "balanced", label: "Balanced", description: "Just under half of each batch." },
      { value: "high", label: "High", description: "Most of each batch, with more per subject." },
    ],
  },
  reactivity: {
    title: "Reactivity",
    description: "How quickly your latest actions reshape the feed.",
    options: [
      { value: "steady", label: "Steady", description: "Long memory; one session barely moves it." },
      { value: "balanced", label: "Balanced", description: "Recent actions count more, older taste fades over days." },
      { value: "fast", label: "Fast", description: "Follows your mood within minutes; forgets in about a week." },
    ],
  },
};

// Rabbit-hole switch and its per-session descent select (values are strings for Select; save as numbers).
export const RABBIT_HOLE_COPY = {
  title: "Rabbit holes",
  description: "Lean into a subject you're enjoying and go a level deeper each time you engage.",
  levelsLabel: "Levels per session",
  levelsHint: "How far one session may descend into a single subject.",
  levelOptions: [
    { value: "1", label: "1 level" },
    { value: "2", label: "2 levels" },
    { value: "3", label: "3 levels" },
  ],
  minorNote: "Limited to 1 level while Minor mode is on.",
};

// Non-profiled mode switch and the header badge.
export const NON_PROFILED_COPY = {
  title: "Non-profiled feed",
  description: "Show the newest posts without using your history. Nothing you do is learned while this is on; mutes and exclusions still apply.",
  persistNote: "This setting persists across resets.",
  badge: "Non-profiled",
};

// Private session (exclude this session from learning) badge and toggle copy; auto-expires after 3 h.
export const PRIVATE_SESSION_COPY = {
  title: "Private session",
  description: "Leave this session out of your taste. Ends automatically after 3 hours.",
  badge: "Private session",
  on: "Start private session",
  off: "End private session",
};

// Intensity cap tabs (settings.intensityCap).
export const INTENSITY_OPTIONS = [
  { value: "any", label: "Any", description: "No limit on sensitive or intense posts." },
  { value: "moderate", label: "Moderate", description: "Spaces out sensitive themes and intense negative posts." },
  { value: "calm", label: "Calm", description: "Keeps sensitive themes rare and drops heated, upsetting posts." },
];

// Minor-mode toggle copy (settings.minor).
export const MINOR_COPY = {
  title: "Minor mode",
  description: "Tighter intensity limits and one rabbit-hole level per session.",
};

// Depth target tabs (settings.depth.target) and the basics-suppression switch.
export const DEPTH_OPTIONS = [
  { value: "gentle", label: "Gentle", description: "Mostly posts that are easy to follow." },
  { value: "balanced", label: "Balanced", description: "Posts just past what you already know." },
  { value: "deep", label: "Deep", description: "Stretch toward expert-level posts." },
];

export const BASICS_SUPPRESSION_COPY = {
  title: "Skip the basics",
  description: "Show fewer introductory posts in subjects you already know well.",
};

// Knowledge labels from summary.knowledge.subjects[].label (null below minimum evidence).
export const LEVEL_LABELS = {
  Familiar: { label: "Familiar", variant: "neutral", description: "You know the basics." },
  Proficient: { label: "Proficient", variant: "info", description: "Comfortable with intermediate posts." },
  Mastered: { label: "Mastered", variant: "success", description: "Expert-level posts land with you." },
};

// Knowledge level scale (1..5) and section copy.
export const KNOWLEDGE_COPY = {
  levelMin: 1,
  levelMax: 5,
  unlabelled: "Learning",
  bandHint: "Posts between levels {lo} and {hi} suit you best right now.",
  empty: "Mark posts with \"I knew this\" or \"I learned something\" to build your knowledge map.",
};

// Drift labels from summary.drift[].label; variant feeds Badge.
export const DRIFT_META = {
  emerging: { label: "Emerging", variant: "success", description: "Steadily gaining your attention over several sessions." },
  spike: { label: "Spike", variant: "warning", description: "A burst of interest this session only." },
  fading: { label: "Fading", variant: "neutral", description: "Engagement has dropped over several sessions." },
  rested: { label: "Resting", variant: "info", description: "Seen a lot lately; given a short break." },
};

export const DRIFT_COPY = {
  empty: "No shifts in your interests yet.",
  driftBoostTitle: "Explore when my taste shifts",
  driftBoostDescription: "Widen exploration for a while when your interests change direction.",
};

// Time-boxed steering requests (lib/feed/steering.mjs: 3-day TTL, 6 active, 3..200 chars).
export const STEERING_COPY = {
  title: "Steer your feed",
  description: "Ask for something specific. Each request shapes the feed for 3 days.",
  placeholder: "e.g. more vintage motorsport photos",
  submit: "Add request",
  maxActive: 6,
  ttlDays: 3,
  minLength: 3,
  maxLength: 200,
  limitReached: "You have 6 active requests. Remove one to add another.",
  empty: "No active requests.",
};

// Funnel-health tiles from summary.funnel; format is percent | bits | count | number.
export const FUNNEL_META = {
  circlingIndex: { label: "Circling", format: "percent", help: "Share of the last 50 posts from your top 3 topics. High means the feed is circling." },
  entropy: { label: "Topic spread", format: "bits", help: "Entropy of topics in the last 50 posts. Higher means more varied." },
  maxRun: { label: "Longest run", format: "count", help: "Most posts in a row from one topic in the last 50." },
  topicChurn: { label: "Topic churn", format: "percent", help: "How much the topic mix changed between the last two 25-post windows." },
  explorationYield: { label: "Exploration yield", format: "percent", help: "How often new and neighbouring topics land with you." },
  depthPerSubject: { label: "Depth", format: "number", help: "How deep each subject has gone, and how far this session descended." },
  sensitiveShare: { label: "Sensitive", format: "percent", help: "Share of the last 50 posts touching a sensitive theme." },
  intenseShare: { label: "Intense", format: "percent", help: "Share of the last 50 posts that were intensely negative." },
};

// Scoped reset actions (POST reset scope).
export const RESET_SCOPE_META = {
  topic: { label: "Reset topic", description: "Forget what the feed learned about one topic." },
  emotion: { label: "Reset reactions", description: "Clear your emotion profile." },
  knowledge: { label: "Reset knowledge", description: "Clear your knowledge levels." },
  all: { label: "Reset everything", description: "Start over. Your settings are kept." },
};
