import { flushSync } from "react-dom";

type ViewTransitionLike = { finished: Promise<unknown> };

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => ViewTransitionLike;
};

export const withViewTransition = (update: () => void): void => {
  const doc = document as DocWithVT;
  if (typeof doc.startViewTransition === "function") {
    const transition = doc.startViewTransition(() => {
      // flushSync ensures React commits synchronously before the "after"
      // snapshot is captured. Without it, React 18/19 may batch across the
      // callback boundary and produce a stale snapshot.
      flushSync(update);
    });
    // Swallow rejection if the update callback throws — keeps VT aborts
    // from surfacing as unhandled rejections in the console.
    transition.finished.catch(() => {});
  } else {
    update();
  }
};
