import { describe, expect, it, vi } from "vitest";
import type { Pour, Recipe } from "@pourover/domain/types";
import type { BrewSession } from "@pourover/domain/session";
import { c, g, ratio, s } from "@pourover/domain/units";
import { fullVariant } from "./full";

type CtxStub = {
  drawImage: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  font: string;
  textBaseline: CanvasTextBaseline;
  lineWidth: number;
  lineCap: CanvasLineCap;
  globalAlpha: number;
};

const makeCtx = (): CtxStub => ({
  drawImage: vi.fn(),
  fillText: vi.fn(),
  fillRect: vi.fn(),
  measureText: vi.fn((t: string) => ({ width: t.length * 6 }) as TextMetrics),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }) as unknown as CanvasGradient),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  quadraticCurveTo: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillStyle: "#000",
  strokeStyle: "#000",
  font: "",
  textBaseline: "alphabetic",
  lineWidth: 1,
  lineCap: "butt",
  globalAlpha: 1,
});

const makeImg = (): HTMLImageElement =>
  ({ naturalWidth: 2000, naturalHeight: 2000, width: 2000, height: 2000 }) as HTMLImageElement;

const mkPour = (i: number, atSec: number, amt: number, cum: number): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
});

const recipe: Recipe = {
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  totalWater: g(300),
  ratio: ratio(15),
  temperature: c(93),
  pours: [mkPour(0, 0, 60, 60), mkPour(1, 45, 240, 300)],
  totalTimeSec: s(208),
  grindHint: "medium-fine",
  notes: [],
};

const baseSession: BrewSession = {
  recipe,
  startedAt: new Date(2026, 3, 25, 9, 12).getTime(),
  completedAt: new Date(2026, 3, 25, 9, 12).getTime() + 222_000, // 3:42
};

const draw = (ctx: CtxStub, session: BrewSession, color: "positive" | "negative" = "positive") =>
  fullVariant.draw(ctx as unknown as CanvasRenderingContext2D, {
    session,
    photo: makeImg(),
    color,
    width: 1080,
    height: 1080,
  });

const fillTextValues = (ctx: CtxStub): string[] =>
  ctx.fillText.mock.calls.map((c) => c[0] as string);

describe("fullVariant", () => {
  it("exports as a 1080×1080 square", () => {
    expect(fullVariant.exportSize).toEqual({ width: 1080, height: 1080 });
  });

  it("draws the photo first via drawImage", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("applies the right-side scrim via a linear gradient fillRect over the canvas", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(1080, 0, 0, 0);
    // first fillRect after createLinearGradient should cover the canvas
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1080);
  });

  it("renders the duration, date, dripper, and recipe row as single fillText calls", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    const values = fillTextValues(ctx);
    expect(values).toContain("3:42");
    expect(values).toContain("2026.04.25");
    expect(values).toContain("V60");
    expect(values).toContain("20g · 300g · 93°");
  });

  it("renders the method name uppercased and tracked (per-char fillText)", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    const values = fillTextValues(ctx);
    // "Kasuya 4:6" uppercased → "KASUYA 4:6" → individual chars present
    expect(values).toEqual(expect.arrayContaining(["K", "A", "S", "U", "Y"]));
  });

  it("renders the feeling label and 오늘의 기분 sublabel when feeling is set", () => {
    const ctx = makeCtx();
    draw(ctx, { ...baseSession, feeling: "calm" });
    const values = fillTextValues(ctx);
    expect(values).toContain("만족스러워요");
    // "오늘의 기분" is uppercased + tracked, so chars appear individually
    expect(values).toEqual(expect.arrayContaining(["오", "늘", "의"]));
  });

  it("omits the feeling row when feeling is unset", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    const values = fillTextValues(ctx);
    expect(values).not.toContain("만족스러워요");
    expect(values).not.toContain("글쎄요");
    expect(values).not.toContain("아쉬워요");
  });

  it("draws the wordmark 'pourover.work' tracked, at the bottom-left", () => {
    const ctx = makeCtx();
    draw(ctx, baseSession);
    const values = fillTextValues(ctx);
    // tracked: each char emitted separately
    expect(values).toEqual(
      expect.arrayContaining(["p", "o", "u", "r", "o", "v", "e", "r", ".", "w"]),
    );
  });

  it("draws a feeling glyph (calm → arc) when feeling is set", () => {
    const ctx = makeCtx();
    draw(ctx, { ...baseSession, feeling: "calm" });
    expect(ctx.arc).toHaveBeenCalled();
  });
});
