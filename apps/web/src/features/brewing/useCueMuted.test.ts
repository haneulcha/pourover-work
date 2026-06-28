import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCueMuted } from "./useCueMuted";

describe("useCueMuted", () => {
  afterEach(() => localStorage.clear());

  it("기본값은 false (ON)", () => {
    const { result } = renderHook(() => useCueMuted());
    expect(result.current[0]).toBe(false);
  });

  it("토글하면 true 가 되고 localStorage 에 영속", () => {
    const { result } = renderHook(() => useCueMuted());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("pourover.cue.muted")).toBe("true");
  });

  it("재마운트 시 영속값을 읽는다", () => {
    localStorage.setItem("pourover.cue.muted", "true");
    const { result } = renderHook(() => useCueMuted());
    expect(result.current[0]).toBe(true);
  });
});
