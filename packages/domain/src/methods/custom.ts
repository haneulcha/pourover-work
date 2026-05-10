import { ratio as makeRatio } from "../units";
import type {
  Celsius, DripperId, Grams, GrindHint, Pour, Recipe, Seconds,
} from "../types";

export type CustomPourInput = {
  readonly atSec: Seconds;
  readonly pourAmount: Grams;
  readonly label?: "bloom";
};

export type CustomRecipeInput = {
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly temperature: Celsius;
  readonly grindHint: GrindHint;
  readonly totalTimeSec: Seconds;
  readonly pours: readonly CustomPourInput[];
};

export type ValidationError =
  | { readonly kind: "coffee-non-positive" }
  | { readonly kind: "water-non-positive" }
  | { readonly kind: "time-non-positive" }
  | { readonly kind: "no-pours" }
  | { readonly kind: "first-pour-not-zero" }
  | { readonly kind: "non-monotonic-time"; readonly pourIndex: number }
  | { readonly kind: "pour-after-total-time"; readonly pourIndex: number }
  | { readonly kind: "non-positive-pour"; readonly pourIndex: number }
  | { readonly kind: "sum-mismatch"; readonly sum: number; readonly totalWater: number }
  | { readonly kind: "bloom-not-on-first"; readonly pourIndex: number };

export type BuildResult =
  | { readonly ok: true; readonly recipe: Recipe }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export const buildCustomRecipe = (input: CustomRecipeInput): BuildResult => {
  const errors: ValidationError[] = [];
  if ((input.coffee as number) <= 0) errors.push({ kind: "coffee-non-positive" });
  if ((input.totalWater as number) <= 0) errors.push({ kind: "water-non-positive" });
  if ((input.totalTimeSec as number) <= 0) errors.push({ kind: "time-non-positive" });
  if (input.pours.length === 0) errors.push({ kind: "no-pours" });

  if (input.pours.length > 0) {
    if ((input.pours[0]!.atSec as number) !== 0) errors.push({ kind: "first-pour-not-zero" });
    input.pours.forEach((p, i) => {
      if ((p.pourAmount as number) <= 0) errors.push({ kind: "non-positive-pour", pourIndex: i });
      if ((p.atSec as number) > (input.totalTimeSec as number))
        errors.push({ kind: "pour-after-total-time", pourIndex: i });
      if (i > 0 && (p.atSec as number) <= (input.pours[i - 1]!.atSec as number))
        errors.push({ kind: "non-monotonic-time", pourIndex: i });
      if (p.label === "bloom" && i !== 0)
        errors.push({ kind: "bloom-not-on-first", pourIndex: i });
    });
    const sum = input.pours.reduce((acc, p) => acc + (p.pourAmount as number), 0);
    if (Math.abs(sum - (input.totalWater as number)) > 0.01)
      errors.push({ kind: "sum-mismatch", sum, totalWater: input.totalWater as number });
  }

  if (errors.length > 0) return { ok: false, errors };

  let cumulative = 0;
  const pours: Pour[] = input.pours.map((p, index) => {
    cumulative += p.pourAmount as number;
    return {
      index,
      atSec: p.atSec,
      pourAmount: p.pourAmount,
      cumulativeWater: cumulative as Grams,
      ...(p.label ? { label: p.label } : {}),
    };
  });

  const recipe: Recipe = {
    method: "custom",
    dripper: input.dripper,
    coffee: input.coffee,
    totalWater: input.totalWater,
    ratio: makeRatio((input.totalWater as number) / (input.coffee as number)),
    temperature: input.temperature,
    pours,
    totalTimeSec: input.totalTimeSec,
    grindHint: input.grindHint,
    notes: [],
  };
  return { ok: true, recipe };
};
