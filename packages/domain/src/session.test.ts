import { describe, expect, it } from "vitest";
import type { Pour, Recipe } from "./types";
import { c, g, ratio, s } from "./units";
import {
  activeStepIdx,
  elapsedSec,
  isComplete,
  nextStepIdx,
  sessionDurationSec,
  type BrewSession,
} from "./session";

const mkPour = (
  i: number,
  atSec: number,
  amt: number,
  cum: number,
  bloom = false,
): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
  ...(bloom ? { label: "bloom" as const } : {}),
});

const recipe: Recipe = {
  method: "hoffmann_v60",
  dripper: "v60",
  coffee: g(15),
  totalWater: g(250),
  ratio: ratio(16.67),
  temperature: c(93),
  pours: [
    mkPour(0, 0, 30, 30, true),
    mkPour(1, 45, 120, 150),
    mkPour(2, 75, 100, 250),
  ],
  totalTimeSec: s(210),
  grindHint: "medium-fine",
  notes: [],
};

const session: BrewSession = { recipe, startedAt: 1_000_000 };

describe("elapsedSec", () => {
  it("clamps to 0 when now < startedAt", () => {
    expect(elapsedSec(session, 999_000)).toBe(0);
  });

  it("floors to integer seconds", () => {
    expect(elapsedSec(session, 1_000_500)).toBe(0);
    expect(elapsedSec(session, 1_001_999)).toBe(1);
    expect(elapsedSec(session, 1_045_000)).toBe(45);
  });
});

describe("activeStepIdx", () => {
  it("returns 0 at elapsed=0 (first pour active)", () => {
    expect(activeStepIdx(recipe.pours, 0)).toBe(0);
  });

  it("returns 0 while elapsed < next pour atSec", () => {
    expect(activeStepIdx(recipe.pours, 44)).toBe(0);
  });

  it("advances to 1 when elapsed reaches 2nd pour atSec", () => {
    expect(activeStepIdx(recipe.pours, 45)).toBe(1);
    expect(activeStepIdx(recipe.pours, 74)).toBe(1);
  });

  it("advances to last pour", () => {
    expect(activeStepIdx(recipe.pours, 75)).toBe(2);
    expect(activeStepIdx(recipe.pours, 9999)).toBe(2);
  });

  it("handles negative elapsed as 0", () => {
    expect(activeStepIdx(recipe.pours, -5)).toBe(0);
  });
});

describe("nextStepIdx", () => {
  it("returns next pour index when one exists", () => {
    expect(nextStepIdx(recipe.pours, 0)).toBe(1);
    expect(nextStepIdx(recipe.pours, 45)).toBe(2);
  });

  it("returns null when no next pour", () => {
    expect(nextStepIdx(recipe.pours, 75)).toBeNull();
    expect(nextStepIdx(recipe.pours, 999)).toBeNull();
  });
});

describe("sessionDurationSec", () => {
  it("returns elapsed seconds between startedAt and completedAt", () => {
    const completed: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 1_180_000,
    };
    expect(sessionDurationSec(completed)).toBe(180);
  });

  it("floors to integer seconds", () => {
    const completed: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 1_180_750,
    };
    expect(sessionDurationSec(completed)).toBe(180);
  });

  it("falls back to recipe.totalTimeSec when completedAt missing", () => {
    expect(sessionDurationSec(session)).toBe(210);
  });

  it("clamps negative to 0", () => {
    const weird: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 999_000,
    };
    expect(sessionDurationSec(weird)).toBe(0);
  });
});

describe("isComplete", () => {
  it("is false while elapsed < totalTimeSec", () => {
    expect(isComplete(session, 1_209_000)).toBe(false); // 209s elapsed
  });

  it("is true at totalTimeSec boundary", () => {
    expect(isComplete(session, 1_210_000)).toBe(true); // 210s elapsed
  });

  it("is true past totalTimeSec", () => {
    expect(isComplete(session, 2_000_000)).toBe(true);
  });
});
