import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePhoto } from "./usePhoto";

const mkFile = (name: string, bytes: number[] = [1, 2, 3]): File =>
  new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });

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
});
