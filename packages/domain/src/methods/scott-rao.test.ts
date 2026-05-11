import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { scottRao } from "./scott-rao";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "scott_rao",
  dripper: "v60",
  coffee: g(20),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Scott Rao", () => {
  it("20g / balanced / medium / roast=medium — research reference (50g bloom + 280g main)", () => {
    expect(scottRao.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 20,
        "dripper": "v60",
        "grindHint": "medium-fine",
        "method": "scott_rao",
        "notes": [
          "뜸 직후 Bird's Nest 구멍 만들기 + 강한 스월.",
          "메인은 끊지 말고 단일 연속 푸어. 맛 조정은 분쇄도(strength)와 뜸 시간(sweetness)으로.",
        ],
        "pours": [
          {
            "atSec": 0,
            "cumulativeWater": 50,
            "index": 0,
            "label": "bloom",
            "pourAmount": 50,
          },
          {
            "atSec": 30,
            "cumulativeWater": 330,
            "index": 1,
            "pourAmount": 280,
          },
        ],
        "ratio": 16.5,
        "temperature": 94,
        "totalTimeSec": 120,
        "totalWater": 330,
      }
    `);
  });

  it("supports only v60", () => {
    expect(scottRao.supportedDrippers).toEqual(["v60"]);
  });

  it("defaultRatio is 16.5", () => {
    expect(scottRao.defaultRatio).toBe(16.5);
  });
});
