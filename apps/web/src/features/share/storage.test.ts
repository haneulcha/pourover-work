import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveSession } from "./storage";

describe("saveSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores session JSON under bloom-coffee:session:v1 key", () => {
    const session = {
      recipe: { method: "hoffmann_v60" },
      startedAt: 1,
      completedAt: 2,
    };
    saveSession(session);
    const raw = localStorage.getItem("bloom-coffee:session:v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(session);
  });

  it("overwrites previous value", () => {
    saveSession({ a: 1 });
    saveSession({ b: 2 });
    const raw = localStorage.getItem("bloom-coffee:session:v1");
    expect(JSON.parse(raw!)).toEqual({ b: 2 });
  });

  it("swallows storage errors silently (quota exceeded, private mode)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => saveSession({ a: 1 })).not.toThrow();
    spy.mockRestore();
  });
});
