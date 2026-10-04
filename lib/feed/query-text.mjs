// Text → vector in the image embedding space (nomic-embed-text-v1.5 is aligned with nomic-embed-vision-v1.5),
// for "search the feed by words". Hosted Nomic API when NOMIC_API_KEY is set (free tier), else a local
// ONNX copy through @huggingface/transformers if it is installed (`npm i @huggingface/transformers`).
import { FEED_DIMENSIONS, FEED_TEXT_MODEL } from "./vectors.mjs";

const NOMIC_URL = "https://api-atlas.nomic.ai/v1/embedding/text";

export class QueryEmbeddingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const unit = (values) => {
  const norm = Math.sqrt(values.reduce((sum, x) => sum + x * x, 0));
  return norm > 0 ? values.map((x) => x / norm) : null;
};

async function viaNomic(text, key) {
  const response = await fetch(NOMIC_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: FEED_TEXT_MODEL, texts: [text], task_type: "search_query", dimensionality: FEED_DIMENSIONS }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new QueryEmbeddingError("provider_failed", `Nomic API returned ${response.status}.`);
  const body = await response.json();
  return unit(body.embeddings?.[0] || []);
}

let localExtractor = null;
async function viaLocal(text) {
  if (!localExtractor) {
    let transformers;
    try {
      transformers = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "@huggingface/transformers");
    } catch {
      throw new QueryEmbeddingError("text_model_unavailable", "Set NOMIC_API_KEY (free at atlas.nomic.ai) or install @huggingface/transformers to search by text.");
    }
    localExtractor = transformers.pipeline("feature-extraction", `nomic-ai/${FEED_TEXT_MODEL}`);
  }
  const extractor = await localExtractor;
  const output = await extractor([`search_query: ${text}`], { pooling: "mean", normalize: true });
  return unit(Array.from(output.data).slice(0, FEED_DIMENSIONS));
}

export async function embedQueryText(text, { env = process.env } = {}) {
  const clean = String(text || "").trim().slice(0, 500);
  if (!clean) throw new QueryEmbeddingError("invalid_query", "Type something to search for.");
  const vector = env.NOMIC_API_KEY ? await viaNomic(clean, env.NOMIC_API_KEY) : await viaLocal(clean);
  if (!vector || vector.length !== FEED_DIMENSIONS) throw new QueryEmbeddingError("provider_failed", "The text model returned no embedding.");
  return vector;
}
