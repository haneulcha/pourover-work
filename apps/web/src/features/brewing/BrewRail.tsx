import type { Pour } from "@pourover/domain/types";
import { toPct } from "@/ui/format";
import "./BrewRail.css";

const GAP_HALF = "var(--size-brewing-rail-gap) / 2";

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

type Props = {
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly elapsed: number;
};

// 진행 레일 "스텝 필" — 붓기마다 분리된 pill 구간, 구간 사이 틈이 곧 붓기 경계
// (별도 마커 없음). 채움 폭은 useElapsed 250ms 틱 사이를 CSS transition이 보간.
// 정보는 구석 텍스트·aria-live가 담당하므로 레일 자체는 장식(aria-hidden).
export function BrewRail({ pours, totalTimeSec, elapsed }: Props) {
  if (totalTimeSec <= 0) return null;

  const segments = pours.map((pour, i) => ({
    startSec: pour.atSec,
    endSec: pours[i + 1]?.atSec ?? totalTimeSec,
  }));

  return (
    <div data-testid="brew-rail" aria-hidden="true" className="brew-rail mx-5">
      {segments.map((seg) => (
        <div
          key={seg.startSec}
          className="brew-rail-seg"
          style={{
            left:
              seg.startSec === 0
                ? "0"
                : `calc(${toPct(seg.startSec / totalTimeSec)} + ${GAP_HALF})`,
            right:
              seg.endSec >= totalTimeSec
                ? "0"
                : `calc(${toPct(1 - seg.endSec / totalTimeSec)} + ${GAP_HALF})`,
          }}
        >
          <div
            data-testid="brew-rail-fill"
            className="brew-rail-seg-fill"
            style={{
              width: toPct(
                clamp01((elapsed - seg.startSec) / (seg.endSec - seg.startSec)),
              ),
            }}
          />
        </div>
      ))}
    </div>
  );
}
