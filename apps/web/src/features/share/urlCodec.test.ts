import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, type AppState } from "@/features/app/state";
import { g } from "@pourover/domain/units";
import { decodeState, encodeState } from "./urlCodec";

const fullState: AppState = {
  ...DEFAULT_STATE,
  coffee: g(18),
  dripper: "kalita_wave",
  method: "frothy_monkey",
  roast: "dark",
  taste: { sweetness: "bright", strength: "light" },
};

describe("urlCodec", () => {
  it("encodes state to URLSearchParams", () => {
    const p = encodeState(fullState);
    expect(p.get("c")).toBe("18");
    expect(p.get("d")).toBe("kalita_wave");
    expect(p.get("m")).toBe("frothy_monkey");
    expect(p.get("r")).toBe("dark");
    expect(p.get("sw")).toBe("bright");
    expect(p.get("st")).toBe("light");
  });

  it("roundtrips state", () => {
    const encoded = encodeState(fullState);
    const decoded = decodeState(encoded);
    expect(decoded).toMatchObject({
      coffee: 18,
      dripper: "kalita_wave",
      method: "frothy_monkey",
      roast: "dark",
      taste: { sweetness: "bright", strength: "light" },
    });
  });

  it("returns partial when only some params present", () => {
    const p = new URLSearchParams("c=25&d=v60");
    const decoded = decodeState(p);
    expect(decoded.coffee).toBe(25);
    expect(decoded.dripper).toBe("v60");
    expect(decoded.method).toBeUndefined();
    expect(decoded.taste).toBeUndefined();
  });

  it("ignores legacy sv (servings) param silently", () => {
    const p = new URLSearchParams("sv=3&d=v60");
    const decoded = decodeState(p);
    expect(decoded.coffee).toBeUndefined();
    expect(decoded.dripper).toBe("v60");
  });

  it("rejects out-of-range coffee", () => {
    const p = new URLSearchParams("c=999");
    expect(decodeState(p).coffee).toBeUndefined();
  });

  it("does not include screen in URL", () => {
    const p = encodeState(fullState);
    expect(p.has("screen")).toBe(false);
  });

  it("rejects invalid enum values for dripper / method / roast", () => {
    const p = new URLSearchParams("d=espresso&m=aeropress&r=burnt");
    const decoded = decodeState(p);
    expect(decoded.dripper).toBeUndefined();
    expect(decoded.method).toBeUndefined();
    expect(decoded.roast).toBeUndefined();
  });

  it("ignores unknown params", () => {
    const p = new URLSearchParams("foo=bar&d=v60");
    const decoded = decodeState(p);
    expect(decoded).toEqual({ dripper: "v60" });
  });

  it("requires BOTH sweetness and strength for taste patch", () => {
    const p = new URLSearchParams("sw=sweet");
    const decoded = decodeState(p);
    expect(decoded.taste).toBeUndefined();
  });

  it("ignores unknown method id (e.g. removed kalita_pulse) — caller falls back to default", () => {
    const params = new URLSearchParams();
    params.set("c", "20");
    params.set("d", "kalita_wave");
    params.set("m", "kalita_pulse"); // legacy id
    params.set("r", "medium");
    params.set("sw", "balanced");
    params.set("st", "medium");
    const decoded = decodeState(params);
    expect(decoded.method).toBeUndefined();
    expect(decoded.dripper).toBe("kalita_wave");
  });

  it("decodes kalita_102 dripper and its methods", () => {
    const params = new URLSearchParams();
    params.set("d", "kalita_102");
    params.set("m", "standard_3_stage");
    const decoded = decodeState(params);
    expect(decoded.dripper).toBe("kalita_102");
    expect(decoded.method).toBe("standard_3_stage");
  });
});
