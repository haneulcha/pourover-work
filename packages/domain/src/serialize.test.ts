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

  it("throws when a top-level numeric field is non-numeric (e.g. coffee is a string)", () => {
    const json = recipeToJSON(sample);
    const obj = JSON.parse(json) as Record<string, unknown>;
    obj["coffee"] = "twenty";
    expect(() => recipeFromJSON(JSON.stringify(obj))).toThrow(
      "recipeFromJSON: malformed recipe payload",
    );
  });

  it("throws when a pour numeric field is non-numeric (e.g. pourAmount is null)", () => {
    const json = recipeToJSON(sample);
    const obj = JSON.parse(json) as Record<string, unknown>;
    const pours = obj["pours"] as Record<string, unknown>[];
    pours[0] = { ...pours[0], pourAmount: null };
    expect(() => recipeFromJSON(JSON.stringify(obj))).toThrow(
      "recipeFromJSON: malformed recipe payload",
    );
  });
});
