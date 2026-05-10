import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { kurasuKyoto } from "./kurasu-kyoto";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "kurasu_kyoto",
  dripper: "kalita_wave",
  coffee: g(14),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Kurasu Kyoto", () => {
  it("14g / balanced / medium — research reference (30/30/140)", () => {
    expect(kurasuKyoto.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 14,
        "dripper": "kalita_wave",
        "grindHint": "coarse",
        "method": "kurasu_kyoto",
        "notes": [
          "2차 푸어는 강하게, 3차는 가는 물줄기로 센터만.",
          "맛 조정은 분쇄도(strength)와 뜸 시간(sweetness)으로.",
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
            "atSec": 40,
            "cumulativeWater": 60,
            "index": 1,
            "pourAmount": 30,
          },
          {
            "atSec": 70,
            "cumulativeWater": 200,
            "index": 2,
            "pourAmount": 140,
          },
        ],
        "ratio": 14.3,
        "temperature": 90,
        "totalTimeSec": 130,
        "totalWater": 200,
      }
    `);
  });

  it("supports only kalita_wave", () => {
    expect(kurasuKyoto.supportedDrippers).toEqual(["kalita_wave"]);
  });

  it("defaultRatio is 14.3", () => {
    expect(kurasuKyoto.defaultRatio).toBe(14.3);
  });
});
