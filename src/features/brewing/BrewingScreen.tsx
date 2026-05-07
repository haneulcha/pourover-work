import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { activeStepIdx, pourLabel, type BrewSession } from "@/domain/session";
import type { Pour } from "@/domain/types";
import { formatTime } from "@/ui/format";
import { cx } from "@/ui/cx";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { useElapsed } from "./useElapsed";
import { useFillRatio } from "./useFillRatio";

type Props = {
  readonly session: BrewSession;
  readonly onExit: () => void;
  readonly onComplete: () => void;
};

const HERO_GAP_PX = 12; // mirrors --brewing-hero-gap in semantic.css
const HERO_SAFETY_PX = 8;
const MIN_FILL_RATIO = 0.2; // floor so liquid stays visible on tiny viewports
const RING_OVERLAP_TOLERANCE_PX = 4;

const RING_COLORS: Record<
  "below" | "next" | "future",
  { line: string; label: string }
> = {
  below: {
    line: "var(--color-ring-on-liquid)",
    label: "var(--color-ring-on-liquid-label)",
  },
  next: {
    line: "var(--color-text-ink)",
    label: "var(--color-text-ink)",
  },
  future: {
    line: "var(--color-ring-future)",
    label: "var(--color-text-muted)",
  },
};

export function BrewingScreen({ session, onExit, onComplete }: Props) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pauseOffsetMs, setPauseOffsetMs] = useState(0);
  const [manualStepFloor, setManualStepFloor] = useState(0);
  const completedRef = useRef(false);

  const effectiveSession = useMemo(
    () =>
      pauseOffsetMs === 0
        ? session
        : { ...session, startedAt: session.startedAt + pauseOffsetMs },
    [session, pauseOffsetMs],
  );
  const elapsed = useElapsed(effectiveSession, pausedAt);

  const {
    recipe: { pours, totalTimeSec },
  } = session;
  const clockIdx = activeStepIdx(pours, elapsed);
  const activeIdx = Math.min(
    pours.length - 1,
    Math.max(clockIdx, manualStepFloor),
  );
  const active = pours[activeIdx]!;
  const isLast = activeIdx === pours.length - 1;
  const done = elapsed >= totalTimeSec || manualStepFloor >= pours.length;

  const visibleRings = useMemo(() => pours.filter((p) => p.atSec > 0), [pours]);
  const nextRingIdx = visibleRings.findIndex((p) => p.atSec > elapsed);
  const lastRingAt = visibleRings.at(-1)?.atSec ?? 0;
  const isDrawdown = lastRingAt > 0 && elapsed >= lastRingAt;
  const lastRingRatio = totalTimeSec > 0 ? lastRingAt / totalTimeSec : 0;

  const cupRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const liquidRef = useRef<HTMLDivElement | null>(null);
  const [topRingFallback, setTopRingFallback] = useState(false);
  const [maxFillRatio, setMaxFillRatio] = useState(1);
  const [heroHeight, setHeroHeight] = useState(0);

  const effectiveMaxRatio = isDrawdown ? 1 : maxFillRatio;

  const handleSkip = () => {
    setManualStepFloor((prev) => Math.max(prev, clockIdx) + 1);
  };

  const handleStopRequest = () => {
    setPausedAt(Date.now());
    setStopDialogOpen(true);
  };

  const handleStopCancel = () => {
    if (pausedAt !== null) {
      setPauseOffsetMs((prev) => prev + (Date.now() - pausedAt));
      setPausedAt(null);
    }
    setStopDialogOpen(false);
  };

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  useLayoutEffect(() => {
    const cupEl = cupRef.current;
    const heroEl = heroRef.current;
    if (!cupEl) return;

    const update = () => {
      const cupH = cupEl.clientHeight;
      cupEl.style.setProperty("--cup-height", `${cupH}px`);

      if (!heroEl) return;
      const heroH = heroEl.offsetHeight;
      if (cupH === 0 || heroH === 0) {
        setMaxFillRatio(1);
        setTopRingFallback(false);
        setHeroHeight(0);
        return;
      }
      setHeroHeight(heroH);

      const reserved = heroH + HERO_GAP_PX + HERO_SAFETY_PX;
      const newMax = Math.max(
        MIN_FILL_RATIO,
        Math.min(1, (cupH - reserved) / cupH),
      );
      setMaxFillRatio(newMax);

      if (visibleRings.length > 0) {
        const heroBottomPx = newMax * cupH + HERO_GAP_PX;
        const heroTopPx = heroBottomPx + heroH;
        const ringPx = lastRingRatio * cupH;
        setTopRingFallback(
          ringPx >= heroBottomPx - RING_OVERLAP_TOLERANCE_PX &&
            ringPx <= heroTopPx + RING_OVERLAP_TOLERANCE_PX,
        );
      } else {
        setTopRingFallback(false);
      }
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(cupEl);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [visibleRings, lastRingRatio]);

  useFillRatio(
    effectiveSession,
    totalTimeSec,
    liquidRef,
    heroRef,
    effectiveMaxRatio,
    isDrawdown,
    lastRingRatio,
    heroHeight,
    pausedAt,
  );

  const phaseLabelText = pourLabel(active, activeIdx);

  return (
    <div className="relative mx-auto flex min-h-svh max-w-lg flex-col bg-surface text-text-primary">
      <AriaLiveStep session={session} activeIdx={activeIdx} />

      {/* RIM */}
      <header
        data-region="rim"
        className="relative z-10 flex h-brewing-rim items-start justify-between bg-surface px-5 pt-4"
      >
        <div className="flex items-start gap-4">
          <div>
            <div className="text-caption-xxs text-text-muted">경과</div>
            <div className="mt-0.5 text-heading-sm font-medium tabular-nums">
              {formatTime(elapsed)}
            </div>
          </div>
          {topRingFallback && visibleRings.length > 0 && (
            <div className="pt-1">
              <div className="text-caption-xxs text-text-muted">최종</div>
              <div className="mt-0.5 text-caption-sm tabular-nums text-text-secondary">
                {formatTime(visibleRings.at(-1)!.atSec)}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!done && (
            <button
              type="button"
              onClick={handleSkip}
              aria-label="다음 스텝으로 건너뛰기"
              className="flex min-h-11 items-center px-2 text-caption-sm text-text-muted hover:text-text-secondary"
            >
              건너뛰기 <span aria-hidden>›</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleStopRequest}
            className="flex min-h-11 items-center px-2 text-caption-sm text-text-muted hover:text-text-secondary"
          >
            중단
          </button>
        </div>
      </header>

      <FinishMarker totalTimeSec={totalTimeSec} />

      {/* CUP INTERIOR */}
      <div ref={cupRef} className="relative flex-1 overflow-hidden bg-surface">
        <div
          ref={liquidRef}
          data-testid="liquid"
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0"
          style={{
            background:
              "linear-gradient(180deg, var(--color-brewing-liquid-top) 0%, var(--color-brewing-liquid-mid) 32%, var(--color-brewing-liquid-deep) 78%, var(--color-brewing-liquid-bottom) 100%) no-repeat bottom / 100% var(--cup-height, 100%)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-0.5"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--color-meniscus-highlight), transparent)",
            }}
          />
        </div>

        {visibleRings.map((p, i) => {
          const variant: "below" | "next" | "future" =
            p.atSec <= elapsed
              ? "below"
              : i === nextRingIdx
                ? "next"
                : "future";
          const isTopRing = i === visibleRings.length - 1;
          return (
            <RingMarker
              key={p.index}
              pour={p}
              totalTimeSec={totalTimeSec}
              variant={variant}
              label={pourLabel(p, p.index)}
              hideLabel={isTopRing && topRingFallback}
            />
          );
        })}

        <div
          ref={heroRef}
          data-testid="hero"
          className="pointer-events-none absolute left-3.5 right-24"
        >
          <div
            className={cx(
              "text-caption-xxs font-semibold uppercase tracking-widest",
              isDrawdown ? "text-text-on-liquid" : "text-pour-bloom",
            )}
          >
            {isDrawdown ? (
              "드로우다운"
            ) : (
              <>
                지금 · <span>{phaseLabelText}</span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              data-testid="hero-weight"
              className={cx(
                "text-heading-md font-medium leading-none tabular-nums",
                isDrawdown ? "text-text-on-liquid" : "text-text-primary",
              )}
            >
              {active.cumulativeWater}
            </span>
            <span
              className={cx(
                "text-body-lg",
                isDrawdown
                  ? "text-text-on-liquid opacity-70"
                  : "text-text-muted",
              )}
            >
              g
            </span>
          </div>
          {!isDrawdown && (
            <div className="mt-1.5 text-body-sm text-text-secondary">
              +{active.pourAmount}g 붓기{isLast ? " · 마지막 푸어" : ""}
            </div>
          )}
        </div>
      </div>

      {stopDialogOpen && (
        <StopConfirmDialog
          onCancel={handleStopCancel}
          onConfirm={onExit}
        />
      )}
    </div>
  );
}

function FinishMarker({ totalTimeSec }: { readonly totalTimeSec: number }) {
  const mm = Math.floor(totalTimeSec / 60);
  const ss = totalTimeSec % 60;
  return (
    <div className="relative h-3 bg-surface" aria-hidden="false">
      <div
        className="pointer-events-none absolute left-3.5 right-24 top-1/2 -translate-y-1/2"
        style={{ height: "2px", background: "var(--color-bg-hairline)" }}
      />
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-caption-sm tabular-nums text-text-muted">
        <time aria-label={`완료, ${mm}분 ${ss}초`} dateTime={`PT${mm}M${ss}S`}>
          {formatTime(totalTimeSec)}
        </time>
        <span className="uppercase tracking-widest opacity-75">완료</span>
      </div>
    </div>
  );
}

function RingMarker({
  pour,
  totalTimeSec,
  variant,
  label,
  hideLabel = false,
}: {
  readonly pour: Pour;
  readonly totalTimeSec: number;
  readonly variant: "below" | "next" | "future";
  readonly label: string;
  readonly hideLabel?: boolean;
}) {
  const positionPct = `${((pour.atSec / totalTimeSec) * 100).toFixed(2)}%`;
  const colors = RING_COLORS[variant];
  return (
    <div
      data-testid={variant === "next" ? "ring-next" : undefined}
      data-ring-variant={variant}
      data-at-sec={pour.atSec}
      className="pointer-events-none absolute inset-x-0 z-[3] h-px"
      style={{ bottom: positionPct }}
    >
      <div
        className="absolute left-3.5 right-24 top-0"
        style={{
          height: variant === "next" ? "1.5px" : "1px",
          background: colors.line,
        }}
      />
      {!hideLabel && (
        <div
          className={cx(
            "absolute right-4 -top-1.5 flex items-center gap-1.5 text-caption-sm tabular-nums",
            variant === "next" && "font-semibold",
          )}
          style={{ color: colors.label }}
        >
          <time
            aria-label={`${label} 경계, ${Math.floor(pour.atSec / 60)}분 ${pour.atSec % 60}초`}
            dateTime={`PT${Math.floor(pour.atSec / 60)}M${pour.atSec % 60}S`}
          >
            {formatTime(pour.atSec)}
          </time>
          <span className="uppercase tracking-widest opacity-75">{label}</span>
        </div>
      )}
    </div>
  );
}

function AriaLiveStep({
  session,
  activeIdx,
}: {
  readonly session: BrewSession;
  readonly activeIdx: number;
}) {
  const [announced, setAnnounced] = useState<string>("");
  useEffect(() => {
    const pour = session.recipe.pours[activeIdx];
    if (!pour) return;
    setAnnounced(
      `${pourLabel(pour, activeIdx)}: ${pour.cumulativeWater}그램까지`,
    );
  }, [session, activeIdx]);
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {announced}
    </span>
  );
}
