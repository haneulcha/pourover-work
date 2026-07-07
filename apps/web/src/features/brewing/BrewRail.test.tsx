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
});

describe("BrewRail — 물방울", () => {
  it("붓기 경계(atSec>0)마다 시간 비례 위치에 방울", () => {
    renderRail(0);
    const drops = screen.getAllByTestId("brew-rail-drop");
    expect(drops).toHaveLength(2);
    expect(drops[0]!.style.left).toBe("21.43%"); // 45/210
    expect(drops[1]!.style.left).toBe("35.71%"); // 75/210
  });

  it("구간 경과에 비례해 자란다 (scale 0.25→1)", () => {
    renderRail(60); // 45–75 구간 절반
    const drops = screen.getAllByTestId("brew-rail-drop");
    const growing = drops[1]!.querySelector<HTMLElement>(".brew-rail-drop")!;
    expect(growing.style.transform).toContain("scale(0.625)");
  });

  it("지난 경계는 흡수 상태(passed)", () => {
    renderRail(60);
    const drops = screen.getAllByTestId("brew-rail-drop");
    expect(drops[0]!.dataset.passed).toBe("true");
    expect(drops[1]!.dataset.passed).toBe("false");
  });

  it("리드인 창(5초 전)에는 soon — 지난 경계는 제외", () => {
    renderRail(71); // 75초 경계 4초 전
    const drops = screen.getAllByTestId("brew-rail-drop");
    expect(drops[1]!.dataset.soon).toBe("true");
    expect(drops[0]!.dataset.soon).toBe("false");
  });
});
