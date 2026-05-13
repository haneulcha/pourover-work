import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("html-to-image", () => ({
  toBlob: vi.fn(),
}));

import { toBlob } from "html-to-image";
import { domToBlob } from "./domToBlob";

const mockedToBlob = vi.mocked(toBlob);

const makeBlob = (): Blob => new Blob([new Uint8Array([0])], { type: "image/png" });

describe("domToBlob", () => {
  beforeEach(() => {
    mockedToBlob.mockReset();
    mockedToBlob.mockResolvedValue(makeBlob());
  });

  it("returns a blob and calls html-to-image with the given size", async () => {
    const node = document.createElement("div");
    const result = await domToBlob(node, { width: 320, height: 480 });
    expect(result).toBeInstanceOf(Blob);
    expect(mockedToBlob).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ width: 320, height: 480, pixelRatio: 2 }),
    );
  });

  it("awaits img.decode() before calling toBlob — single image", async () => {
    const order: string[] = [];
    const node = document.createElement("div");
    const img = document.createElement("img");
    img.decode = vi.fn(async () => {
      order.push("decode");
    });
    node.appendChild(img);
    mockedToBlob.mockImplementation(async () => {
      order.push("toBlob");
      return makeBlob();
    });

    await domToBlob(node, { width: 10, height: 10 });

    expect(order).toEqual(["decode", "toBlob"]);
    expect(img.decode).toHaveBeenCalledOnce();
  });

  it("awaits decode for every image before toBlob — multiple images", async () => {
    const order: string[] = [];
    const node = document.createElement("div");
    const img1 = document.createElement("img");
    const img2 = document.createElement("img");
    img1.decode = vi.fn(async () => {
      order.push("d1");
    });
    img2.decode = vi.fn(async () => {
      order.push("d2");
    });
    node.appendChild(img1);
    node.appendChild(img2);
    mockedToBlob.mockImplementation(async () => {
      order.push("toBlob");
      return makeBlob();
    });

    await domToBlob(node, { width: 10, height: 10 });

    expect(order).toContain("d1");
    expect(order).toContain("d2");
    expect(order[order.length - 1]).toBe("toBlob");
  });

  it("swallows individual decode rejections and still calls toBlob", async () => {
    const node = document.createElement("div");
    const img = document.createElement("img");
    img.decode = vi.fn(async () => {
      throw new Error("broken image");
    });
    node.appendChild(img);

    await expect(domToBlob(node, { width: 10, height: 10 })).resolves.toBeInstanceOf(
      Blob,
    );
    expect(mockedToBlob).toHaveBeenCalledOnce();
  });

  it("throws when html-to-image returns null", async () => {
    mockedToBlob.mockResolvedValue(null);
    await expect(
      domToBlob(document.createElement("div"), { width: 10, height: 10 }),
    ).rejects.toThrow(/null/);
  });
});
