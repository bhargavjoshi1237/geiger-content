// Portable-JSON entry body (Phase 3: "store portable JSON, not HTML").
//
// The `body` column stays text (no migration): it holds either legacy plain
// text or a JSON string of `{ blocks: [{ type, text }] }`. This module is pure
// (no JSX, no imports) so it stays unit-testable and safe to import from both
// client screens and the server renderer.

export const BODY_BLOCK_TYPES = ["paragraph", "heading"];

function normalizeBlock(block) {
  const type = block && block.type === "heading" ? "heading" : "paragraph";
  const text = block == null || block.text == null ? "" : String(block.text);
  return { type, text };
}

function emptyDoc() {
  return { blocks: [{ type: "paragraph", text: "" }] };
}

// Parse any stored body value into a normalized doc. Legacy plain text and
// invalid JSON both collapse to a single paragraph holding the raw text, so
// old rows keep rendering.
export function parseBody(value) {
  if (value == null) return emptyDoc();
  if (typeof value === "object" && value !== null && Array.isArray(value.blocks)) {
    const blocks = value.blocks.map(normalizeBlock);
    return { blocks: blocks.length ? blocks : emptyDoc().blocks };
  }
  if (typeof value !== "string") return { blocks: [{ type: "paragraph", text: String(value) }] };
  if (value === "") return emptyDoc();
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.blocks)) {
      const blocks = parsed.blocks.map(normalizeBlock);
      return { blocks: blocks.length ? blocks : emptyDoc().blocks };
    }
  } catch {
    // Not JSON — fall through to legacy plain text below.
  }
  return { blocks: [{ type: "paragraph", text: value }] };
}

// Serialize a doc back to the string stored in the text column.
export function serializeBody(doc) {
  const blocks = doc && Array.isArray(doc.blocks) ? doc.blocks.map(normalizeBlock) : emptyDoc().blocks;
  return JSON.stringify({ blocks });
}

// True when the value already looks like a portable-JSON doc (object with a
// blocks array, or a JSON string that parses to one).
export function isDoc(value) {
  if (value && typeof value === "object" && Array.isArray(value.blocks)) return true;
  if (typeof value !== "string" || value === "") return false;
  try {
    const parsed = JSON.parse(value);
    return !!parsed && Array.isArray(parsed.blocks);
  } catch {
    return false;
  }
}
