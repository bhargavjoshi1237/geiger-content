// Input checks for the operations routes (/api/assistant, /api/cache-invalidation, /api/consent).
// Each throws a VectorError (status 400 unless noted) that the route turns into its error response.
import { VectorError, isUuid } from "./vector/auth.mjs";

export function assistantInput(input) {
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > 4000) throw new VectorError("invalid_prompt", "Enter a request of 1–4,000 characters.");
  if (input.entryId && !isUuid(input.entryId)) throw new VectorError("invalid_entry", "Choose a valid entry.");
  return { prompt, entryId: input.entryId || null };
}

export function invalidationInput(input) {
  if (!isUuid(input.entryId)) throw new VectorError("invalid_entry", "Choose a valid published entry.");
  return { entryId: input.entryId };
}

// Reads the body as a JSON object; over 20,000 bytes is a 413, anything but an object is invalid_json.
export async function operationBody(request) {
  const text = await request.text();
  if (Buffer.byteLength(text) > 20000) throw new VectorError("request_too_large", "This request is too large.", 413);
  try {
    const body = JSON.parse(text || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new VectorError("invalid_json", "Send a valid JSON object."); }
}
