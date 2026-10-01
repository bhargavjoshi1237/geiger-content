"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/supabase/components/content-client";
import { assetContentHash } from "@/lib/delivery/asset_hash.mjs";

// Storage helpers for the Assets media library (fixes D2).
// Objects live in the public `content` bucket under assets/<projectId>/<assetId>/.
// The resulting public URL is persisted in content.assets.url.
// Pure: validate, console.error on failure, return null / false — never throw,
// never toast.

export const ASSET_BUCKET = "content";

const COMPRESS_THRESHOLD_BYTES = 500 * 1024;
const MAX_DIMENSION_PX = 1920;
const JPEG_QUALITY = 0.82;

export function assetPrefix(projectId, assetId) {
  return `assets/${projectId}/${assetId}/`;
}

export function buildPublicUrl(path) {
  if (!path) return "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${String(base).replace(/\/$/, "")}/storage/v1/object/public/${ASSET_BUCKET}/${path}`;
}

function sanitizeFileName(name) {
  const base = String(name || "file").split("/").pop();
  return (
    base
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "") || "file"
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

// Downscale images over ~500 KB to max 1920px on the long edge, JPEG 0.82.
// Returns the original file when compression is unnecessary or impossible.
async function maybeCompressImage(file) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/")) return file;
    if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
    if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
    if (typeof window === "undefined" || typeof document === "undefined") {
      return file;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return file;
      const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(w, h));
      if (scale >= 1) return file;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
      );
      if (!blob) return file;
      return new File([blob], file.name, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (e) {
    console.error("[storage.compress]", e);
    return file;
  }
}

export async function uploadAsset({ projectId, assetId, file, userId }) {
  void userId;
  if (!isSupabaseConfigured() || !projectId || !file) return null;
  try {
    const id =
      assetId ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()));
    const blob = await maybeCompressImage(file);
    const contentHash = await assetContentHash(blob);
    const path = `${assetPrefix(projectId, id)}${sanitizeFileName(blob.name || file.name)}`;
    const sb = createClient();
    const { error } = await sb
      .storage.from(ASSET_BUCKET)
      .upload(path, blob, {
        upsert: true,
        contentType: blob.type || file.type || "application/octet-stream",
      });
    if (error) {
      console.error("[storage.upload]", error.message);
      return null;
    }
    return {
      path,
      publicUrl: buildPublicUrl(path),
      sizeBytes: blob.size ?? 0,
      mime: blob.type || file.type || "",
      contentHash,
    };
  } catch (e) {
    console.error("[storage.upload]", e);
    return null;
  }
}

export async function removeAsset(path) {
  if (!isSupabaseConfigured() || !path) return false;
  try {
    const sb = createClient();
    const { error } = await sb.storage.from(ASSET_BUCKET).remove([path]);
    if (error) {
      console.error("[storage.remove]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[storage.remove]", e);
    return false;
  }
}
