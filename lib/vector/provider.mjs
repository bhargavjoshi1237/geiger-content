import {
  MODEL,
  DIMENSIONS,
  validateVector,
  nextPacificReset,
} from "./core.mjs";

export class ProviderError extends Error {
  constructor(code, message, status = 503, retryAt = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
  }
}

export async function embedContent({
  text,
  title = "none",
  image,
  mime,
  purpose = "document",
  apiKey = process.env.GEMINI_API_KEY,
  fetcher = fetch,
}) {
  if (!apiKey)
    throw new ProviderError(
      "provider_unconfigured",
      "Add GEMINI_API_KEY to the server environment.",
    );
  const parts = image
    ? [
        {
          inlineData: {
            mimeType: mime,
            data: Buffer.from(image).toString("base64"),
          },
        },
      ]
    : [
        {
          text:
            purpose === "query"
              ? `task: search result | query: ${text}`
              : `title: ${String(title).slice(0, 200)} | text: ${text}`,
        },
      ];
  let response;
  try {
    response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: `models/${MODEL}`,
          content: { parts },
          outputDimensionality: DIMENSIONS,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
  } catch {
    throw new ProviderError(
      "provider_unavailable",
      "Gemini could not be reached. The request can be retried.",
      503,
      Date.now() + 60000,
    );
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) {
      const details = JSON.stringify(payload.error?.details || []);
      const daily = /PerDay|per_day|daily|requests.?per.?day/i.test(details);
      const retryInfo = (payload.error?.details || []).find(
        (item) => item.retryDelay,
      )?.retryDelay;
      const retryHeader = response.headers.get("retry-after");
      const seconds = Math.max(
        1,
        Number.parseFloat(retryInfo) || Number(retryHeader) || 60,
      );
      const retryAt = daily
        ? nextPacificReset().getTime()
        : Date.now() + Math.min(seconds, 86400) * 1000;
      throw new ProviderError(
        daily ? "daily_quota_exhausted" : "rate_limited",
        daily
          ? "Gemini daily quota reached. Indexing will resume after the quota resets."
          : "Gemini rate limit reached. Try again after the retry time.",
        429,
        retryAt,
      );
    }
    const retryable = response.status >= 500 || response.status === 408;
    throw new ProviderError(
      retryable ? "provider_unavailable" : "provider_rejected",
      retryable
        ? "Gemini is temporarily unavailable."
        : "Gemini rejected the request. Check the API key, model access, and input format.",
      retryable ? 503 : 422,
      retryable ? Date.now() + 60000 : null,
    );
  }
  try {
    return validateVector(payload.embedding?.values);
  } catch {
    throw new ProviderError(
      "invalid_embedding",
      "Gemini returned an invalid embedding.",
      502,
    );
  }
}
