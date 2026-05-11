import { useEffect, useLayoutEffect, type RefObject } from "react";
import { elapsedRatio, type BrewSession } from "@pourover/domain/session";
import { toPct } from "@/ui/format";

const DRAWDOWN_HERO_OFFSET_PX = 8;

/**
 * Continuously sets liquid height + hero bottom inline styles via rAF,
 * bypassing React re-renders.
 *
 * - During pour phases: hero rides the meniscus (`bottom = fillPct + gap`).
 * - During drawdown: hero anchors just below the lastRing position so liquid
 *   rises past it and submerges it (text uses cream color in the JSX).
 *
 * `heroHeight` is measured by the caller's useLayoutEffect so this hook never
 * forces a reflow on the rAF hot path.
 */
export function useFillRatio(
  session: BrewSession,
  totalTimeSec: number,
  liquidRef: RefObject<HTMLElement | null>,
  heroRef: RefObject<HTMLElement | null>,
  maxRatio: number,
  isDrawdown: boolean,
  lastRingRatio: number,
  heroHeight: number,
  pausedAt: number | null = null,
): void {
  // Pre-formatted, since lastRingRatio + heroHeight are stable across frames.
  const drawdownBottom = `calc(${toPct(lastRingRatio)} - ${heroHeight + DRAWDOWN_HERO_OFFSET_PX}px)`;

  const apply = (): void => {
    const ratio = Math.min(
      elapsedRatio(session, totalTimeSec, pausedAt ?? Date.now()),
      maxRatio,
    );
    const pct = toPct(ratio);
    const liquidEl = liquidRef.current;
    const heroEl = heroRef.current;
    if (liquidEl) {
      liquidEl.style.height = pct;
    }
    if (heroEl) {
      heroEl.style.bottom = isDrawdown
        ? drawdownBottom
        : `calc(${pct} + var(--brewing-hero-gap))`;
    }
  };

  // Pre-paint sync — first paint and tests reading style.height immediately
  // after render get the correct value. Deps mean it only fires when params
  // change (not on every unrelated re-render).
  useLayoutEffect(apply);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      apply();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session,
    totalTimeSec,
    maxRatio,
    isDrawdown,
    lastRingRatio,
    heroHeight,
    pausedAt,
  ]);
}
