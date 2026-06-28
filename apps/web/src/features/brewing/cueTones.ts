import type { BrewCue } from "@pourover/domain/session";

export type ToneSpec = {
  readonly freqHz: readonly number[]; // 순차 재생할 음들
  readonly toneMs: number; // 각 음 길이
  readonly gapMs: number; // 음 사이 간격
  readonly peakGain: number; // 0..1
};

// 셋은 귀로 구분되게: 예고=낮고 짧게, 본 큐=또렷한 두 음, 완료=부드러운 하행.
export const CUE_TONES: Record<BrewCue["kind"], ToneSpec> = {
  "lead-in": { freqHz: [440], toneMs: 90, gapMs: 0, peakGain: 0.18 },
  pour: { freqHz: [660, 880], toneMs: 110, gapMs: 70, peakGain: 0.3 },
  complete: { freqHz: [880, 660, 440], toneMs: 140, gapMs: 40, peakGain: 0.22 },
};

export const VIBRATE_PATTERNS: Record<BrewCue["kind"], readonly number[]> = {
  "lead-in": [40],
  pour: [60, 50, 60],
  complete: [120],
};
