import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { fuglenTokyo } from "./fuglen-tokyo";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "fuglen_tokyo",
  dripper: "kalita_102",
  coffee: g(16),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Fuglen Tokyo", () => {
  it("16g / balanced / medium — research reference (40/40/170)", () => {
    expect(fuglenTokyo.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 16,
        "dripper": "kalita_102",
        "grindHint": "medium-coarse",
        "method": "fuglen_tokyo",
        "notes": [
          "2차 푸어는 회전, 3차는 센터로 빠르게 전량 투입.",
          "맛 조정은 분쇄도(strength)와 뜸 지속(sweetness)으로.",
        ],
        "pours": [
          {
            "atSec": 0,
            "cumulativeWater": 40,
            "index": 0,
            "label": "bloom",
            "pourAmount": 40,
          },
          {
            "atSec": 40,
            "cumulativeWater": 80,
            "index": 1,
            "pourAmount": 40,
          },
          {
            "atSec": 55,
            "cumulativeWater": 250,
            "index": 2,
            "pourAmount": 170,
          },
        ],
        "ratio": 15.6,
        "temperature": 92,
        "totalTimeSec": 115,
        "totalWater": 250,
      }
    `);
  });

  it("supports only kalita_102", () => {
    expect(fuglenTokyo.supportedDrippers).toEqual(["kalita_102"]);
  });

  it("defaultRatio is 15.6", () => {
    expect(fuglenTokyo.defaultRatio).toBe(15.6);
  });
});
