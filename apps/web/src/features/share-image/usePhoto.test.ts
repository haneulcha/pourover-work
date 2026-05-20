import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePhoto } from "./usePhoto";

const mkFile = (name: string, bytes: number[] = [1, 2, 3]): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });

const STUB_DOWNSCALED_URL = "data:image/jpeg;base64,STUB";

beforeEach(() => {
  globalThis.__testImageDims = { width: 0, height: 0 };
});

afterEach(() => {
  globalThis.__testImageDims = { width: 0, height: 0 };
});

describe("usePhoto", () => {
  it("starts in 'empty' state", () => {
    const { result } = renderHook(() => usePhoto());
    expect(result.current.state).toEqual({ kind: "empty" });
  });

  it("setFile transitions to 'loading' then 'loaded' with a data URL", async () => {
    const { result } = renderHook(() => usePhoto());
    const file = mkFile("a.jpg");

    act(() => result.current.setFile(file));
    expect(result.current.state).toEqual({ kind: "loading" });

    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    if (result.current.state.kind !== "loaded") throw new Error("unreachable");
    expect(result.current.state.file).toBe(file);
    expect(result.current.state.url.startsWith("data:image/jpeg")).toBe(true);
  });

  it("setFile twice replaces the previous photo", async () => {
    const { result } = renderHook(() => usePhoto());
    act(() => result.current.setFile(mkFile("a.jpg", [1, 2])));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    const firstUrl =
      result.current.state.kind === "loaded" ? result.current.state.url : null;

    act(() => result.current.setFile(mkFile("b.jpg", [3, 4, 5])));
    await waitFor(() => {
      expect(result.current.state.kind).toBe("loaded");
      if (result.current.state.kind === "loaded") {
        expect(result.current.state.url).not.toBe(firstUrl);
      }
    });
  });

  it("clear returns to 'empty'", async () => {
    const { result } = renderHook(() => usePhoto());
    act(() => result.current.setFile(mkFile("a.jpg")));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    act(() => result.current.clear());
    expect(result.current.state).toEqual({ kind: "empty" });
  });

  it("clear from already-empty state preserves reference equality (no re-render)", () => {
    const { result } = renderHook(() => usePhoto());
    const firstState = result.current.state;
    act(() => result.current.clear());
    expect(result.current.state).toBe(firstState);
  });

  it("downscales sources whose long edge exceeds 1600px to a JPEG", async () => {
    globalThis.__testImageDims = { width: 4000, height: 3000 };
    const { result } = renderHook(() => usePhoto());

    act(() => result.current.setFile(mkFile("big.jpg")));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    if (result.current.state.kind !== "loaded") throw new Error("unreachable");
    expect(result.current.state.url).toBe(STUB_DOWNSCALED_URL);
  });

  it("downscales when the long edge is vertical", async () => {
    globalThis.__testImageDims = { width: 1200, height: 3200 };
    const { result } = renderHook(() => usePhoto());

    act(() => result.current.setFile(mkFile("tall.jpg")));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    if (result.current.state.kind !== "loaded") throw new Error("unreachable");
    expect(result.current.state.url).toBe(STUB_DOWNSCALED_URL);
  });

  it("leaves sources within 1600px untouched", async () => {
    globalThis.__testImageDims = { width: 800, height: 600 };
    const { result } = renderHook(() => usePhoto());

    act(() => result.current.setFile(mkFile("small.jpg")));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    if (result.current.state.kind !== "loaded") throw new Error("unreachable");
    expect(result.current.state.url).not.toBe(STUB_DOWNSCALED_URL);
    expect(result.current.state.url.startsWith("data:image/jpeg;base64,")).toBe(
      true,
    );
  });

  it("leaves sources exactly at the 1600px threshold untouched", async () => {
    globalThis.__testImageDims = { width: 1600, height: 1200 };
    const { result } = renderHook(() => usePhoto());

    act(() => result.current.setFile(mkFile("edge.jpg")));
    await waitFor(() => expect(result.current.state.kind).toBe("loaded"));
    if (result.current.state.kind !== "loaded") throw new Error("unreachable");
    expect(result.current.state.url).not.toBe(STUB_DOWNSCALED_URL);
  });
});
