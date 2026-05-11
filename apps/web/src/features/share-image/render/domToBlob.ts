import { toBlob } from "html-to-image";

export const domToBlob = async (
  node: HTMLElement,
  opts: {
    readonly width: number;
    readonly height: number;
    readonly pixelRatio?: number;
  },
): Promise<Blob> => {
  const blob = await toBlob(node, {
    width: opts.width,
    height: opts.height,
    pixelRatio: opts.pixelRatio ?? 2,
    cacheBust: true,
  });
  if (blob == null) {
    throw new Error("domToBlob: html-to-image returned null");
  }
  return blob;
};
