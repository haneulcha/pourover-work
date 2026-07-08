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

  it("세그먼트가 시간 비례 위치에 놓인다 (경계 틈 = gap의 절반씩)", () => {
    renderRail(0);
    const segs = screen
      .getAllByTestId("brew-rail-fill")
      .map((fill) => fill.parentElement as HTMLElement);
    expect(segs[0]!.style.left).toBe("0px");
    expect(segs[1]!.style.left).toBe(
      "calc(21.43% + var(--size-brewing-rail-gap) / 2)", // 45/210
    );
    expect(segs[2]!.style.left).toBe(
      "calc(35.71% + var(--size-brewing-rail-gap) / 2)", // 75/210
    );
    expect(segs[2]!.style.right).toBe("0px");
  });
});
