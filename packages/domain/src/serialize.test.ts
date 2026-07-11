import { describe, expect, it } from "vitest";
import { recipeFromJSON, recipeToJSON } from "./serialize";
import { brewMethods } from "./methods";
import { g } from "./units";

const sample = brewMethods.kasuya_4_6.compute({
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
});

describe("recipe serialize round-trip", () => {
  it("preserves all fields through JSON round-trip", () => {
    const back = recipeFromJSON(recipeToJSON(sample));
    expect(back).toEqual(sample);
  });

  it("re-branded numeric values survive (totalWater === sum of pours)", () => {
    const back = recipeFromJSON(recipeToJSON(sample));
    const sum = back.pours.reduce((acc, p) => acc + p.pourAmount, 0);
    expect(sum).toBe(back.totalWater);
    expect(back.pours[0]!.atSec).toBe(0);
  });

  it("handles a custom-method recipe snapshot", () => {
    const custom = { ...sample, method: "custom" as const };
    expect(recipeFromJSON(recipeToJSON(custom)).method).toBe("custom");
  });

  it("throws on malformed json", () => {
    expect(() => recipeFromJSON("{not json")).toThrow();
    expect(() => recipeFromJSON('{"method":"v60"}')).toThrow();
  });
});
