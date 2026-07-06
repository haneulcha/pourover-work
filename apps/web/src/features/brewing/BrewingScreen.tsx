import { useEffect, useMemo, useRef, useState } from "react";
import {
  activeStepIdx,
  brewPhase,
  LEAD_IN_SEC,
  leadInCountdown,
  pourLabel,
  type BrewSession,
} from "@pourover/domain/session";
import type { Pour } from "@pourover/domain/types";
import { createCuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";
import { useCueMuted } from "./useCueMuted";
import { formatTime } from "@/ui/format";
import { cx } from "@/ui/cx";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { useElapsed } from "./useElapsed";
import { useScreenWakeLock } from "./useScreenWakeLock";

type Props = {
  readonly session: BrewSession;
  readonly onExit: () => void;
  readonly onComplete: () => void;
};

const LONG_PRESS_MS = 600;

export function BrewingScreen({ session, onExit, onComplete }: Props) {
  useScreenWakeLock();
  const player = useMemo(() => createCuePlayer(), []);
  const [muted, toggleMuted] = useCueMuted();
  useEffect(() => {
    player.unlock(); // 브루잉 진입 = 시작 탭 제스처 직후 → iOS 오디오 잠금 해제
  }, [player]);

  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [tapPos, setTapPos] = useState(0);
  const completedRef = useRef(false);

  const elapsed = useElapsed(session);
  const {
    recipe: { pours, totalTimeSec },
  } = session;

  useBrewCues({ elapsed, pours, totalTimeSec, player, muted, active: true });

  const phase = brewPhase(pours, totalTimeSec, elapsed, tapPos);
  const completePos = 2 * pours.length;
  const done = elapsed >= totalTimeSec || tapPos >= completePos;
  // 리드인 창에서는 wait 중에도 배경을 미리 물들여 "곧이야"를 예고 (소리 큐와 동기)
  const accent = phase.kind === "pour" || leadInCountdown(elapsed, pours, LEAD_IN_SEC) !== null;

  // 구석 정보·aria-live용 현재 스텝 (wait는 방금 부은 스텝에 머무름)
  const stepIdx =
    phase.kind === "pour"
      ? phase.stepIdx
      : phase.kind === "wait"
        ? phase.nextIdx - 1
        : pours.length - 1;

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  const advance = () => {
    const clockPos = 2 * activeStepIdx(pours, elapsed);
    setTapPos((prev) => Math.min(completePos, Math.max(clockPos, prev) + 1));
  };

  // 길게 누르기(중단) vs 탭(전진) — 길게 누르기로 판정되면 그 제스처의 click은 무시
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setStopDialogOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleTap = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    advance();
  };

  const tapLabel =
    phase.kind === "pour"
      ? "붓기 완료"
      : phase.kind === "wait"
        ? "다음 푸어로 건너뛰기"
        : "브루잉 완료";
  const fgMuted = accent
    ? "text-brewing-pour-fg-muted"
    : "text-brewing-wait-fg-muted";

  return (
    <div
      data-testid="brewing-screen"
      data-accent={accent ? "true" : "false"}
      className={cx(
        "relative mx-auto flex min-h-svh max-w-lg select-none flex-col transition-colors",
        accent
          ? "bg-brewing-pour-bg text-brewing-pour-fg duration-leadin"
          : "bg-brewing-wait-bg text-brewing-wait-fg duration-long",
      )}
    >
      <AriaLiveStep session={session} activeIdx={stepIdx} />

      <header className="flex items-center justify-between px-5 pt-4">
        <div className={cx("text-caption-sm tabular-nums", fgMuted)}>
          {formatTime(elapsed)} / {formatTime(totalTimeSec)} · {stepIdx + 1}/
          {pours.length}
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          aria-label={muted ? "큐 소리 켜기" : "큐 소리 끄기"}
          className={cx("flex min-h-11 items-center px-2 text-caption-sm", fgMuted)}
        >
          {muted ? "소리 꺼짐" : "소리"}{" "}
          <span aria-hidden>{muted ? "🔇" : "🔔"}</span>
        </button>
      </header>

      <button
        type="button"
        data-testid="tap-area"
        aria-label={tapLabel}
        onClick={handleTap}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-1 touch-manipulation flex-col items-center justify-center px-5 text-center"
      >
        {phase.kind === "pour" ? (
          <PourView
            pour={pours[phase.stepIdx]!}
            stepIdx={phase.stepIdx}
            isLast={phase.stepIdx === pours.length - 1}
            fgMuted={fgMuted}
          />
        ) : (
          <CountdownView
            remainingSec={phase.remainingSec}
            next={phase.kind === "wait" ? pours[phase.nextIdx]! : null}
            nextIdx={phase.kind === "wait" ? phase.nextIdx : null}
            fgMuted={fgMuted}
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => setStopDialogOpen(true)}
        className={cx("pb-5 pt-2 text-caption-sm", fgMuted)}
      >
        길게 눌러 중단
      </button>

      {stopDialogOpen && (
        <StopConfirmDialog
          onCancel={() => setStopDialogOpen(false)}
          onConfirm={onExit}
        />
      )}
    </div>
  );
}

function PourView({
  pour,
  stepIdx,
  isLast,
  fgMuted,
}: {
  readonly pour: Pour;
  readonly stepIdx: number;
  readonly isLast: boolean;
  readonly fgMuted: string;
}) {
  return (
    <>
      <span
        className={cx(
          "text-caption-xxs font-semibold uppercase tracking-widest",
          fgMuted,
        )}
      >
        지금 부어 · {pourLabel(pour, stepIdx)}
      </span>
      <span
        data-testid="big-number"
        className="mt-2 block text-display-xl tabular-nums"
      >
        {pour.cumulativeWater}
        <span className="text-heading-lg">g</span>
      </span>
      <span className={cx("mt-2 block text-body-md", fgMuted)}>
        +{pour.pourAmount}g{isLast ? " · 마지막" : ""}
      </span>
    </>
  );
}

function CountdownView({
  remainingSec,
  next,
  nextIdx,
  fgMuted,
}: {
  readonly remainingSec: number;
  readonly next: Pour | null;
  readonly nextIdx: number | null;
  readonly fgMuted: string;
}) {
  return (
    <>
      <span
        className={cx(
          "text-caption-xxs font-semibold uppercase tracking-widest",
          fgMuted,
        )}
      >
        {next ? "기다려" : "드로우다운"}
      </span>
      <span
        data-testid="big-number"
        className="mt-2 block text-display-xl tabular-nums"
      >
        {formatTime(remainingSec)}
      </span>
      {next && nextIdx !== null && (
        <span className={cx("mt-2 block text-body-md", fgMuted)}>
          다음 · {pourLabel(next, nextIdx)} {next.cumulativeWater}g
        </span>
      )}
    </>
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
  const isFirst = useRef(true);
  useEffect(() => {
    // 초기 마운트 시 발화 생략 — 스크린리더는 화면을 직접 읽음. aria-live는 변화만 고지.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
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
