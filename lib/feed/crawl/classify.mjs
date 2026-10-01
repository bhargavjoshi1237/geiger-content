// Assigns a Reddit post to the most specific step + horizontal it matches in the topic tree.

const WORD = /[a-z0-9]/;

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Case-insensitive phrase match with word edges (only where the phrase itself starts/ends
// on a word character) and optional plural, so "loop" hits "loops" but not "loophole".
export function compileKeyword({ field, text }) {
  const start = WORD.test(text[0]) ? "(?:^|[^a-z0-9])" : "";
  const end = WORD.test(text[text.length - 1]) ? "(?:s|es)?(?=$|[^a-z0-9])" : "";
  return { field, text, length: text.length, re: new RegExp(`${start}${escapeRegex(text)}${end}`, "i") };
}

// Longest matching keyword, noting whether it hit the title or the post flair.
function hit(matchers, title, flair) {
  let best = null;
  for (const m of matchers) {
    const where = m.field !== "flair" && m.re.test(title) ? "title" : m.re.test(flair) ? "flair" : null;
    if (where && (!best || m.length > best.length)) best = { ...m, where };
  }
  return best;
}

// Builds subreddit → step matchers for the given topics.
export function buildMatchers(topics) {
  const bySubreddit = new Map();
  const steps = [];
  for (const topic of topics)
    for (const subtopic of topic.subtopics)
      for (const step of subtopic.steps) {
        const matcher = {
          topic,
          subtopic,
          step,
          keywords: step.keywords.map(compileKeyword),
          dedicated: new Set(step.dedicated.map((s) => s.toLowerCase())),
          horizontals: step.horizontals.map((horizontal) => ({ horizontal, keywords: horizontal.keywords.map(compileKeyword) })),
        };
        steps.push(matcher);
        for (const sub of step.subreddits) {
          const key = sub.toLowerCase();
          if (!bySubreddit.has(key)) bySubreddit.set(key, []);
          bySubreddit.get(key).push(matcher);
        }
      }
  return { steps, bySubreddit };
}

// Best (step, horizontal) for a post among the step matchers of its subreddit.
// Ranking: keyword step match beats dedicated-subreddit match, then the longest horizontal
// keyword, then the deeper step. `isFull(path)` skips horizontals that already have enough.
export function classifyPost(post, stepMatchers, { isFull = () => false } = {}) {
  const title = String(post.title || "").toLowerCase();
  const flair = String(post.link_flair_text || "").toLowerCase();
  const sub = String(post.subreddit || "").toLowerCase();
  let best = null;
  for (const matcher of stepMatchers || []) {
    const stepHit = hit(matcher.keywords, title, flair);
    const dedicated = matcher.dedicated.has(sub);
    if (!stepHit && !dedicated) continue;
    for (const { horizontal, keywords } of matcher.horizontals) {
      if (isFull(horizontal.path)) continue;
      const hHit = hit(keywords, title, flair);
      if (!hHit) continue;
      const score = (stepHit ? 1000 + stepHit.length * 10 : 0) + hHit.length * 10 + matcher.step.depth;
      if (!best || score > best.score)
        best = {
          score,
          topic: matcher.topic,
          subtopic: matcher.subtopic,
          step: matcher.step,
          horizontal,
          matched: { step: stepHit ? `${stepHit.where}:${stepHit.text}` : `dedicated:r/${post.subreddit}`, horizontal: `${hHit.where}:${hHit.text}` },
        };
    }
  }
  return best;
}
