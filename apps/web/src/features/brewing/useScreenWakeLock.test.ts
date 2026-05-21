import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScreenWakeLock } from "./useScreenWakeLock";

type FakeSentinel = {
  released: boolean;
  release: ReturnType<typeof vi.fn>;
};

function makeSentinel(): FakeSentinel {
  const sentinel: FakeSentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
    }),
  };
  return sentinel;
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

const originalWakeLockDescriptor = Object.getOwnPropertyDescriptor(
  Navigator.prototype,
  "wakeLock",
);

function installWakeLock(request: (type: string) => Promise<FakeSentinel>) {
  Object.defineProperty(navigator, "wakeLock", {
    value: { request },
    configurable: true,
  });
}

function uninstallWakeLock() {
  // Restore original (typically undefined in jsdom) so other tests see a
  // clean slate.
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
  if (originalWakeLockDescriptor) {
    Object.defineProperty(
      Navigator.prototype,
      "wakeLock",
      originalWakeLockDescriptor,
    );
  }
}

beforeEach(() => {
  setVisibility("visible");
});

afterEach(() => {
  uninstallWakeLock();
});

describe("useScreenWakeLock", () => {
  it("requests a screen wake lock on mount", async () => {
    const sentinel = makeSentinel();
    const request = vi.fn(async () => sentinel);
    installWakeLock(request);

    const { unmount } = renderHook(() => useScreenWakeLock());
    await act(async () => {});

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");
    unmount();
  });

  it("releases the sentinel on unmount", async () => {
    const sentinel = makeSentinel();
    installWakeLock(async () => sentinel);

    const { unmount } = renderHook(() => useScreenWakeLock());
    await act(async () => {});

    unmount();
    expect(sentinel.release).toHaveBeenCalledTimes(1);
  });

  it("re-acquires the wake lock when the tab becomes visible again", async () => {
    const sentinels = [makeSentinel(), makeSentinel()];
    let i = 0;
    const request = vi.fn(async () => sentinels[i++]!);
    installWakeLock(request);

    const { unmount } = renderHook(() => useScreenWakeLock());
    await act(async () => {});
    expect(request).toHaveBeenCalledTimes(1);

    // Simulate browser auto-release on backgrounding.
    sentinels[0]!.released = true;
    await act(async () => {
      setVisibility("hidden");
    });

    await act(async () => {
      setVisibility("visible");
    });

    expect(request).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("does not re-acquire if the current sentinel is still alive", async () => {
    const sentinel = makeSentinel();
    const request = vi.fn(async () => sentinel);
    installWakeLock(request);

    const { unmount } = renderHook(() => useScreenWakeLock());
    await act(async () => {});
    expect(request).toHaveBeenCalledTimes(1);

    await act(async () => {
      setVisibility("visible");
    });

    expect(request).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("is a silent no-op when navigator.wakeLock is unsupported", () => {
    // Don't install wakeLock. Should not throw.
    expect(() => {
      const { unmount } = renderHook(() => useScreenWakeLock());
      unmount();
    }).not.toThrow();
  });

  it("swallows request rejection without throwing", async () => {
    const request = vi.fn(async () => {
      throw new Error("NotAllowedError");
    });
    installWakeLock(request as unknown as (type: string) => Promise<FakeSentinel>);

    const { unmount } = renderHook(() => useScreenWakeLock());
    await act(async () => {});

    expect(request).toHaveBeenCalledTimes(1);
    unmount();
  });
});
