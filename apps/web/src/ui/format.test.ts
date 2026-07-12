import { describe, expect, it } from "vitest";
import {
  formatBrewedAt,
  formatGrindHint,
  formatLogClock,
  formatLogDay,
  formatTime,
} from "./format";

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

describe("formatLogDay", () => {
  const now = new Date(2026, 6, 12, 9, 0); // 2026-07-12 09:00 local

  const iso = (...args: [number, number, number, number?, number?]): string =>
    new Date(...args).toISOString();

  it("labels the same local day 오늘", () => {
    expect(formatLogDay(iso(2026, 6, 12, 0, 5), now)).toBe("오늘");
    expect(formatLogDay(iso(2026, 6, 12, 23, 55), now)).toBe("오늘");
  });

  it("labels the previous local day 어제", () => {
    expect(formatLogDay(iso(2026, 6, 11, 22, 0), now)).toBe("어제");
  });

  it("labels older days in the same year without the year", () => {
    expect(formatLogDay(iso(2026, 6, 8, 9, 10), now)).toBe("7월 8일");
  });

  it("keeps the year for other years", () => {
    expect(formatLogDay(iso(2025, 11, 3, 9, 10), now)).toBe("2025년 12월 3일");
  });
});

describe("formatLogClock", () => {
  it("formats the local wall clock", () => {
    expect(formatLogClock(new Date(2026, 6, 12, 8, 20).toISOString())).toBe(
      "오전 8:20",
    );
    expect(formatLogClock(new Date(2026, 6, 12, 16, 2).toISOString())).toBe(
      "오후 4:02",
    );
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
