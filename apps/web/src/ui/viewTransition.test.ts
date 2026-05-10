import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withViewTransition } from "./viewTransition";

// We use any-cast at the boundary because the lib.dom.d.ts signature for
// startViewTransition returns a rich ViewTransition object; test stubs don't
// need that surface. Keeping the casts local to tests so production code stays
// strictly typed.
const docAny = document as unknown as {
  startViewTransition?: unknown;
};

describe("withViewTransition", () => {
  let originalStartVT: unknown;

  beforeEach(() => {
    originalStartVT = docAny.startViewTransition;
  });

  afterEach(() => {
    if (originalStartVT !== undefined) {
      docAny.startViewTransition = originalStartVT;
    } else {
      delete docAny.startViewTransition;
    }
  });

  it("runs update directly when startViewTransition is not available", () => {
    delete docAny.startViewTransition;
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("delegates to startViewTransition when available", () => {
    const update = vi.fn();
    const fakeStart = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    docAny.startViewTransition = fakeStart;
    withViewTransition(update);
    expect(fakeStart).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not invoke update twice when both paths would execute", () => {
    // Safety: ensure we don't call update() outside AND inside startViewTransition
    const update = vi.fn();
    docAny.startViewTransition = (cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    };
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
