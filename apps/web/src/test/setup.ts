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
// share-image downscale path reads `naturalWidth/Height` after the Image's
// `onload`, then calls `canvas.toDataURL` — both no-ops in jsdom. Install
// deterministic stubs so the pipeline can run in unit tests. Tests that
// exercise the downscale path set `globalThis.__testImageDims` before
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

const STUB_2D_CONTEXT = {
  drawImage: () => {},
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
): RenderingContext | null {
  if (type === "2d") return STUB_2D_CONTEXT;
  return null;
} as HTMLCanvasElement["getContext"];

HTMLCanvasElement.prototype.toDataURL = function (type?: string): string {
  return `data:${type ?? "image/png"};base64,STUB`;
};

// jsdom does not rasterize, so `canvas.toBlob` is a no-op that never invokes
// its callback. The share-image export path (`photoToBlob`) awaits toBlob, so
// resolve it synchronously with a stub blob carrying the requested MIME type.
HTMLCanvasElement.prototype.toBlob = function (
  callback: BlobCallback,
  type?: string,
): void {
  callback(new Blob([new Uint8Array([1])], { type: type ?? "image/png" }));
};
