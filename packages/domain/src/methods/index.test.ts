import { describe, expect, it } from "vitest";
import { brewMethods, methodList, methodsForDripper } from "./index";

describe("brew method registry", () => {
  it("includes all v1 methods", () => {
    expect(Object.keys(brewMethods).sort()).toEqual([
      "april",
      "caffe_luxxe",
      "frothy_monkey",
      "fuglen_tokyo",
      "hoffmann_v60",
      "kasuya_4_6",
      "kurasu_kyoto",
      "scott_rao",
      "standard_3_stage",
    ]);
  });

  it("each method id matches its registry key", () => {
    for (const [key, method] of Object.entries(brewMethods)) {
      expect(method.id).toBe(key);
    }
  });

  it("methodList mirrors registry values", () => {
    expect(methodList).toHaveLength(9);
    expect(methodList.map((m) => m.id).sort()).toEqual([
      "april",
      "caffe_luxxe",
      "frothy_monkey",
      "fuglen_tokyo",
      "hoffmann_v60",
      "kasuya_4_6",
      "kurasu_kyoto",
      "scott_rao",
      "standard_3_stage",
    ]);
  });

  describe("methodsForDripper", () => {
    it("v60 → kasuya_4_6 + hoffmann_v60 + scott_rao", () => {
      expect(
        methodsForDripper("v60")
          .map((m) => m.id)
          .sort(),
      ).toEqual(["hoffmann_v60", "kasuya_4_6", "scott_rao"]);
    });

    it("kalita_wave → april + kurasu_kyoto + frothy_monkey", () => {
      expect(
        methodsForDripper("kalita_wave")
          .map((m) => m.id)
          .sort(),
      ).toEqual(["april", "frothy_monkey", "kurasu_kyoto"]);
    });

    it("kalita_102 → standard_3_stage + caffe_luxxe + fuglen_tokyo", () => {
      expect(
        methodsForDripper("kalita_102")
          .map((m) => m.id)
          .sort(),
      ).toEqual(["caffe_luxxe", "fuglen_tokyo", "standard_3_stage"]);
    });
  });
});
