import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { kasuya46 } from "./kasuya-4-6";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
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

describe("Kasuya 4:6", () => {
  describe("spec snapshots", () => {
    it("20g / balanced / medium / roast=medium — standard case", () => {
      expect(kasuya46.compute(baseInput())).toMatchInlineSnapshot(`
        {
          "coffee": 20,
          "dripper": "v60",
          "grindHint": "coarse",
          "method": "kasuya_4_6",
          "notes": [
            "주전자를 천천히, 중심부터 나선형으로.",
            "총 추출 시간 3:30 ± 15초를 목표로. 더 오래 걸리면 분쇄도를 약간 굵게.",
          ],
          "pours": [
            {
              "atSec": 0,
              "cumulativeWater": 60,
              "index": 0,
              "pourAmount": 60,
            },
            {
              "atSec": 45,
              "cumulativeWater": 120,
              "index": 1,
              "pourAmount": 60,
            },
            {
              "atSec": 90,
              "cumulativeWater": 210,
              "index": 2,
              "pourAmount": 90,
            },
            {
              "atSec": 135,
              "cumulativeWater": 300,
              "index": 3,
              "pourAmount": 90,
            },
          ],
          "ratio": 15,
          "temperature": 88,
          "totalTimeSec": 165,
          "totalWater": 300,
        }
      `);
    });

    it("20g / sweet / strong — classic 5-pour", () => {
      expect(
        kasuya46.compute(
          baseInput({ taste: { sweetness: "sweet", strength: "strong" } }),
        ),
      ).toMatchInlineSnapshot(`
        {
          "coffee": 20,
          "dripper": "v60",
          "grindHint": "coarse",
          "method": "kasuya_4_6",
          "notes": [
            "주전자를 천천히, 중심부터 나선형으로.",
            "총 추출 시간 3:30 ± 15초를 목표로. 더 오래 걸리면 분쇄도를 약간 굵게.",
          ],
          "pours": [
            {
              "atSec": 0,
              "cumulativeWater": 70,
              "index": 0,
              "pourAmount": 70,
            },
            {
              "atSec": 45,
              "cumulativeWater": 120,
              "index": 1,
              "pourAmount": 50,
            },
            {
              "atSec": 90,
              "cumulativeWater": 180,
              "index": 2,
              "pourAmount": 60,
            },
            {
              "atSec": 135,
              "cumulativeWater": 240,
              "index": 3,
              "pourAmount": 60,
            },
            {
              "atSec": 180,
              "cumulativeWater": 300,
              "index": 4,
              "pourAmount": 60,
            },
          ],
          "ratio": 15,
          "temperature": 88,
          "totalTimeSec": 210,
          "totalWater": 300,
        }
      `);
    });

    it("20g / bright / light — minimal 3-pour", () => {
      expect(
        kasuya46.compute(
          baseInput({ taste: { sweetness: "bright", strength: "light" } }),
        ),
      ).toMatchInlineSnapshot(`
        {
          "coffee": 20,
          "dripper": "v60",
          "grindHint": "coarse",
          "method": "kasuya_4_6",
          "notes": [
            "주전자를 천천히, 중심부터 나선형으로.",
            "총 추출 시간 3:30 ± 15초를 목표로. 더 오래 걸리면 분쇄도를 약간 굵게.",
          ],
          "pours": [
            {
              "atSec": 0,
              "cumulativeWater": 50,
              "index": 0,
              "pourAmount": 50,
            },
            {
              "atSec": 45,
              "cumulativeWater": 120,
              "index": 1,
              "pourAmount": 70,
            },
            {
              "atSec": 90,
              "cumulativeWater": 300,
              "index": 2,
              "pourAmount": 180,
            },
          ],
          "ratio": 15,
          "temperature": 88,
          "totalTimeSec": 120,
          "totalWater": 300,
        }
      `);
    });
  });

  describe("invariants", () => {
    it.each([5, 10, 15, 20, 25, 30, 50])(
      "totalWater === sum(pours.pourAmount) and cumulative is running sum (coffee=%ig)",
      (coffeeG) => {
        for (const taste of allCombos) {
          const r = kasuya46.compute(baseInput({ coffee: g(coffeeG), taste }));
          const sum = r.pours.reduce((acc, p) => acc + p.pourAmount, 0);
          expect(sum).toBe(r.totalWater);

          let running = 0;
          for (const p of r.pours) {
            running += p.pourAmount;
            expect(p.cumulativeWater).toBe(running);
          }
        }
      },
    );

    it("first pour starts at 0s, subsequent pours at 45s intervals", () => {
      const r = kasuya46.compute(
        baseInput({ taste: { sweetness: "sweet", strength: "strong" } }),
      );
      expect(r.pours[0]!.atSec).toBe(0);
      for (let i = 1; i < r.pours.length; i++) {
        expect(r.pours[i]!.atSec - r.pours[i - 1]!.atSec).toBe(45);
      }
    });

    it("pour count by strength: light=3, medium=4, strong=5", () => {
      expect(
        kasuya46.compute(
          baseInput({ taste: { sweetness: "balanced", strength: "light" } }),
        ).pours.length,
      ).toBe(3);
      expect(
        kasuya46.compute(
          baseInput({ taste: { sweetness: "balanced", strength: "medium" } }),
        ).pours.length,
      ).toBe(4);
      expect(
        kasuya46.compute(
          baseInput({ taste: { sweetness: "balanced", strength: "strong" } }),
        ).pours.length,
      ).toBe(5);
    });
  });

  describe("metadata", () => {
    it("temperature by roast: light=94, medium=88, dark=83", () => {
      expect(kasuya46.compute(baseInput({ roast: "light" })).temperature).toBe(
        94,
      );
      expect(kasuya46.compute(baseInput({ roast: "medium" })).temperature).toBe(
        88,
      );
      expect(kasuya46.compute(baseInput({ roast: "dark" })).temperature).toBe(
        83,
      );
    });

    it("supports only v60", () => {
      expect(kasuya46.supportedDrippers).toEqual(["v60"]);
    });

    it("default ratio is 15", () => {
      expect(kasuya46.defaultRatio).toBe(15);
    });
  });
});
