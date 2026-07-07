import { useEffect, useMemo, useRef, useState } from "react";
import {
  activeStepIdx,
  LEAD_IN_SEC,
  leadInCountdown,
  nextStepIdx,
  pourLabel,
  type BrewSession,
} from "@pourover/domain/session";
import { createCuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";
import { useCueMuted } from "./useCueMuted";
import { formatTime } from "@/ui/format";
import { cx } from "@/ui/cx";
import { BrewRail } from "./BrewRail";
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
  const completedRef = useRef(false);

  const elapsed = useElapsed(session);
  const {
    recipe: { pours, totalTimeSec },
  } = session;

  useBrewCues({ elapsed, pours, totalTimeSec, player, muted, active: true });

  const activeIdx = activeStepIdx(pours, elapsed);
  const active = pours[activeIdx]!;
  const isLast = activeIdx === pours.length - 1;
  const nextIdx = nextStepIdx(pours, elapsed);
  const nextAt = nextIdx !== null ? pours[nextIdx]!.atSec : totalTimeSec;
  const remaining = Math.max(0, nextAt - elapsed);
  // 리드인 창에는 배경을 미리 물들여 "곧이야"를 예고 (소리 큐와 동기)
  const accent = leadInCountdown(elapsed, pours, LEAD_IN_SEC) !== null;
  const done = elapsed >= totalTimeSec;

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  // 길게 누르기 = 중단. 화면은 표시 전용이라 탭 제스처는 없다.
  const longPressTimer = useRef<number | null>(null);
  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => {
      setStopDialogOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const fgMuted = accent
    ? "text-brewing-leadin-fg-muted"
    : "text-brewing-base-fg-muted";

  return (
    <div
      data-testid="brewing-screen"
      data-accent={accent ? "true" : "false"}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onContextMenu={(e) => e.preventDefault()}
      className={cx(
        "relative mx-auto flex min-h-svh max-w-lg select-none flex-col transition-colors",
        accent
          ? "bg-brewing-leadin-bg text-brewing-leadin-fg duration-leadin"
          : "bg-brewing-base-bg text-brewing-base-fg duration-long",
      )}
    >
      <AriaLiveStep session={session} activeIdx={activeIdx} />

      <header className="flex items-center justify-between px-5 pt-4">
        <div className={cx("text-caption-sm tabular-nums", fgMuted)}>
          {formatTime(elapsed)} / {formatTime(totalTimeSec)} · {activeIdx + 1}/
          {pours.length}
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          aria-label={muted ? "큐 소리 켜기" : "큐 소리 끄기"}
          className={cx(
            "flex min-h-11 items-center px-2 text-caption-sm",
            fgMuted,
          )}
        >
          {muted ? "소리 꺼짐" : "소리"}{" "}
          <span aria-hidden>{muted ? "🔇" : "🔔"}</span>
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <span
          className={cx(
            "text-caption-xxs font-semibold uppercase tracking-widest",
            fgMuted,
          )}
        >
          지금 · {pourLabel(active, activeIdx)}
        </span>
        <span
          data-testid="big-number"
          className="mt-2 block text-display-xl tabular-nums"
        >
          {active.cumulativeWater}
          <span className="text-heading-lg">g</span>
        </span>
        <span className={cx("mt-2 block text-body-md tabular-nums", fgMuted)}>
          +{active.pourAmount}g{isLast ? " · 마지막" : ""}
        </span>
        <span
          data-testid="countdown"
          className="mt-6 block text-heading-xs tabular-nums"
        >
          <span className={cx("font-normal", fgMuted)}>
            {isLast ? "완료까지" : "다음 붓기까지"}{" "}
          </span>
          {formatTime(remaining)}
        </span>
      </div>

      <BrewRail pours={pours} totalTimeSec={totalTimeSec} elapsed={elapsed} />

      <button
        type="button"
        onClick={() => setStopDialogOpen(true)}
        className={cx("pb-5 pt-3 text-caption-sm", fgMuted)}
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

function AriaLiveStep({
  session,
  activeIdx,
}: {
  readonly session: BrewSession;
  readonly activeIdx: number;
}) {
  const [announced, setAnnounced] = useState<string>("");
  // 초기 마운트 발화 생략 — 스크린리더는 화면을 직접 읽음. aria-live는 변화만 고지.
  // (ref 초기값 = 현재 idx 비교라 StrictMode의 effect 재실행에도 안전)
  const prevIdx = useRef(activeIdx);
  useEffect(() => {
    if (prevIdx.current === activeIdx) return;
    prevIdx.current = activeIdx;
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
