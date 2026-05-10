import { c, g, ratio, s } from "../units";
import type {
  BrewMethod,
  GrindHint,
  Pour,
  Recipe,
  RecipeInput,
  RoastLevel,
  StrengthProfile,
  SweetnessProfile,
} from "../types";

const METHOD_RATIO = 15.6;
const BLOOM_RATIO_TO_COFFEE = 2.5;
const GAP_AFTER_SECOND_POUR_SEC = 15;
const DRAWDOWN_SEC = 60;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 93,
  medium: 92,
  dark: 90,
};

const bloomDurationBySweetness: Record<SweetnessProfile, number> = {
  sweet: 50,
  balanced: 40,
  bright: 30,
};

const grindByStrength: Record<StrengthProfile, GrindHint> = {
  light: "coarse",
  medium: "medium-coarse",
  strong: "medium",
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(coffee * BLOOM_RATIO_TO_COFFEE);
  const pour2 = bloom;
  const pour3 = totalWater - bloom - pour2;
  const bloomSec = bloomDurationBySweetness[taste.sweetness];
  const pour3Sec = bloomSec + GAP_AFTER_SECOND_POUR_SEC;

  const pours: readonly Pour[] = [
    {
      index: 0,
      atSec: s(0),
      pourAmount: g(bloom),
      cumulativeWater: g(bloom),
      label: "bloom",
    },
    {
      index: 1,
      atSec: s(bloomSec),
      pourAmount: g(pour2),
      cumulativeWater: g(bloom + pour2),
    },
    {
      index: 2,
      atSec: s(pour3Sec),
      pourAmount: g(pour3),
      cumulativeWater: g(totalWater),
    },
  ];

  return {
    method: "fuglen_tokyo",
    dripper: "kalita_102",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(pour3Sec + DRAWDOWN_SEC),
    grindHint: grindByStrength[taste.strength],
    notes: [
      "2차 푸어는 회전, 3차는 센터로 빠르게 전량 투입.",
      "맛 조정은 분쇄도(strength)와 뜸 지속(sweetness)으로.",
    ],
  };
};

export const fuglenTokyo: BrewMethod = {
  id: "fuglen_tokyo",
  name: "Fuglen Tokyo",
  shortName: "Fuglen",
  description:
    "빠른 연속 푸어로 마무리하는 Kalita 102 방식. 클린하고 균형 잡힌 컵.",
  supportedDrippers: ["kalita_102"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
