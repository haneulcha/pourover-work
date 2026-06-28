import { afterEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "./haptics";

describe("vibrate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error 테스트 정리
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  it("navigator.vibrate 가 있으면 그것을 패턴과 함께 호출", () => {
    const spy = vi.fn(() => true);
    (navigator as { vibrate?: unknown }).vibrate = spy;
    vibrate([60, 50, 60]);
    expect(spy).toHaveBeenCalledWith([60, 50, 60]);
  });

  it("navigator.vibrate 가 없으면 throw 없이 폴백 — 숨김 switch label 을 click", () => {
    // jsdom: navigator.vibrate 없음. 폴백이 label.click() 호출하는지 spy.
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click");
    expect(() => vibrate([40])).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();
  });
});
