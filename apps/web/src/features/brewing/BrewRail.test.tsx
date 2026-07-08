import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Pour } from "@pourover/domain/types";
import { g, s } from "@pourover/domain/units";
import { BrewRail } from "./BrewRail";

const mkPour = (i: number, atSec: number, amt: number, cum: number): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
});

// 45s·75s 경계, 총 210s — BrewingScreen 테스트와 같은 레시피 골격
const pours = [
  mkPour(0, 0, 30, 30),
  mkPour(1, 45, 120, 150),
  mkPour(2, 75, 100, 250),
];

const renderRail = (elapsed: number) =>
  render(<BrewRail pours={pours} totalTimeSec={210} elapsed={elapsed} />);

describe("BrewRail — 세그먼트", () => {
  it("푸어 개수만큼 세그먼트, 경과에 따라 구간별 채움", () => {
    renderRail(60);
    const fills = screen.getAllByTestId("brew-rail-fill");
    expect(fills).toHaveLength(3);
    // CSSOM이 "100.00%" → "100%"로 소수점 0을 정규화한다
    expect(fills[0]!.style.width).toBe("100%"); // 0–45 완료
    expect(fills[1]!.style.width).toBe("50%"); // (60-45)/(75-45)
    expect(fills[2]!.style.width).toBe("0%"); // 미도달
  });

  it("경계 마커(물방울)를 렌더하지 않는다 — 구간 사이 틈이 곧 경계", () => {
    renderRail(60);
    expect(screen.queryByTestId("brew-rail-drop")).toBeNull();
  });
});
