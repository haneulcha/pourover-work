import { describe, expect, it } from "vitest";
import { g } from "../units";
import type {
  GrindHint,
  RecipeInput,
  StrengthProfile,
  SweetnessProfile,
} from "../types";
import { hoffmannV60 } from "./hoffmann-v60";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "hoffmann_v60",
  dripper: "v60",
  coffee: g(15),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

const allCombos = (["sweet", "balanced", "bright"] as const).flatMap(
  (sweetness) =>
    (["light", "medium", "strong"] as const).map((strength) => ({
      sweetness,
      strength,
    })),
);

describe("Hoffmann V60", () => {
  describe("spec snapshot", () => {
    it("15g / balanced / medium / roast=medium — design.md reference (30g bloom, 120g, 100g)", () => {
      expect(hoffmannV60.compute(baseInput())).toMatchInlineSnapshot(`
        {
          "coffee": 15,
          "dripper": "v60",
          "grindHint": "medium-fine",
          "method": "hoffmann_v60",
          "notes": [
            "블룸 직후 스월. 본 푸어 종료 후 한 번 더 스월.",
            "이 메서드는 맛 조정을 분쇄도로 함. 비율/시간은 고정.",
          ],
          "pours": [
            {
              "atSec": 0,
              "cumulativeWater": 30,
              "index": 0,
              "label": "bloom",
              "pourAmount": 30,
            },
            {
              "atSec": 45,
              "cumulativeWater": 150,
              "index": 1,
              "pourAmount": 120,
            },
            {
              "atSec": 75,
              "cumulativeWater": 250,
              "index": 2,
              "pourAmount": 100,
            },
          ],
          "ratio": 16.67,
          "temperature": 93,
          "totalTimeSec": 210,
          "totalWater": 250,
        }
      `);
    });
  });

  describe("invariants", () => {
    it.each([10, 15, 20, 25, 30])(
      "pours sum to totalWater (coffee=%ig)",
      (coffeeG) => {
        for (const taste of allCombos) {
          const r = hoffmannV60.compute(
            baseInput({ coffee: g(coffeeG), taste }),
          );
          const sum = r.pours.reduce((acc, p) => acc + p.pourAmount, 0);
          expect(sum).toBe(r.totalWater);
        }
      },
    );

    it("always 3 pours: bloom + 2 main", () => {
      for (const taste of allCombos) {
        const r = hoffmannV60.compute(baseInput({ taste }));
        expect(r.pours).toHaveLength(3);
        expect(r.pours[0]!.label).toBe("bloom");
        expect(r.pours[1]!.label).toBeUndefined();
        expect(r.pours[2]!.label).toBeUndefined();
      }
    });

    it("pour times fixed at 0 / 45 / 75 sec regardless of taste", () => {
      for (const taste of allCombos) {
        const r = hoffmannV60.compute(baseInput({ taste }));
        expect(r.pours.map((p) => p.atSec)).toEqual([0, 45, 75]);
      }
    });

    it("totalTimeSec fixed at 210 (3:30)", () => {
      for (const taste of allCombos) {
        expect(hoffmannV60.compute(baseInput({ taste })).totalTimeSec).toBe(
          210,
        );
      }
    });

    it("pour 2 cumulative reaches 60% of totalWater", () => {
      const r = hoffmannV60.compute(baseInput());
      expect(r.pours[1]!.cumulativeWater).toBe(Math.round(r.totalWater * 0.6));
    });

    it("bloom is 2x coffee weight", () => {
      for (const coffeeG of [10, 15, 20, 25]) {
        const r = hoffmannV60.compute(baseInput({ coffee: g(coffeeG) }));
        expect(r.pours[0]!.pourAmount).toBe(coffeeG * 2);
      }
    });
  });

  describe("grind by taste (boolean OR: at most ±1 step, opposing cancels)", () => {
    const cases: ReadonlyArray<{
      sweetness: SweetnessProfile;
      strength: StrengthProfile;
      expected: GrindHint;
    }> = [
      { sweetness: "balanced", strength: "medium", expected: "medium-fine" },
      { sweetness: "sweet", strength: "strong", expected: "fine" },
      { sweetness: "bright", strength: "light", expected: "medium" },
      { sweetness: "sweet", strength: "light", expected: "medium-fine" },
      { sweetness: "bright", strength: "strong", expected: "medium-fine" },
      { sweetness: "sweet", strength: "medium", expected: "fine" },
      { sweetness: "balanced", strength: "strong", expected: "fine" },
      { sweetness: "bright", strength: "medium", expected: "medium" },
      { sweetness: "balanced", strength: "light", expected: "medium" },
    ];
    it.each(cases)(
      "sweetness=$sweetness strength=$strength -> $expected",
      ({ sweetness, strength, expected }) => {
        expect(
          hoffmannV60.compute(baseInput({ taste: { sweetness, strength } }))
            .grindHint,
        ).toBe(expected);
      },
    );
  });

  describe("metadata", () => {
    it("temperature by roast: light=96, medium=93, dark=90", () => {
      expect(
        hoffmannV60.compute(baseInput({ roast: "light" })).temperature,
      ).toBe(96);
      expect(
        hoffmannV60.compute(baseInput({ roast: "medium" })).temperature,
      ).toBe(93);
      expect(
        hoffmannV60.compute(baseInput({ roast: "dark" })).temperature,
      ).toBe(90);
    });

    it("supports only v60", () => {
      expect(hoffmannV60.supportedDrippers).toEqual(["v60"]);
    });

    it("defaultRatio is 16.67", () => {
      expect(hoffmannV60.defaultRatio).toBe(16.67);
    });
  });
});
