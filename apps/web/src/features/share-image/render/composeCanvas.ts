// Shared low-level Canvas 2D helpers used by variant draw functions.
//
// We export this module rather than embedding the helpers in each variant
// so that the cover algorithm, tracked-text emulation, and feeling glyph
// stay byte-identical across layouts.

import type { Feeling } from "@pourover/domain/session";

export const FONT_FAMILY =
  '"Pretendard Variable", "Pretendard", "Inter", system-ui, "Apple SD Gothic Neo", sans-serif';

// `object-fit: cover` equivalent — center-crop the source onto the dest box.
export const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void => {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (iw === 0 || ih === 0 || dw === 0 || dh === 0) return;
  const sourceRatio = iw / ih;
  const destRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (sourceRatio > destRatio) {
    sw = ih * destRatio;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / destRatio;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
};

// Emulate CSS `letter-spacing` by laying out characters individually.
// Canvas2D has a native `letterSpacing` property but only iOS 16.4+ /
// Safari 18+ and not all engines; manual layout is reliable everywhere.
export const drawTrackedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  trackingEm: number,
  fontSize: number,
): void => {
  const tracking = fontSize * trackingEm;
  let cx = x;
  // Iterate by grapheme-like units. For our copy (latin uppercase + Korean)
  // a simple Array.from is sufficient; Korean syllables decompose cleanly.
  for (const ch of Array.from(text)) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
};

// 34×34 baseline matches the SVG in FeelingGlyph.tsx; we scale to `size`.
export const drawFeelingGlyph = (
  ctx: CanvasRenderingContext2D,
  kind: Feeling,
  x: number,
  y: number,
  size: number,
  color: string,
): void => {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 34;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (kind === "calm") {
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(17, 17, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(17, 17, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "neutral") {
    ctx.lineCap = "round";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(5, 17);
    ctx.lineTo(29, 17);
    ctx.stroke();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(17, 13);
    ctx.lineTo(17, 21);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    // wave: two stacked sine-like curves.
    // Original SVG used `T` (smooth quadratic continuation); manually
    // compute the reflected control points so quadraticCurveTo matches.
    ctx.lineCap = "round";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, 14);
    ctx.quadraticCurveTo(10, 8, 17, 14);
    ctx.quadraticCurveTo(24, 20, 30, 14);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.quadraticCurveTo(10, 26, 17, 20);
    ctx.quadraticCurveTo(24, 14, 30, 20);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
};

// Wait for declared web fonts to load before drawing text into the canvas.
// Without this, Pretendard may not be ready at first paint and fillText
// falls back to a system font, breaking visual parity with the live UI.
export const ensureFontsReady = async (): Promise<void> => {
  if (typeof document === "undefined") return;
  const fonts = document.fonts as FontFaceSet | undefined;
  if (fonts?.ready != null) {
    try {
      await fonts.ready;
    } catch {
      // fonts.ready rarely rejects; fall through and draw with whatever is loaded.
    }
  }
};
