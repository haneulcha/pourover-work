import { describe, expect, it } from "vitest";
import { formatBrewedAt, formatGrindHint, formatTime } from "./format";

describe("formatBrewedAt", () => {
  it("formats AM time with leading-zero month/day", () => {
    const d = new Date(2026, 2, 14, 7, 42); // March 14, 2026, 07:42 local
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 03 · 14 · 오전 7:42");
  });

  it("formats PM time", () => {
    const d = new Date(2026, 2, 14, 15, 5);
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 03 · 14 · 오후 3:05");
  });

  it("formats midnight as 오전 12", () => {
    const d = new Date(2026, 2, 14, 0, 0);
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 03 · 14 · 오전 12:00");
  });

  it("formats noon as 오후 12", () => {
    const d = new Date(2026, 2, 14, 12, 0);
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 03 · 14 · 오후 12:00");
  });

  it("formats late evening", () => {
    const d = new Date(2026, 2, 14, 23, 30);
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 03 · 14 · 오후 11:30");
  });

  it("pads minute with leading zero", () => {
    const d = new Date(2026, 0, 1, 9, 5);
    expect(formatBrewedAt(d.getTime())).toBe("2026 · 01 · 01 · 오전 9:05");
  });
});

describe("formatTime (sanity)", () => {
  it("formats mm:ss", () => {
    expect(formatTime(75)).toBe("1:15");
  });
});

describe("formatGrindHint (sanity)", () => {
  it("maps fine to 설탕 정도", () => {
    expect(formatGrindHint("fine")).toBe("설탕 정도");
  });
});
