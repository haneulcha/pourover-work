import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { frothyMonkey } from "./frothy-monkey";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "frothy_monkey",
  dripper: "kalita_wave",
  coffee: g(25),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Frothy Monkey", () => {
  it("25g / balanced / medium — research reference (50 bloom + 150 main + 4×50 pulses)", () => {
    expect(frothyMonkey.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 25,
        "dripper": "kalita_wave",
        "grindHint": "medium-fine",
        "method": "frothy_monkey",
        "notes": [
          "뜸 후 한 번 큰 푸어로 절반까지 채우고, 이후 짧은 펄스를 반복.",
          "맛 조정은 펄스 수(strength)와 뜸 시간(sweetness)으로.",
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
            "atSec": 45,
            "cumulativeWater": 200,
            "index": 1,
            "pourAmount": 150,
          },
          {
            "atSec": 60,
            "cumulativeWater": 250,
            "index": 2,
            "pourAmount": 50,
          },
          {
            "atSec": 75,
            "cumulativeWater": 300,
            "index": 3,
            "pourAmount": 50,
          },
          {
            "atSec": 90,
            "cumulativeWater": 350,
            "index": 4,
            "pourAmount": 50,
          },
          {
            "atSec": 105,
            "cumulativeWater": 400,
            "index": 5,
            "pourAmount": 50,
          },
        ],
        "ratio": 16,
        "temperature": 93,
        "totalTimeSec": 135,
        "totalWater": 400,
      }
    `);
  });

  it("supports only kalita_wave", () => {
    expect(frothyMonkey.supportedDrippers).toEqual(["kalita_wave"]);
  });

  it("defaultRatio is 16", () => {
    expect(frothyMonkey.defaultRatio).toBe(16);
  });
});
