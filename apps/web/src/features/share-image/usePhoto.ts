import { useCallback, useMemo, useState } from "react";

export type PhotoState =
  | { readonly kind: "empty" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly url: string; readonly file: File };

const EMPTY_STATE: PhotoState = { kind: "empty" };
const LOADING_STATE: PhotoState = { kind: "loading" };

// Reads the file as a data URL rather than a blob URL because html-to-image's
// foreignObject rasterization cannot reliably inline blob: sources during
// canvas export — the resulting PNG silently drops the photo or throws
// SecurityError when the canvas is tainted.
export const usePhoto = (): {
  state: PhotoState;
  setFile: (file: File) => void;
  clear: () => void;
} => {
  const [state, setState] = useState<PhotoState>(EMPTY_STATE);

  const setFile = useCallback((file: File) => {
    setState(LOADING_STATE);
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (typeof url === "string") {
        setState({ kind: "loaded", url, file });
      } else {
        setState(EMPTY_STATE);
      }
    };
    reader.onerror = () => setState(EMPTY_STATE);
    reader.readAsDataURL(file);
  }, []);

  const clear = useCallback(() => {
    setState((prev) => (prev.kind === "empty" ? prev : EMPTY_STATE));
  }, []);

  return useMemo(() => ({ state, setFile, clear }), [state, setFile, clear]);
};
