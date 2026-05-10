import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, mergeState, type AppState, type Screen } from "./state";

describe("AppState", () => {
  it('DEFAULT_STATE has screen = "wall" (진입은 Wall부터)', () => {
    expect(DEFAULT_STATE.screen).toBe("wall" satisfies Screen);
  });

  it("mergeState auto-corrects method when dripper changes to incompatible", () => {
    const base: AppState = { ...DEFAULT_STATE, method: "hoffmann_v60" };
    const result = mergeState(base, { dripper: "kalita_wave" });
    expect(result.method).toBe("april");
    expect(result.dripper).toBe("kalita_wave");
  });

  it("mergeState preserves method when new dripper supports it", () => {
    const base: AppState = { ...DEFAULT_STATE, method: "kasuya_4_6" };
    const result = mergeState(base, { dripper: "v60" });
    expect(result.method).toBe("kasuya_4_6");
  });

  it("mergeState preserves screen across patches", () => {
    const base: AppState = { ...DEFAULT_STATE, screen: "brewing" };
    const result = mergeState(base, { roast: "dark" });
    expect(result.screen).toBe("brewing");
  });
});
