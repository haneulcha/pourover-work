import type { Pour, Recipe } from "./types";

export type Feeling = "calm" | "neutral" | "wave";

export type BrewSession = {
  readonly recipe: Recipe;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly feeling?: Feeling;
};

export const elapsedSec = (session: BrewSession, now: number): number =>
  Math.max(0, Math.floor((now - session.startedAt) / 1000));

// Largest index i such that pours[i].atSec <= elapsed. Defaults to 0 (first pour).
export const activeStepIdx = (
  pours: readonly Pour[],
  elapsed: number,
): number => {
  if (elapsed < 0 || pours.length === 0) return 0;
  let idx = 0;
  for (let i = 0; i < pours.length; i++) {
    if (pours[i]!.atSec <= elapsed) idx = i;
    else break;
  }
  return idx;
};

// First index j with pours[j].atSec > elapsed, or null if no such pour exists.
export const nextStepIdx = (
  pours: readonly Pour[],
  elapsed: number,
): number | null => {
  for (let i = 0; i < pours.length; i++) {
    if (pours[i]!.atSec > elapsed) return i;
  }
  return null;
};

export const isComplete = (session: BrewSession, now: number): boolean =>
  elapsedSec(session, now) >= session.recipe.totalTimeSec;

// Actual duration of a completed session in seconds. Falls back to the
// recipe's planned total when completedAt isn't set.
export const sessionDurationSec = (session: BrewSession): number =>
  session.completedAt != null
    ? Math.max(0, Math.floor((session.completedAt - session.startedAt) / 1000))
    : session.recipe.totalTimeSec;

// Sub-second resolution version of elapsedSec / totalTimeSec, clamped to [0, 1].
// elapsedSec floors to integers — this preserves fractional seconds for
// continuous visual progress (e.g., rAF-driven fills).
export const elapsedRatio = (
  session: BrewSession,
  totalTimeSec: number,
  now: number,
): number =>
  totalTimeSec > 0
    ? Math.min(1, Math.max(0, (now - session.startedAt) / 1000 / totalTimeSec))
    : 0;

// Standard label for a pour step: "bloom" for the bloom pour, "{n}차" otherwise.
// Centralized so UI surfaces (hero, rings, aria-live) share a single format.
export const pourLabel = (pour: Pour, idx: number): string =>
  pour.label === "bloom" ? "bloom" : `${idx}차`;
