import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { s, g } from "@pourover/domain/units";
import type { Pour } from "@pourover/domain/types";
import type { CuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";

const pours: Pour[] = [
  { index: 0, atSec: s(0), pourAmount: g(30), cumulativeWater: g(30), label: "bloom" },
  { index: 1, atSec: s(45), pourAmount: g(120), cumulativeWater: g(150) },
];

function mkPlayer(): CuePlayer & { play: ReturnType<typeof vi.fn> } {
  return { unlock: vi.fn(), play: vi.fn() };
}

describe("useBrewCues", () => {
  it("elapsed 가 lead-in/pour 경계를 넘으면 player.play 를 순서대로 호출", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: false, active: true }),
      { initialProps: { elapsed: 39 } },
    );
    rerender({ elapsed: 40 }); // lead-in@40
    rerender({ elapsed: 45 }); // pour@45
    expect(player.play.mock.calls).toEqual([
      ["lead-in", false],
      ["pour", false],
    ]);
  });

  it("active=false 면 큐를 울리지 않되 prev 는 갱신 (재개 후 과거 큐 미발화)", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed, active }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: false, active }),
      { initialProps: { elapsed: 39, active: false } },
    );
    rerender({ elapsed: 46, active: false }); // 정지 중 40,45 통과 — 침묵
    rerender({ elapsed: 47, active: true }); // 재개 — 이미 지난 큐 안 울림
    expect(player.play).not.toHaveBeenCalled();
  });

  it("muted 를 인자로 전달", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: true, active: true }),
      { initialProps: { elapsed: 44 } },
    );
    rerender({ elapsed: 45 });
    expect(player.play).toHaveBeenCalledWith("pour", true);
  });

  it("큰 점프(백그라운드→복귀): 지나친 모든 큐를 시간순 1회씩", () => {
    // pours [bloom@0, @45], totalTimeSec 210. elapsed 39 → 210 으로 점프.
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: false, active: true }),
      { initialProps: { elapsed: 39 } },
    );
    rerender({ elapsed: 210 });
    expect(player.play.mock.calls).toEqual([
      ["lead-in", false], // @40
      ["pour", false], // @45
      ["complete", false], // @210
    ]);
  });

  it("브루 도중 muted 토글: 이후 큐에 최신 muted 반영, 과거 큐 재발화 없음", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed, muted }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted, active: true }),
      { initialProps: { elapsed: 39, muted: false } },
    );
    rerender({ elapsed: 40, muted: false }); // lead-in, 소리 ON
    rerender({ elapsed: 40, muted: true }); // 같은 elapsed 로 음소거 토글 — 재발화 없어야
    rerender({ elapsed: 45, muted: true }); // pour, 음소거 반영
    expect(player.play.mock.calls).toEqual([
      ["lead-in", false],
      ["pour", true],
    ]);
  });
});
