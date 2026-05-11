import type { GrindHint } from "@pourover/domain/types";

export const formatTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const GRIND_HINT_LABEL: Record<GrindHint, string> = {
  fine: "설탕 정도",
  "medium-fine": "고운 소금 정도",
  medium: "굵은 소금 정도",
  "medium-coarse": "거친 설탕 정도",
  coarse: "굵은 후추 정도",
};

export const formatGrindHint = (hint: GrindHint): string =>
  GRIND_HINT_LABEL[hint];

// Percentage formatter for CSS sizing (always 2 decimals, "%" suffix).
export const toPct = (ratio: number): string =>
  `${(ratio * 100).toFixed(2)}%`;

export const formatBrewedAt = (epochMs: number): string => {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours24 = d.getHours();
  const hour12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours24 < 12 ? "오전" : "오후";
  return `${year} · ${month} · ${day} · ${ampm} ${hour12}:${minute}`;
};
