import { afterEach, describe, expect, it, vi } from "vitest";
import { _resetHapticsForTest, vibrate } from "./haptics";

describe("vibrate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as { vibrate?: unknown }).vibrate;
    _resetHapticsForTest();
  });

  it("navigator.vibrate 가 있으면 그것을 패턴과 함께 호출", () => {
    const spy = vi.fn(() => true);
    (navigator as { vibrate?: unknown }).vibrate = spy;
    vibrate([60, 50, 60]);
    expect(spy).toHaveBeenCalledWith([60, 50, 60]);
  });

  it("navigator.vibrate 가 없으면 throw 없이 숨김 switch label 을 만들고 그것을 click 한다", () => {
    // 1차 호출: 폴백이 label 을 생성(첫 호출은 lazy 생성 + click).
    expect(() => vibrate([40])).not.toThrow();
    const label = document.querySelector<HTMLLabelElement>(
      'label[aria-hidden="true"]',
    );
    expect(label).not.toBeNull();
    // 2차 호출: 싱글톤 재사용 — 바로 그 인스턴스의 click 이 호출되는지 정밀 검증.
    const clickSpy = vi.spyOn(label!, "click");
    vibrate([40]);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
