import { describe, expect, it, vi } from "vitest";
import { canvasToBlob } from "./canvasToBlob";

describe("canvasToBlob", () => {
  it("resolves with the blob produced by canvas.toBlob", async () => {
    const canvas = document.createElement("canvas");
    const blob = await canvasToBlob(canvas);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("forwards the requested MIME type", async () => {
    const fake = new Blob([new Uint8Array([1])], { type: "image/jpeg" });
    const canvas = {
      toBlob: vi.fn((cb: BlobCallback, type?: string) => {
        queueMicrotask(() => cb(new Blob([new Uint8Array([1])], { type })));
      }),
    } as unknown as HTMLCanvasElement;
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    expect(blob.type).toBe("image/jpeg");
    const calls = (canvas.toBlob as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![1]).toBe("image/jpeg");
    expect(calls[0]![2]).toBe(0.9);
    expect(fake.type).toBe("image/jpeg"); // sanity
  });

  it("rejects when canvas.toBlob produces null", async () => {
    const canvas = {
      toBlob: vi.fn((cb: BlobCallback) => {
        queueMicrotask(() => cb(null));
      }),
    } as unknown as HTMLCanvasElement;
    await expect(canvasToBlob(canvas)).rejects.toThrow(/canvasToBlob/);
  });
});
