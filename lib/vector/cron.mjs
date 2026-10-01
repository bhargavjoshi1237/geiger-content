import { timingSafeEqual } from "node:crypto";

export function cronAuthorized(request, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
