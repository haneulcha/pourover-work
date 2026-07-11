import { afterEach, describe, expect, it, vi } from "vitest";
import { photoToBlob } from "./photoToBlob";

// The jsdom stubs in test/setup.ts drive Image dimensions from
// `globalThis.__testImageDims` and no-op canvas rasterization. Each test sets
// the source dimensions, then asserts on the blob type and the canvas size the
// photo was drawn onto (captured from `canvas.toBlob`'s `this`).
const setSourceDims = (width: number, height: number): void => {
  globalThis.__testImageDims = { width, height };
};

type Captured = { readonly w: number; readonly h: number };

const captureCanvasSize = (): { get: () => Captured | null } => {
  let captured: Captured | null = null;
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
    type?: string,
  ) {
    captured = { w: this.width, h: this.height };
    cb(new Blob([new Uint8Array([1])], { type: type ?? "image/png" }));
  });
  return { get: () => captured };
};

afterEach(() => {
  vi.restoreAllMocks();
  setSourceDims(0, 0);
});

describe("photoToBlob", () => {
  it("produces a JPEG blob from a data URL", async () => {
    setSourceDims(640, 480);
    const blob = await photoToBlob("data:image/jpeg;base64,AAAA");
    expect(blob.type).toBe("image/jpeg");
  });

  it("caps the long edge at 800px, preserving aspect ratio", async () => {
    setSourceDims(1600, 1200);
    const size = captureCanvasSize();
    await photoToBlob("data:image/jpeg;base64,AAAA");
    expect(size.get()).toEqual({ w: 800, h: 600 });
  });

  it("leaves photos already within 800px untouched", async () => {
    setSourceDims(400, 300);
    const size = captureCanvasSize();
    await photoToBlob("data:image/jpeg;base64,AAAA");
    expect(size.get()).toEqual({ w: 400, h: 300 });
  });

  it("caps the long edge when the photo is portrait", async () => {
    setSourceDims(900, 1200);
    const size = captureCanvasSize();
    await photoToBlob("data:image/jpeg;base64,AAAA");
    expect(size.get()).toEqual({ w: 600, h: 800 });
  });

  it("honours a custom max edge", async () => {
    setSourceDims(2000, 1000);
    const size = captureCanvasSize();
    await photoToBlob("data:image/jpeg;base64,AAAA", 500);
    expect(size.get()).toEqual({ w: 500, h: 250 });
  });
});
