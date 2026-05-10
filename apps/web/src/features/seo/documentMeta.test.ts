import { describe, expect, it } from "vitest";
import { brewMethods } from "@pourover/domain/methods";
import type { Recipe } from "@pourover/domain/types";
import { c, g, ratio, s } from "@pourover/domain/units";
import { DEFAULT_STATE } from "@/features/app/state";
import type { AppState } from "@/features/app/state";
import {
  BASE_URL,
  DEFAULT_META,
  buildMeta,
} from "@/features/seo/documentMeta";

const recipeState: AppState = {
  ...DEFAULT_STATE,
  screen: "recipe",
  coffee: g(15),
  dripper: "v60",
  method: "kasuya_4_6",
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
};

const makeRecipe = (): Recipe => ({
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(15),
  totalWater: g(225),
  ratio: ratio(15),
  temperature: c(92),
  pours: [
    { index: 0, atSec: s(0), pourAmount: g(45), cumulativeWater: g(45), label: "bloom" },
    { index: 1, atSec: s(45), pourAmount: g(45), cumulativeWater: g(90) },
    { index: 2, atSec: s(90), pourAmount: g(135), cumulativeWater: g(225) },
  ],
  totalTimeSec: s(210),
  grindHint: "medium",
  notes: [],
});

describe("buildMeta", () => {
  it("returns DEFAULT_META for wall screen", () => {
    const wallState: AppState = { ...recipeState, screen: "wall" };
    expect(buildMeta(wallState, makeRecipe())).toEqual(DEFAULT_META);
  });

  it("builds title with dripper, method, coffee, and ratio for recipe screen", () => {
    const meta = buildMeta(recipeState, makeRecipe());
    expect(meta.title).toBe("V60 · Kasuya 4:6 (15g · 1:15) | 핸드드립 계산기");
  });

  it("builds description with roast, coffee, water, pour count, and taste", () => {
    const meta = buildMeta(recipeState, makeRecipe());
    expect(meta.description).toBe(
      "중배전 15g · 물 225g · 3차 푸어. 밸런스 / 미디엄.",
    );
  });

  it("keeps description within 160 characters", () => {
    const meta = buildMeta(recipeState, makeRecipe());
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });

  it("builds canonical url from BASE_URL and encoded state", () => {
    const meta = buildMeta(recipeState, makeRecipe());
    expect(meta.canonical.startsWith(`${BASE_URL}/?`)).toBe(true);
    expect(meta.canonical).toContain("m=kasuya_4_6");
    expect(meta.canonical).toContain("d=v60");
    expect(meta.canonical).toContain("c=15");
  });

  it("generates a title for every registered brew method", () => {
    for (const id of Object.keys(brewMethods)) {
      const state: AppState = {
        ...recipeState,
        method: id as AppState["method"],
      };
      const meta = buildMeta(state, makeRecipe());
      expect(meta.title).toContain(brewMethods[id as AppState["method"]].name);
      expect(meta.title.endsWith("| 핸드드립 계산기")).toBe(true);
    }
  });
});
