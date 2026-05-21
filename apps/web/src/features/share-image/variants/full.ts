import { drippers } from "@pourover/domain/drippers";
import { getMethodName } from "@pourover/domain/methods";
import {
  sessionDurationSec,
  type BrewSession,
  type Feeling,
} from "@pourover/domain/session";
import { formatTime } from "@/ui/format";
import {
  drawCover,
  drawFeelingGlyph,
  drawTrackedText,
  FONT_FAMILY,
} from "../render/composeCanvas";
import type { DrawProps, ShareColor, ShareVariant } from "./types";

const FEELING_LABEL: Record<Feeling, string> = {
  calm: "만족스러워요",
  neutral: "글쎄요",
  wave: "아쉬워요",
};

type Palette = {
  readonly text: string;
  readonly label: string;
  readonly divider: string;
  readonly wordmark: string;
  readonly scrimStops: readonly [string, string, string];
};

// Palettes mirror the Tailwind classes used by the previous DOM composer.
// `positive` overlays a dark scrim and uses light text;
// `negative` overlays a light scrim and uses dark text.
const PALETTE: Record<ShareColor, Palette> = {
  positive: {
    text: "#ffffff",
    label: "rgba(255,255,255,0.65)",
    divider: "rgba(255,255,255,0.25)",
    wordmark: "rgba(255,255,255,0.55)",
    scrimStops: ["rgba(0,0,0,0.78)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0)"],
  },
  negative: {
    text: "#2a241e",
    label: "rgba(0,0,0,0.55)",
    divider: "rgba(0,0,0,0.15)",
    wordmark: "rgba(0,0,0,0.45)",
    scrimStops: [
      "rgba(255,255,255,0.85)",
      "rgba(255,255,255,0.55)",
      "rgba(255,255,255,0)",
    ],
  },
};

const TRACK_WIDEST = 0.12;

// Layout constants for the 1080×1080 export — direct pixels match the
// Tailwind values that were applied to the previous DOM composer (p-14 = 56,
// gap-7 = 28, mt-2 = 8, h-px = 1, w-12 = 48).
const PAD = 56;
const GAP = 28;
const MT2 = 8;
const DIVIDER_W = 48;
const DIVIDER_H = 1;

// Row heights — chosen to match the rendered DOM (font-size × line-height
// rounded up). Keep these in sync with tailwind.config.ts fontSize entries.
const LABEL_H = 17;
const BIG_VALUE_H = 71;
const SMALL_VALUE_H = 31;
const FEELING_GLYPH = 26;

const formatShareDate = (epochMs: number): string => {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
};

const drawScrim = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stops: readonly [string, string, string],
): void => {
  // Original CSS: linear-gradient(to left, stop0 0%, stop1 40%, transparent 75%)
  // Equivalent canvas gradient runs from x=width → x=0.
  const grad = ctx.createLinearGradient(width, 0, 0, 0);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.4, stops[1]);
  grad.addColorStop(0.75, stops[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
};

const drawBigStat = (
  ctx: CanvasRenderingContext2D,
  value: string,
  label: string,
  x: number,
  y: number,
  palette: Palette,
): void => {
  ctx.fillStyle = palette.text;
  ctx.font = `500 64px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
  ctx.fillStyle = palette.label;
  ctx.font = `600 12px ${FONT_FAMILY}`;
  drawTrackedText(ctx, label.toUpperCase(), x, y + BIG_VALUE_H + MT2, TRACK_WIDEST, 12);
};

const drawSmallStat = (
  ctx: CanvasRenderingContext2D,
  value: string,
  label: string,
  x: number,
  y: number,
  palette: Palette,
): void => {
  ctx.fillStyle = palette.text;
  ctx.font = `600 24px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
  ctx.fillStyle = palette.label;
  ctx.font = `600 12px ${FONT_FAMILY}`;
  drawTrackedText(
    ctx,
    label.toUpperCase(),
    x,
    y + SMALL_VALUE_H + MT2,
    TRACK_WIDEST,
    12,
  );
};

const drawMethodLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  palette: Palette,
): void => {
  ctx.fillStyle = palette.label;
  ctx.font = `600 12px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  drawTrackedText(ctx, text.toUpperCase(), x, y, TRACK_WIDEST, 12);
};

const drawFeelingRow = (
  ctx: CanvasRenderingContext2D,
  feeling: Feeling,
  x: number,
  y: number,
  palette: Palette,
): void => {
  drawFeelingGlyph(ctx, feeling, x, y, FEELING_GLYPH, palette.text);
  ctx.fillStyle = palette.text;
  ctx.font = `600 24px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  // gap-2 = 8px between glyph and text; vertically center text on glyph row.
  ctx.fillText(
    FEELING_LABEL[feeling],
    x + FEELING_GLYPH + 8,
    y + (FEELING_GLYPH - 24) / 2,
  );
  ctx.fillStyle = palette.label;
  ctx.font = `600 12px ${FONT_FAMILY}`;
  drawTrackedText(
    ctx,
    "오늘의 기분".toUpperCase(),
    x,
    y + FEELING_GLYPH + MT2,
    TRACK_WIDEST,
    12,
  );
};

type StackItem = {
  readonly height: number;
  readonly render: (y: number) => void;
};

const computeStack = (
  ctx: CanvasRenderingContext2D,
  session: BrewSession,
  innerX: number,
  palette: Palette,
): readonly StackItem[] => {
  const { recipe } = session;
  const methodName = getMethodName(recipe.method);
  const timeStr = formatTime(sessionDurationSec(session));
  const items: StackItem[] = [
    {
      height: LABEL_H,
      render: (y) => drawMethodLabel(ctx, methodName, innerX, y, palette),
    },
    {
      height: BIG_VALUE_H + MT2 + LABEL_H,
      render: (y) => drawBigStat(ctx, timeStr, "시간", innerX, y, palette),
    },
    {
      height: DIVIDER_H,
      render: (y) => {
        ctx.fillStyle = palette.divider;
        ctx.fillRect(innerX, y, DIVIDER_W, DIVIDER_H);
      },
    },
    {
      height: SMALL_VALUE_H + MT2 + LABEL_H,
      render: (y) =>
        drawSmallStat(
          ctx,
          formatShareDate(session.startedAt),
          "날짜",
          innerX,
          y,
          palette,
        ),
    },
    {
      height: SMALL_VALUE_H + MT2 + LABEL_H,
      render: (y) =>
        drawSmallStat(
          ctx,
          drippers[recipe.dripper].name,
          "드리퍼",
          innerX,
          y,
          palette,
        ),
    },
    {
      height: SMALL_VALUE_H + MT2 + LABEL_H,
      render: (y) =>
        drawSmallStat(
          ctx,
          `${recipe.coffee}g · ${recipe.totalWater}g · ${recipe.temperature}°`,
          "원두 · 물 · 온도",
          innerX,
          y,
          palette,
        ),
    },
  ];
  if (session.feeling != null) {
    const feeling = session.feeling;
    items.push({
      height: FEELING_GLYPH + MT2 + LABEL_H,
      render: (y) => drawFeelingRow(ctx, feeling, innerX, y, palette),
    });
  }
  return items;
};

const drawWordmark = (
  ctx: CanvasRenderingContext2D,
  height: number,
  palette: Palette,
): void => {
  ctx.fillStyle = palette.wordmark;
  ctx.font = `400 12px ${FONT_FAMILY}`;
  ctx.textBaseline = "bottom";
  drawTrackedText(ctx, "pourover.work", 24, height - 24, TRACK_WIDEST, 12);
};

const drawFull = (
  ctx: CanvasRenderingContext2D,
  { session, photo, color, width, height }: DrawProps,
): void => {
  const palette = PALETTE[color];

  // 1. background photo cover
  drawCover(ctx, photo, 0, 0, width, height);

  // 2. scrim — heaviest on the right where the text panel sits
  drawScrim(ctx, width, height, palette.scrimStops);

  // 3. right-half text panel, vertically centered
  const innerX = width / 2 + PAD;
  const items = computeStack(ctx, session, innerX, palette);
  const totalH = items.reduce(
    (acc, it, i) => acc + it.height + (i > 0 ? GAP : 0),
    0,
  );
  let y = (height - totalH) / 2;
  for (const item of items) {
    item.render(y);
    y += item.height + GAP;
  }

  // 4. bottom-left wordmark
  drawWordmark(ctx, height, palette);
};

export const fullVariant: ShareVariant = {
  id: "full",
  name: "전체",
  exportSize: { width: 1080, height: 1080 },
  draw: drawFull,
};
