import { useCallback, useMemo, useRef, useState } from "react";

export type PhotoState =
  | { readonly kind: "empty" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly url: string; readonly file: File };

const EMPTY_STATE: PhotoState = { kind: "empty" };
const LOADING_STATE: PhotoState = { kind: "loading" };

const DOWNSCALE_LONG_EDGE = 1600;
const DOWNSCALE_QUALITY = 0.85;

const decodeImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("usePhoto: image decode failed"));
    img.src = url;
  });

const downscaleIfLarge = async (originalDataUrl: string): Promise<string> => {
  try {
    const img = await decodeImage(originalDataUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const longEdge = Math.max(w, h);
    if (longEdge === 0 || longEdge <= DOWNSCALE_LONG_EDGE) {
      return originalDataUrl;
    }
    const scale = DOWNSCALE_LONG_EDGE / longEdge;
    const dw = Math.max(1, Math.round(w * scale));
    const dh = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");
    if (ctx == null) return originalDataUrl;
    ctx.drawImage(img, 0, 0, dw, dh);
    return canvas.toDataURL("image/jpeg", DOWNSCALE_QUALITY);
  } catch {
    return originalDataUrl;
  }
};

// Reads the file as a data URL rather than a blob URL so the loaded photo can
// be persisted/rehydrated without object-URL lifetime management, and decoded
// straight into a canvas at export time (see `render/photoToBlob`).
//
// Camera-original photos (4000+px, several MB) bloat React state, DOM, and
// localStorage, so downscale long-edge > 1600px sources to a 1600px JPEG
// (quality 0.85) before storing; smaller inputs pass through untouched. The
// share export downscales again to 800px, but a 1600px store keeps the
// on-screen preview crisp.
export const usePhoto = (): {
  state: PhotoState;
  setFile: (file: File) => void;
  clear: () => void;
} => {
  const [state, setState] = useState<PhotoState>(EMPTY_STATE);
  const tokenRef = useRef(0);

  const setFile = useCallback((file: File) => {
    const token = ++tokenRef.current;
    setState(LOADING_STATE);
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result;
      if (typeof raw !== "string") {
        if (tokenRef.current === token) setState(EMPTY_STATE);
        return;
      }
      const url = await downscaleIfLarge(raw);
      if (tokenRef.current !== token) return;
      setState({ kind: "loaded", url, file });
    };
    reader.onerror = () => {
      if (tokenRef.current === token) setState(EMPTY_STATE);
    };
    reader.readAsDataURL(file);
  }, []);

  const clear = useCallback(() => {
    tokenRef.current++;
    setState((prev) => (prev.kind === "empty" ? prev : EMPTY_STATE));
  }, []);

  return useMemo(() => ({ state, setFile, clear }), [state, setFile, clear]);
};
