import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { april } from "./april";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "april",
  dripper: "kalita_wave",
  coffee: g(13),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("April", () => {
  it("13g / balanced / medium — research reference (200g, 4× ~50g)", () => {
    expect(april.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 13,
        "dripper": "kalita_wave",
        "grindHint": "medium-coarse",
        "method": "april",
        "notes": [
          "첫 푸어는 서클로 전면 적시기, 나머지는 센터 푸어로 난류 생성.",
          "맛 조정은 분쇄도(strength)와 푸어 간격(sweetness)으로.",
        ],
        "pours": [
          {
            "atSec": 0,
            "cumulativeWater": 50,
            "index": 0,
            "pourAmount": 50,
          },
          {
            "atSec": 30,
            "cumulativeWater": 100,
            "index": 1,
            "pourAmount": 50,
          },
          {
            "atSec": 60,
            "cumulativeWater": 150,
            "index": 2,
            "pourAmount": 50,
          },
          {
            "atSec": 90,
            "cumulativeWater": 200,
            "index": 3,
            "pourAmount": 50,
          },
        ],
        "ratio": 15.4,
        "temperature": 91,
        "totalTimeSec": 150,
        "totalWater": 200,
      }
    `);
  });

  it("supports only kalita_wave", () => {
    expect(april.supportedDrippers).toEqual(["kalita_wave"]);
  });

  it("defaultRatio is 15.4", () => {
    expect(april.defaultRatio).toBe(15.4);
  });
});
