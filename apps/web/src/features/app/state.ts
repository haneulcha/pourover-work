import { methodsForDripper } from "@pourover/domain/methods";
import type {
  BrewMethodId,
  DripperId,
  Grams,
  Recipe,
  RoastLevel,
  TasteProfile,
} from "@pourover/domain/types";
import { g } from "@pourover/domain/units";

export type Screen = "wall" | "recipe" | "brewing" | "complete" | "custom";

export type AppState = {
  readonly screen: Screen;
  readonly coffee: Grams;
  readonly dripper: DripperId;
  readonly method: BrewMethodId;
  readonly roast: RoastLevel;
  readonly taste: TasteProfile;
  readonly customRecipe?: Recipe;
};

export const DEFAULT_STATE: AppState = {
  screen: "wall",
  coffee: g(20),
  dripper: "v60",
  method: "kasuya_4_6",
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
};

export const mergeState = (
  base: AppState,
  patch: Partial<AppState>,
): AppState => {
  const merged = { ...base, ...patch };
  if (merged.method === "custom") return merged;
  const compat = methodsForDripper(merged.dripper);
  if (!compat.some((m) => m.id === merged.method)) {
    return { ...merged, method: compat[0]!.id };
  }
  return merged;
};
