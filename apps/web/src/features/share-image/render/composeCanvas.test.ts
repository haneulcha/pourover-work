import { describe, expect, it, vi } from "vitest";
import {
  drawCover,
  drawFeelingGlyph,
  drawTrackedText,
} from "./composeCanvas";

type CtxStub = {
  drawImage: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  font: string;
  globalAlpha: number;
  lineWidth: number;
  lineCap: CanvasLineCap;
  textBaseline: CanvasTextBaseline;
};

const makeCtx = (): CtxStub => ({
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn((t: string) => ({ width: t.length * 6 })),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  quadraticCurveTo: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  fillStyle: "#000",
  strokeStyle: "#000",
  font: "",
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: "butt",
  textBaseline: "alphabetic",
});

const makeImg = (w: number, h: number): HTMLImageElement =>
  ({
    naturalWidth: w,
    naturalHeight: h,
    width: w,
    height: h,
  }) as HTMLImageElement;

describe("drawCover", () => {
  it("center-crops a wide image into a square box (height fills, width cropped)", () => {
    const ctx = makeCtx();
    const img = makeImg(2000, 1000);
    drawCover(ctx as unknown as CanvasRenderingContext2D, img, 0, 0, 100, 100);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const args = ctx.drawImage.mock.calls[0]!;
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    expect(args[0]).toBe(img);
    // source crop: full height, square-width centered
    expect(args[3]).toBe(1000); // sw = 1000 (height × dest aspect 1)
    expect(args[4]).toBe(1000); // sh = full height
    expect(args[1]).toBe(500); // sx centered: (2000 - 1000) / 2
    expect(args[2]).toBe(0); // sy
    expect(args[5]).toBe(0); // dx
    expect(args[6]).toBe(0); // dy
    expect(args[7]).toBe(100); // dw
    expect(args[8]).toBe(100); // dh
  });

  it("center-crops a tall image into a square box (width fills, height cropped)", () => {
    const ctx = makeCtx();
    const img = makeImg(1000, 2000);
    drawCover(ctx as unknown as CanvasRenderingContext2D, img, 0, 0, 100, 100);
    const args = ctx.drawImage.mock.calls[0]!;
    expect(args[3]).toBe(1000); // sw = full width
    expect(args[4]).toBe(1000); // sh = width / dest aspect
    expect(args[1]).toBe(0);
    expect(args[2]).toBe(500); // sy centered
  });

  it("does nothing when image has zero dimensions", () => {
    const ctx = makeCtx();
    const img = makeImg(0, 0);
    drawCover(ctx as unknown as CanvasRenderingContext2D, img, 0, 0, 100, 100);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("falls back to width/height when naturalWidth is zero", () => {
    const ctx = makeCtx();
    const img = { naturalWidth: 0, naturalHeight: 0, width: 100, height: 100 } as HTMLImageElement;
    drawCover(ctx as unknown as CanvasRenderingContext2D, img, 0, 0, 50, 50);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});

describe("drawTrackedText", () => {
  it("emits one fillText call per character", () => {
    const ctx = makeCtx();
    drawTrackedText(
      ctx as unknown as CanvasRenderingContext2D,
      "ABC",
      10,
      20,
      0.1,
      12,
    );
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    const chars = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(chars).toEqual(["A", "B", "C"]);
  });

  it("advances x by char width + tracking between glyphs", () => {
    const ctx = makeCtx();
    // measureText returns width = chars.length * 6 = 6 per char above.
    drawTrackedText(
      ctx as unknown as CanvasRenderingContext2D,
      "AB",
      10,
      20,
      0.5,
      10,
    );
    // tracking = 10 * 0.5 = 5
    expect(ctx.fillText.mock.calls[0]![1]).toBe(10);
    expect(ctx.fillText.mock.calls[1]![1]).toBe(10 + 6 + 5); // = 21
  });

  it("handles Korean syllables one-by-one", () => {
    const ctx = makeCtx();
    drawTrackedText(
      ctx as unknown as CanvasRenderingContext2D,
      "시간",
      0,
      0,
      0.1,
      12,
    );
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
  });
});

describe("drawFeelingGlyph", () => {
  it("draws two arcs (ring + dot) for calm", () => {
    const ctx = makeCtx();
    drawFeelingGlyph(
      ctx as unknown as CanvasRenderingContext2D,
      "calm",
      0,
      0,
      26,
      "#fff",
    );
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("draws two strokes for neutral", () => {
    const ctx = makeCtx();
    drawFeelingGlyph(
      ctx as unknown as CanvasRenderingContext2D,
      "neutral",
      0,
      0,
      26,
      "#fff",
    );
    expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it("draws two quadratic curves for wave", () => {
    const ctx = makeCtx();
    drawFeelingGlyph(
      ctx as unknown as CanvasRenderingContext2D,
      "wave",
      0,
      0,
      26,
      "#fff",
    );
    expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4); // 2 curves × 2 segments each
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it("save/restores so caller transforms are not leaked", () => {
    const ctx = makeCtx();
    drawFeelingGlyph(
      ctx as unknown as CanvasRenderingContext2D,
      "calm",
      0,
      0,
      26,
      "#fff",
    );
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});
