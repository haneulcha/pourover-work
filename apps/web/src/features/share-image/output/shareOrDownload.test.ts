import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canNativeShareImage,
  shareOrDownload,
} from "./shareOrDownload";

const makeBlob = (): Blob =>
  new Blob([new Uint8Array([0x89, 0x50])], { type: "image/png" });

describe("canNativeShareImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when navigator.canShare is missing", () => {
    vi.stubGlobal("navigator", {});
    expect(canNativeShareImage()).toBe(false);
  });

  it("returns true when navigator.canShare returns true for files", () => {
    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
    });
    expect(canNativeShareImage()).toBe(true);
  });

  it("returns false when navigator.canShare returns false", () => {
    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(false),
    });
    expect(canNativeShareImage()).toBe(false);
  });
});

describe("shareOrDownload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns 'shared' when navigator.share resolves", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share,
    });
    const result = await shareOrDownload(makeBlob(), "x.png");
    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    const arg = share.mock.calls[0]![0] as ShareData;
    expect(arg.files?.[0]?.name).toBe("x.png");
  });

  it("returns 'cancelled' when navigator.share rejects with AbortError", async () => {
    const err = new DOMException("user cancelled", "AbortError");
    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(err),
    });
    const result = await shareOrDownload(makeBlob(), "x.png");
    expect(result).toBe("cancelled");
  });

  it("returns 'failed' when navigator.share rejects with other error", async () => {
    vi.stubGlobal("navigator", {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const result = await shareOrDownload(makeBlob(), "x.png");
    expect(result).toBe("failed");
  });

  it("falls back to download when share is unsupported", async () => {
    vi.stubGlobal("navigator", {});
    const click = vi.fn();
    const anchor = {
      href: "",
      download: "",
      click,
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const result = await shareOrDownload(makeBlob(), "x.png");

    expect(result).toBe("downloaded");
    expect(anchor.download).toBe("x.png");
    expect(anchor.href).toBe("blob:fake");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:fake");
  });
});
