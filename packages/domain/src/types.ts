export type Grams = number & { readonly __brand: "Grams" };
export type Celsius = number & { readonly __brand: "Celsius" };
export type Seconds = number & { readonly __brand: "Seconds" };
export type Ratio = number & { readonly __brand: "Ratio" };

export type DripperId = "v60" | "kalita_wave" | "kalita_102";
export type BrewMethodId =
  | "kasuya_4_6"
  | "hoffmann_v60"
  | "scott_rao"
  | "april"
  | "kurasu_kyoto"
  | "frothy_monkey"
  | "standard_3_stage"
  | "caffe_luxxe"
  | "fuglen_tokyo";
export type RoastLevel = "light" | "medium" | "dark";

export type GrindHint =
  | "fine"
  | "medium-fine"
  | "medium"
  | "medium-coarse"
  | "coarse";

export type SweetnessProfile = "sweet" | "balanced" | "bright";
export type StrengthProfile = "light" | "medium" | "strong";

export type TasteProfile = {
  readonly sweetness: SweetnessProfile;
  readonly strength: StrengthProfile;
};

export type Pour = {
  readonly index: number;
  readonly atSec: Seconds;
  readonly pourAmount: Grams;
  readonly cumulativeWater: Grams;
  readonly label?: "bloom";
};

export type Recipe = {
  readonly method: BrewMethodId;
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly ratio: Ratio;
  readonly temperature: Celsius;
  readonly pours: readonly Pour[];
  readonly totalTimeSec: Seconds;
  readonly grindHint: GrindHint;
  readonly notes: readonly string[];
};

export type RecipeInput = {
  readonly method: BrewMethodId;
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly roast: RoastLevel;
  readonly taste: TasteProfile;
};

export type BrewMethod = {
  readonly id: BrewMethodId;
  readonly name: string;
  readonly shortName?: string;
  readonly description: string;
  readonly supportedDrippers: readonly DripperId[];
  readonly defaultRatio: Ratio;
  readonly compute: (input: RecipeInput) => Recipe;
};
