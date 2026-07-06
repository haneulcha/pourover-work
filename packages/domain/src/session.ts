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

export const LEAD_IN_SEC = 5;

export type BrewCue =
  | { readonly kind: "lead-in"; readonly stepIdx: number }
  | { readonly kind: "pour"; readonly stepIdx: number }
  | { readonly kind: "complete" };

// 트리거 시각이 반열림 구간 (prev, cur] 안에 든 큐들을 시간순으로 반환.
// 블룸(atSec<=0)은 큐 없음. lead-in은 시작 후(>0)이고 직전 푸어 경계보다
// 앞서지 않을 때만(간격<leadInSec면 생략). pour 큐는 항상 발화.
export const cuesBetween = (
  prev: number,
  cur: number,
  pours: readonly Pour[],
  totalTimeSec: number,
  leadInSec: number,
): BrewCue[] => {
  const out: { at: number; cue: BrewCue }[] = [];
  const inWindow = (t: number) => t > prev && t <= cur;

  for (let i = 0; i < pours.length; i++) {
    const at = pours[i]!.atSec;
    if (at <= 0) continue; // 블룸 / 시작 푸어
    const leadAt = at - leadInSec;
    const prevAt = i > 0 ? pours[i - 1]!.atSec : 0;
    if (leadAt > 0 && leadAt >= prevAt && inWindow(leadAt)) {
      out.push({ at: leadAt, cue: { kind: "lead-in", stepIdx: i } });
    }
    if (inWindow(at)) {
      out.push({ at, cue: { kind: "pour", stepIdx: i } });
    }
  }
  if (inWindow(totalTimeSec)) {
    out.push({ at: totalTimeSec, cue: { kind: "complete" } });
  }
  out.sort((a, b) => a.at - b.at);
  return out.map((o) => o.cue);
};

// 다음 푸어까지 남은 정수 초 — 단 lead-in 창(1..leadInSec) 안일 때만, 아니면 null.
// 히어로의 3·2·1 시각 카운트다운용.
export const leadInCountdown = (
  elapsed: number,
  pours: readonly Pour[],
  leadInSec: number,
): number | null => {
  const next = nextStepIdx(pours, elapsed);
  if (next === null) return null;
  const remaining = pours[next]!.atSec - elapsed;
  return remaining >= 1 && remaining <= leadInSec ? remaining : null;
};
