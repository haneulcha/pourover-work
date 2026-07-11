// Rasterizes the photo to a shareable blob using a plain 2D canvas
// (`drawImage` → `canvas.toBlob`) — the same primitive `usePhoto` already
// downscales with, and the only path that survives iOS Safari reliably.
//
// This deliberately replaces the previous `html-to-image` / foreignObject
// approach: Safari's foreignObject compositor drops embedded raster <img>s
// (especially with `object-fit: cover`), so the exported PNG kept the recipe
// card but blanked the photo. `drawImage` has no such failure mode, so the
// share image is just the photo, capped at 800px on its long edge.
const MAX_EDGE = 800;
const QUALITY = 0.85;

const decodeImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photoToBlob: image decode failed"));
    img.src = url;
  });

export const photoToBlob = async (
  dataUrl: string,
  maxEdge: number = MAX_EDGE,
): Promise<Blob> => {
  const img = await decodeImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const longEdge = Math.max(w, h);
  const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (ctx == null) {
    throw new Error("photoToBlob: 2D context unavailable");
  }
  ctx.drawImage(img, 0, 0, dw, dh);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", QUALITY);
  });
  if (blob == null) {
    throw new Error("photoToBlob: canvas.toBlob returned null");
  }
  return blob;
};
