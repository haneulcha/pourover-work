import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput } from "../types";
import { caffeLuxxe } from "./caffe-luxxe";

const baseInput = (overrides: Partial<RecipeInput> = {}): RecipeInput => ({
  method: "caffe_luxxe",
  dripper: "kalita_102",
  coffee: g(30),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
  ...overrides,
});

describe("Caffe Luxxe", () => {
  it("30g / balanced / medium — research reference (100 bloom + 300 main)", () => {
    expect(caffeLuxxe.compute(baseInput())).toMatchInlineSnapshot(`
      {
        "coffee": 30,
        "dripper": "kalita_102",
        "grindHint": "medium",
        "method": "caffe_luxxe",
        "notes": [
          "지그재그로 넓게 뜸, 이후 안팎 회전으로 연속 푸어.",
          "맛 조정은 분쇄도(strength)와 뜸 지속(sweetness)으로.",
        ],
        "pours": [
          {
            "atSec": 0,
            "cumulativeWater": 100,
            "index": 0,
            "label": "bloom",
            "pourAmount": 100,
          },
          {
            "atSec": 30,
            "cumulativeWater": 399,
            "index": 1,
            "pourAmount": 299,
          },
        ],
        "ratio": 13.3,
        "temperature": 93,
        "totalTimeSec": 150,
        "totalWater": 399,
      }
    `);
  });

  it("supports only kalita_102", () => {
    expect(caffeLuxxe.supportedDrippers).toEqual(["kalita_102"]);
  });

  it("defaultRatio is 13.3", () => {
    expect(caffeLuxxe.defaultRatio).toBe(13.3);
  });
});
