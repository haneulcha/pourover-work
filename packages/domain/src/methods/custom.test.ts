import { describe, it, expect } from "vitest";
import { c, g, s } from "../units";
import { buildCustomRecipe, type CustomRecipeInput } from "./custom";
import { brewMethods } from "./index";
import type { Recipe, RecipeInput } from "../types";

const baseInput: CustomRecipeInput = {
  dripper: "v60",
  coffee: g(15),
  totalWater: g(225),
  temperature: c(92),
  grindHint: "medium",
  totalTimeSec: s(170),
  pours: [
    { atSec: s(0), pourAmount: g(30), label: "bloom" },
    { atSec: s(45), pourAmount: g(50) },
    { atSec: s(90), pourAmount: g(60) },
    { atSec: s(140), pourAmount: g(50) },
    { atSec: s(170), pourAmount: g(35) },
  ],
};

describe("buildCustomRecipe", () => {
  it("권장 케이스 스냅샷", () => {
    const r = buildCustomRecipe(baseInput);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe).toMatchSnapshot();
  });
  it("ratio = totalWater/coffee", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.ratio).toBe(15);
  });
  it("cumulativeWater 누적", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.pours.map((p) => p.cumulativeWater)).toEqual([30, 80, 140, 190, 225]);
  });
  it("index = 0..n-1", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.pours.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
  });
  it("method='custom', notes=[]", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.method).toBe("custom");
    expect(r.recipe.notes).toEqual([]);
  });
});

describe("buildCustomRecipe invariants", () => {
  it("coffee-non-positive", () => {
    const r = buildCustomRecipe({ ...baseInput, coffee: g(0) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ kind: "coffee-non-positive" });
  });

  it("water-non-positive", () => {
    const r = buildCustomRecipe({ ...baseInput, totalWater: g(0) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => e.kind === "water-non-positive")).toBe(true);
  });

  it("time-non-positive", () => {
    const r = buildCustomRecipe({ ...baseInput, totalTimeSec: s(0) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => e.kind === "time-non-positive")).toBe(true);
  });

  it("no-pours", () => {
    const r = buildCustomRecipe({ ...baseInput, pours: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ kind: "no-pours" });
  });

  it("first-pour-not-zero", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      pours: [{ atSec: s(5), pourAmount: g(225) }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ kind: "first-pour-not-zero" });
  });

  it("non-monotonic-time", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      totalWater: g(225),
      pours: [
        { atSec: s(0), pourAmount: g(100), label: "bloom" },
        { atSec: s(0), pourAmount: g(125) },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(
      r.errors.some((e) => e.kind === "non-monotonic-time" && e.pourIndex === 1),
    ).toBe(true);
  });

  it("pour-after-total-time", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      totalTimeSec: s(60),
      totalWater: g(225),
      pours: [
        { atSec: s(0), pourAmount: g(100), label: "bloom" },
        { atSec: s(120), pourAmount: g(125) },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(
      r.errors.some((e) => e.kind === "pour-after-total-time" && e.pourIndex === 1),
    ).toBe(true);
  });

  it("non-positive-pour", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      pours: [
        { atSec: s(0), pourAmount: g(0), label: "bloom" },
        { atSec: s(45), pourAmount: g(50) },
        { atSec: s(90), pourAmount: g(60) },
        { atSec: s(140), pourAmount: g(50) },
        { atSec: s(170), pourAmount: g(35) },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(
      r.errors.some((e) => e.kind === "non-positive-pour" && e.pourIndex === 0),
    ).toBe(true);
  });

  it("sum-mismatch", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      totalWater: g(225),
      pours: [
        { atSec: s(0), pourAmount: g(30), label: "bloom" },
        { atSec: s(45), pourAmount: g(70) },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContainEqual({ kind: "sum-mismatch", sum: 100, totalWater: 225 });
  });

  it("bloom-not-on-first", () => {
    const r = buildCustomRecipe({
      ...baseInput,
      pours: [
        { atSec: s(0), pourAmount: g(30) },
        { atSec: s(45), pourAmount: g(50), label: "bloom" },
        { atSec: s(90), pourAmount: g(60) },
        { atSec: s(140), pourAmount: g(50) },
        { atSec: s(170), pourAmount: g(35) },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(
      r.errors.some((e) => e.kind === "bloom-not-on-first" && e.pourIndex === 1),
    ).toBe(true);
  });
});

describe("prefill round-trip from built-in methods", () => {
  Object.values(brewMethods).forEach((m) => {
    it(`${m.id} → buildCustomRecipe → 동일 (method/notes 제외)`, () => {
      const input: RecipeInput = {
        method: m.id,
        dripper: m.supportedDrippers[0]!,
        coffee: g(15),
        roast: "medium",
        taste: { sweetness: "balanced", strength: "medium" },
      };
      const original = m.compute(input);
      const r = buildCustomRecipe({
        dripper: original.dripper,
        coffee: original.coffee,
        totalWater: original.totalWater,
        temperature: original.temperature,
        grindHint: original.grindHint,
        totalTimeSec: original.totalTimeSec,
        pours: original.pours.map((p) => ({
          atSec: p.atSec,
          pourAmount: p.pourAmount,
          ...(p.label ? { label: p.label } : {}),
        })),
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const stripped = (rec: Recipe) => ({
        dripper: rec.dripper,
        coffee: rec.coffee,
        totalWater: rec.totalWater,
        ratio: rec.ratio,
        temperature: rec.temperature,
        totalTimeSec: rec.totalTimeSec,
        grindHint: rec.grindHint,
        pours: rec.pours.map((p) => ({ ...p })),
      });
      expect(stripped(r.recipe)).toEqual(stripped(original));
    });
  });
});
