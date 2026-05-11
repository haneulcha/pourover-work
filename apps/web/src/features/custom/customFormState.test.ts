import { describe, it, expect } from "vitest";
import { g, s } from "@pourover/domain/units";
import { brewMethods } from "@pourover/domain/methods";
import {
  customReducer, fromRecipe, initialBlankState, toCustomInput,
} from "./customFormState";

describe("initialBlankState", () => {
  it("V60 + 15g coffee + 1:15 ratio + 5 푸어, lockLastPour=true, 첫 푸어 bloom", () => {
    const s0 = initialBlankState();
    expect(s0.dripper).toBe("v60");
    expect(s0.coffee as number).toBe(15);
    expect(s0.totalWater as number).toBe(225);
    expect(s0.lockLastPour).toBe(true);
    expect(s0.pours[0]!.atSec as number).toBe(0);
    expect(s0.pours[0]!.label).toBe("bloom");
  });
});

describe("fromRecipe / toCustomInput", () => {
  it("Kasuya 4:6 → form state → CustomRecipeInput", () => {
    const recipe = brewMethods.kasuya_4_6.compute({
      method: "kasuya_4_6", dripper: "v60", coffee: g(15),
      roast: "medium", taste: { sweetness: "balanced", strength: "medium" },
    });
    const fs = fromRecipe(recipe);
    expect(fs.totalWater).toBe(recipe.totalWater);
    expect(fs.pours.length).toBe(recipe.pours.length);
    const input = toCustomInput(fs);
    const sum = input.pours.reduce((a, p) => a + (p.pourAmount as number), 0);
    expect(sum).toBeCloseTo(recipe.totalWater as number, 2);
  });
});

describe("customReducer", () => {
  const s0 = initialBlankState();

  it("setCoffee: 변경", () => {
    const s1 = customReducer(s0, { type: "setCoffee", value: g(20) });
    expect(s1.coffee as number).toBe(20);
  });

  it("setTotalWater + lockLastPour=true 시 toCustomInput 통과 후 마지막 pour 자동 보정", () => {
    const s1 = customReducer(s0, { type: "setTotalWater", value: g(300) });
    expect(s1.totalWater as number).toBe(300);
    const input = toCustomInput(s1);
    const sum = input.pours.reduce((a, p) => a + (p.pourAmount as number), 0);
    expect(sum).toBe(300);
  });

  it("setPourAmount: 특정 행의 pourAmount 갱신", () => {
    const s1 = customReducer(s0, { type: "setPourAmount", index: 1, value: g(60) });
    expect(s1.pours[1]!.pourAmount as number).toBe(60);
  });

  it("setPourAtSec: 5초 snap", () => {
    const s1 = customReducer(s0, { type: "setPourAtSec", index: 1, value: s(47) });
    expect(s1.pours[1]!.atSec as number).toBe(45);
  });

  it("setPourAtSec: 첫 행은 0 잠금", () => {
    const s1 = customReducer(s0, { type: "setPourAtSec", index: 0, value: s(10) });
    expect(s1.pours[0]!.atSec as number).toBe(0);
  });

  it("addPour: 마지막 다음 시점에 삽입", () => {
    const s1 = customReducer(s0, { type: "addPour" });
    expect(s1.pours.length).toBe(s0.pours.length + 1);
  });

  it("removePour: index 1 삭제, 첫 행은 삭제 불가", () => {
    const s1 = customReducer(s0, { type: "removePour", index: 1 });
    expect(s1.pours.length).toBe(s0.pours.length - 1);
    const s2 = customReducer(s0, { type: "removePour", index: 0 });
    expect(s2.pours.length).toBe(s0.pours.length);
  });

  it("toggleBloom: 첫 행 label 토글", () => {
    const s1 = customReducer(s0, { type: "toggleBloom" });
    expect(s1.pours[0]!.label).toBeUndefined();
    const s2 = customReducer(s1, { type: "toggleBloom" });
    expect(s2.pours[0]!.label).toBe("bloom");
  });

  it("setLockLastPour: 토글", () => {
    const s1 = customReducer(s0, { type: "setLockLastPour", value: false });
    expect(s1.lockLastPour).toBe(false);
  });

  it("selectPour: UI selection", () => {
    const s1 = customReducer(s0, { type: "selectPour", index: 2 });
    expect(s1.selectedPourIndex).toBe(2);
  });

  it("reset: 빈 상태로 복원", () => {
    const dirty = customReducer(s0, { type: "setCoffee", value: g(20) });
    const back = customReducer(dirty, { type: "reset" });
    expect(back).toEqual(initialBlankState());
  });

  it("setTotalTimeSec: 마지막 pour atSec보다 작으면 cascade 클램프 + 단조성 유지", () => {
    const s1 = customReducer(s0, { type: "setTotalTimeSec", value: s(60) });
    expect(s1.totalTimeSec as number).toBe(60);
    s1.pours.forEach((p) => {
      expect(p.atSec as number).toBeLessThanOrEqual(60);
    });
    for (let i = 1; i < s1.pours.length; i++) {
      expect(s1.pours[i]!.atSec as number).toBeGreaterThan(
        s1.pours[i - 1]!.atSec as number,
      );
    }
  });
});
