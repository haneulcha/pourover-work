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

const formatClock12 = (d: Date): string => {
  const hours24 = d.getHours();
  const hour12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const minute = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours24 < 12 ? "오전" : "오후";
  return `${ampm} ${hour12}:${minute}`;
};

export const formatBrewedAt = (epochMs: number): string => {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year} · ${month} · ${day} · ${formatClock12(d)}`;
};

// 일기 한 줄의 시각 — "오전 8:20".
export const formatLogClock = (iso: string): string => formatClock12(new Date(iso));

const startOfDayMs = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const MS_PER_DAY = 86_400_000;

// 일기의 날짜 머리말 — "오늘" / "어제" / "7월 8일" / "2025년 12월 3일".
// 같은 해면 연도를 생략한다. 하루 경계는 로컬 자정 기준.
export const formatLogDay = (iso: string, now: Date = new Date()): string => {
  const d = new Date(iso);
  const daysAgo = Math.round((startOfDayMs(now) - startOfDayMs(d)) / MS_PER_DAY);
  if (daysAgo === 0) return "오늘";
  if (daysAgo === 1) return "어제";
  const monthDay = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return d.getFullYear() === now.getFullYear()
    ? monthDay
    : `${d.getFullYear()}년 ${monthDay}`;
};
