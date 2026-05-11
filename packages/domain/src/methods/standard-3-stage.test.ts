import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { standard3Stage } from "./standard-3-stage";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "standard_3_stage",
  dripper: "kalita_102",
  coffee: g(20),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Standard 3-Stage", () => {
  it("20g / balanced / medium — research reference (40/80/80/100 scaled)", () => {
    expect(standard3Stage.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 20,
        "dripper": "kalita_102",
        "grindHint": "medium",
        "method": "standard_3_stage",
        "notes": [
          "일본 정통 사다리꼴 3단 분할. 수위를 끊지 않고 일정하게 유지.",
          "맛 조정은 마지막 푸어 비중(strength)과 뜸 시간(sweetness)으로.",
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
            "atSec": 30,
            "cumulativeWater": 117,
            "index": 1,
            "pourAmount": 77,
          },
          {
            "atSec": 60,
            "cumulativeWater": 194,
            "index": 2,
            "pourAmount": 77,
          },
          {
            "atSec": 90,
            "cumulativeWater": 300,
            "index": 3,
            "pourAmount": 106,
          },
        ],
        "ratio": 15,
        "temperature": 93,
        "totalTimeSec": 150,
        "totalWater": 300,
      }
    `);
  });

  it("supports only kalita_102", () => {
    expect(standard3Stage.supportedDrippers).toEqual(["kalita_102"]);
  });

  it("defaultRatio is 15", () => {
    expect(standard3Stage.defaultRatio).toBe(15);
  });
});
