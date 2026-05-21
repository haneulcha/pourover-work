import "@testing-library/jest-dom/vitest";

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Provide no-op stubs so vi.spyOn can replace them in tests.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}

// jsdom does not actually decode images or rasterize canvases. The
// share-image pipeline depends on `naturalWidth/Height` after `Image.onload`
// and on the full Canvas2D method surface (drawImage, fillText, gradients).
// Install deterministic stubs so unit tests can run end-to-end. Tests that
// exercise size-dependent behavior set `globalThis.__testImageDims` before
// invoking the code under test.
declare global {
  var __testImageDims: { width: number; height: number };
}

globalThis.__testImageDims = { width: 0, height: 0 };

class StubImage {
  decoding: "auto" | "sync" | "async" = "auto";
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: ((err?: unknown) => void) | null = null;
  #src = "";
  get src(): string {
    return this.#src;
  }
  set src(value: string) {
    this.#src = value;
    const dims = globalThis.__testImageDims;
    this.naturalWidth = dims.width;
    this.naturalHeight = dims.height;
    queueMicrotask(() => this.onload?.());
  }
}

globalThis.Image = StubImage as unknown as typeof Image;

const STUB_GRADIENT: CanvasGradient = {
  addColorStop: () => {},
} as CanvasGradient;

// No-op 2D context that responds to every method the share-image renderer
// touches. Production code never inspects pixels in jsdom; tests that care
// about specific calls spy on the returned object directly.
const make2DStub = (): CanvasRenderingContext2D => {
  const stub = {
    fillStyle: "#000",
    strokeStyle: "#000",
    font: "10px sans-serif",
    textBaseline: "alphabetic" as CanvasTextBaseline,
    textAlign: "start" as CanvasTextAlign,
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    globalAlpha: 1,
    drawImage: () => {},
    fillRect: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: (text: string) => ({ width: text.length * 6 }) as TextMetrics,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    createLinearGradient: () => STUB_GRADIENT,
    createRadialGradient: () => STUB_GRADIENT,
  };
  return stub as unknown as CanvasRenderingContext2D;
};

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
): RenderingContext | null {
  if (type === "2d") return make2DStub();
  return null;
} as HTMLCanvasElement["getContext"];

HTMLCanvasElement.prototype.toDataURL = function (type?: string): string {
  return `data:${type ?? "image/png"};base64,STUB`;
};

HTMLCanvasElement.prototype.toBlob = function (
  callback: BlobCallback,
  type?: string,
): void {
  const blob = new Blob([new Uint8Array([0])], { type: type ?? "image/png" });
  queueMicrotask(() => callback(blob));
};
