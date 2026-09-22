import { MOODS, TAGS, WANT_AGAIN } from "@/lib/constants";

const MOOD_SET = new Set(MOODS.map((m) => m.value));
const TAG_SET = new Set(TAGS);
const WANT_SET = new Set(WANT_AGAIN.map((w) => w.value));

export function sanitizeMood(raw: string) {
  return MOOD_SET.has(raw as never) ? raw : null;
}

export function sanitizeVisibility(raw: string) {
  return raw === "private" || raw === "shared" ? raw : null;
}

export function sanitizeWantAgain(raw: string) {
  if (!raw) return null;
  return WANT_SET.has(raw as never) ? raw : null;
}

export function sanitizeTags(raw: string[]) {
  return raw.filter((tag) => TAG_SET.has(tag as never)).slice(0, 8);
}
