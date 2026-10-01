// Parses the topic-tree DSL into topic → subtopic → step → horizontal nodes.
//   # Topic Name {topic-id} > related-id, related-id @sub @sub
//   ## Subtopic Name @sub @sub
//   - Step Name @sub @!dedicated ~ step keyword, step keyword
//     Horizontal: kw, kw | Horizontal: kw, flair=Flair Text | …
// `@!sub` marks a subreddit wholly about that step (no step keyword needed there).

export function slugify(text) {
  return String(text).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function splitList(text) {
  return String(text || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// Pulls `@sub` / `@!sub` tokens off a header, returning the remaining text.
function takeSubreddits(text) {
  const subreddits = [];
  const dedicated = [];
  const rest = text.replace(/@(!?)([A-Za-z0-9_]+)/g, (_, bang, name) => {
    subreddits.push(name);
    if (bang) dedicated.push(name);
    return "";
  });
  return { rest: rest.replace(/\s+/g, " ").trim(), subreddits, dedicated };
}

export function parseKeyword(raw) {
  const text = raw.trim();
  if (/^flair=/i.test(text)) return { field: "flair", text: text.slice(6).trim().toLowerCase() };
  return { field: "any", text: text.toLowerCase() };
}

export function parseTaxonomy(source, { file = "taxonomy" } = {}) {
  const topics = [];
  let topic = null;
  let subtopic = null;
  let step = null;
  const lines = String(source).split(/\r?\n/);
  lines.forEach((line, index) => {
    const text = line.trim();
    if (!text) return;
    const where = `${file}:${index + 1}`;
    if (text.startsWith("## ")) {
      if (!topic) throw new Error(`${where}: subtopic before topic`);
      const { rest, subreddits } = takeSubreddits(text.slice(3));
      subtopic = { name: rest, id: slugify(rest), subreddits, steps: [] };
      topic.subtopics.push(subtopic);
      step = null;
    } else if (text.startsWith("# ")) {
      const match = /^(.*?)\{([a-z0-9-]+)\}\s*(?:>\s*([^@]*))?(.*)$/.exec(text.slice(2));
      if (!match) throw new Error(`${where}: bad topic header`);
      const { subreddits } = takeSubreddits(match[4]);
      topic = { name: match[1].trim(), id: match[2], related: splitList(match[3]), subreddits, subtopics: [] };
      topics.push(topic);
      subtopic = null;
      step = null;
    } else if (text.startsWith("- ")) {
      if (!subtopic) throw new Error(`${where}: step before subtopic`);
      const [head, keywords = ""] = text.slice(2).split("~");
      const { rest, subreddits, dedicated } = takeSubreddits(head);
      step = {
        name: rest,
        id: slugify(rest),
        depth: subtopic.steps.length + 1,
        subreddits,
        dedicated,
        keywords: splitList(keywords).map(parseKeyword),
        horizontals: [],
      };
      subtopic.steps.push(step);
    } else {
      if (!step) throw new Error(`${where}: horizontals before step`);
      for (const part of text.split("|")) {
        // ": " (with the space) separates name from keywords so names like "1:18 models" survive.
        const colon = part.indexOf(": ");
        if (colon < 0) throw new Error(`${where}: horizontal "${part.trim()}" needs "Name: keywords"`);
        const name = part.slice(0, colon).trim();
        step.horizontals.push({ name, id: slugify(name), keywords: splitList(part.slice(colon + 2)).map(parseKeyword) });
      }
    }
  });
  return topics;
}
