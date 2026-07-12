import type { Pour, Recipe } from "./types";
import { c, g, ratio, s } from "./units";

// Recipe는 branded number들을 담는다. JSON.stringify는 브랜드를 벗겨
// 평범한 number로 만들므로, 역직렬화 시 도메인 생성자로 재부여해
// Principle 2(branded types 강제)를 지킨다.

export function recipeToJSON(recipe: Recipe): string {
  return JSON.stringify(recipe);
}

function assertFinite(value: unknown): number {
  if (!Number.isFinite(value)) {
    throw new Error("recipeFromJSON: malformed recipe payload");
  }
  return value as number;
}

export function recipeFromJSON(json: string): Recipe {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (
    typeof raw.method !== "string" ||
    typeof raw.dripper !== "string" ||
    !Array.isArray(raw.pours)
  ) {
    throw new Error("recipeFromJSON: malformed recipe payload");
  }

  const pours: Pour[] = (raw.pours as Record<string, unknown>[]).map((p) => ({
    index: assertFinite(p.index),
    atSec: s(assertFinite(p.atSec)),
    pourAmount: g(assertFinite(p.pourAmount)),
    cumulativeWater: g(assertFinite(p.cumulativeWater)),
    ...(p.label === "bloom" ? { label: "bloom" as const } : {}),
  }));

  return {
    method: raw.method as Recipe["method"],
    dripper: raw.dripper as Recipe["dripper"],
    coffee: g(assertFinite(raw.coffee)),
    totalWater: g(assertFinite(raw.totalWater)),
    ratio: ratio(assertFinite(raw.ratio)),
    temperature: c(assertFinite(raw.temperature)),
    pours,
    totalTimeSec: s(assertFinite(raw.totalTimeSec)),
    grindHint: raw.grindHint as Recipe["grindHint"],
    notes: (raw.notes as string[]) ?? [],
  };
}
