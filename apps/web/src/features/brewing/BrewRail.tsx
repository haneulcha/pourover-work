import type { Pour } from "@pourover/domain/types";
import { LEAD_IN_SEC } from "@pourover/domain/session";
import { toPct } from "@/ui/format";
import "./BrewRail.css";

// 물방울 실루엣 (viewBox 10×13) — 꼭지가 위, 배가 아래
const DROP_PATH =
  "M5 0.5 C5 0.5 0.8 6 0.8 8.6 a4.2 4.2 0 0 0 8.4 0 C9.2 6 5 0.5 5 0.5 Z";

const GAP_HALF = "var(--size-brewing-rail-gap) / 2";

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

type Props = {
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly elapsed: number;
};

// 진행 레일 "이음" — 붓기 경계마다 트랙이 끊겨 있고, 그 틈 위에 다음 붓기의 물방울이
// 맺혀 자란다. 붓는 순간 방울이 틈으로 스며들어 끊긴 선을 하나로 잇는다(흡수 전환은
// data-passed 플립에 반응하는 BrewRail.css 트랜지션이 담당).
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
      {pours.slice(1).map((pour, i) => {
        const prevAtSec = pours[i]!.atSec;
        const level = clamp01((elapsed - prevAtSec) / (pour.atSec - prevAtSec));
        const passed = elapsed >= pour.atSec;
        const soon = !passed && pour.atSec - elapsed <= LEAD_IN_SEC;
        return (
          <div
            key={pour.index}
            data-testid="brew-rail-drop"
            data-passed={passed ? "true" : "false"}
            data-soon={soon ? "true" : "false"}
            className="brew-rail-boundary"
            style={{ left: toPct(pour.atSec / totalTimeSec) }}
          >
            <div className="brew-rail-bridge" />
            <div
              className="brew-rail-drop"
              style={{
                transform: `translateX(-50%) scale(${(0.25 + 0.75 * level).toFixed(3)})`,
                opacity: level === 0 ? 0.35 : 1,
              }}
            >
              <div className="brew-rail-drop-sink">
                <svg className="brew-rail-drop-svg" viewBox="0 0 10 13">
                  <path d={DROP_PATH} />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
