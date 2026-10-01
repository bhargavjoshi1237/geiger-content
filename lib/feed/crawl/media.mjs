// Image detection and extraction for Reddit posts (direct images and galleries).

const DIRECT_IMAGE = /^https?:\/\/(i\.redd\.it|i\.imgur\.com|preview\.redd\.it)\/[^?#]+\.(jpe?g|png|webp)(\?|#|$)/i;
const GALLERY = /^https?:\/\/(www\.)?reddit\.com\/gallery\/[a-z0-9]+/i;
const MAX_WIDTH = 1080;
const MAX_GALLERY = 10;

export function decodeHtml(url) {
  return String(url || "").replace(/&amp;/g, "&");
}

// Cheap pre-filter on search-result fields, before a post is hydrated.
export function isImageCandidate(post) {
  if (!post || !post.id || !post.title) return false;
  if (post.over_18 || post.spoiler || post.crosspost_parent) return false;
  if (!post.author || post.author === "[deleted]") return false;
  const url = String(post.url || "");
  return post.post_hint === "image" || DIRECT_IMAGE.test(url) || GALLERY.test(url);
}

function pickSize(source, previews) {
  const usable = (previews || []).filter((p) => (p.x || p.width) <= MAX_WIDTH && (p.u || p.url));
  const chosen = usable.length ? usable[usable.length - 1] : source;
  if (!chosen) return null;
  return { url: decodeHtml(chosen.u || chosen.url), width: chosen.x || chosen.width || null, height: chosen.y || chosen.height || null };
}

// Hydrated post → [{ url, width, height }] (largest rendition ≤1080px wide), or [] when
// the post is removed, NSFW, a video, or has no static image.
export function extractImages(post) {
  if (!post || post.over_18 || post.is_video || post.removed_by_category) return [];
  if (post.is_gallery && post.media_metadata && post.gallery_data?.items) {
    const images = [];
    for (const item of post.gallery_data.items) {
      if (item.is_deleted) continue;
      const meta = post.media_metadata[item.media_id];
      if (!meta || meta.status !== "valid" || meta.e !== "Image") continue;
      const image = pickSize(meta.s, meta.p);
      if (image) images.push({ ...image, caption: item.caption || undefined });
      if (images.length >= MAX_GALLERY) break;
    }
    return images;
  }
  const url = String(post.url || "");
  const preview = post.preview?.images?.[0];
  if (DIRECT_IMAGE.test(url) || post.post_hint === "image") {
    const sized = preview ? pickSize(preview.source, preview.resolutions) : null;
    if (sized) return [sized];
    if (DIRECT_IMAGE.test(url)) return [{ url: decodeHtml(url), width: null, height: null }];
  }
  return [];
}
