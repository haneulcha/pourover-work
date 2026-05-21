import { forwardRef, useEffect, useRef } from "react";
import type { BrewSession } from "@pourover/domain/session";
import { ensureFontsReady } from "./render/composeCanvas";
import { getVariant } from "./variants/registry";
import type { ShareColor, ShareLayout } from "./variants/types";

type Props = {
  readonly session: BrewSession;
  readonly photoUrl: string;
  readonly layout: ShareLayout;
  readonly color: ShareColor;
};

const decodePhoto = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("ShareCanvas: photo decode failed"));
    img.src = url;
  });

const attachRef = (
  ref: React.Ref<HTMLCanvasElement>,
  node: HTMLCanvasElement | null,
): void => {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref != null) {
    (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
  }
};

// Renders the share image directly into a <canvas>. We composite the photo
// via ctx.drawImage and lay out text with Canvas2D — this avoids the
// foreignObject + canvas serialization path used by html-to-image, which is
// the root cause of the iOS WebKit bug where the photo cell exports blank.
export const ShareCanvas = forwardRef<HTMLCanvasElement, Props>(
  function ShareCanvas({ session, photoUrl, layout, color }, forwardedRef) {
    const localRef = useRef<HTMLCanvasElement | null>(null);
    const variant = getVariant(layout);
    const { width, height } = variant.exportSize;

    useEffect(() => {
      let cancelled = false;
      const canvas = localRef.current;
      if (canvas == null) return;
      const ctx = canvas.getContext("2d");
      if (ctx == null) return;
      (async () => {
        const [photo] = await Promise.all([
          decodePhoto(photoUrl),
          ensureFontsReady(),
        ]);
        if (cancelled) return;
        ctx.clearRect(0, 0, width, height);
        variant.draw(ctx, { session, photo, color, width, height });
      })().catch((err) => {
        if (!cancelled) {
          // Compose failure surfaces at export time as an empty/blank canvas;
          // the dialog reports it via its existing error UI.
          console.error("[share-image] compose failed:", err);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [session, photoUrl, color, variant, width, height]);

    return (
      <canvas
        ref={(node) => {
          localRef.current = node;
          attachRef(forwardedRef, node);
        }}
        width={width}
        height={height}
        data-share-canvas={layout}
        data-color={color}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: "block",
        }}
      />
    );
  },
);
