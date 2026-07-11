import type { Pour, Recipe } from "./types";
import { c, g, ratio, s } from "./units";

// Recipe는 branded number들을 담는다. JSON.stringify는 브랜드를 벗겨
// 평범한 number로 만들므로, 역직렬화 시 도메인 생성자로 재부여해
// Principle 2(branded types 강제)를 지킨다.

export function recipeToJSON(recipe: Recipe): string {
  return JSON.stringify(recipe);
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
    index: p.index as number,
    atSec: s(p.atSec as number),
    pourAmount: g(p.pourAmount as number),
    cumulativeWater: g(p.cumulativeWater as number),
    ...(p.label === "bloom" ? { label: "bloom" as const } : {}),
  }));

  return {
    method: raw.method as Recipe["method"],
    dripper: raw.dripper as Recipe["dripper"],
    coffee: g(raw.coffee as number),
    totalWater: g(raw.totalWater as number),
    ratio: ratio(raw.ratio as number),
    temperature: c(raw.temperature as number),
    pours,
    totalTimeSec: s(raw.totalTimeSec as number),
    grindHint: raw.grindHint as Recipe["grindHint"],
    notes: (raw.notes as string[]) ?? [],
  };
}
