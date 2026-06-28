import { useEffect, useRef } from "react";
import { cuesBetween, LEAD_IN_SEC } from "@pourover/domain/session";
import type { Pour } from "@pourover/domain/types";
import type { CuePlayer } from "./cuePlayer";

type Args = {
  readonly elapsed: number;
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly player: CuePlayer;
  readonly muted: boolean;
  readonly active: boolean;
};

export function useBrewCues({
  elapsed,
  pours,
  totalTimeSec,
  player,
  muted,
  active,
}: Args): void {
  const prevRef = useRef(elapsed);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const prev = prevRef.current;
    if (elapsed === prev) return;
    if (elapsed > prev) {
      if (active) {
        for (const cue of cuesBetween(prev, elapsed, pours, totalTimeSec, LEAD_IN_SEC)) {
          player.play(cue.kind, mutedRef.current);
        }
      }
    }
    // 증가/감소 모두 prev 동기화 (감소는 클럭 리셋 — 큐 미발화)
    prevRef.current = elapsed;
  }, [elapsed, active, pours, totalTimeSec, player]);
}
