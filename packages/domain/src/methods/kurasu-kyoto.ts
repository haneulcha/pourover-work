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

const METHOD_RATIO = 14.3;
const POUR_INTERVAL_SEC = 30;
const DRAWDOWN_SEC = 60;

// Reference fractions: 30/30/140 out of 200
const POUR_1_FRAC = 30 / 200;
const POUR_2_FRAC = 30 / 200;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 92,
  medium: 90,
  dark: 88,
};

const bloomDurationBySweetness: Record<SweetnessProfile, number> = {
  sweet: 50,
  balanced: 40,
  bright: 30,
};

const grindByStrength: Record<StrengthProfile, GrindHint> = {
  light: "coarse",
  medium: "coarse",
  strong: "medium-coarse",
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const pour1 = Math.round(totalWater * POUR_1_FRAC);
  const pour2 = Math.round(totalWater * POUR_2_FRAC);
  const pour3 = totalWater - pour1 - pour2;
  const bloomSec = bloomDurationBySweetness[taste.sweetness];

  const pours: readonly Pour[] = [
    {
      index: 0,
      atSec: s(0),
      pourAmount: g(pour1),
      cumulativeWater: g(pour1),
      label: "bloom",
    },
    {
      index: 1,
      atSec: s(bloomSec),
      pourAmount: g(pour2),
      cumulativeWater: g(pour1 + pour2),
    },
    {
      index: 2,
      atSec: s(bloomSec + POUR_INTERVAL_SEC),
      pourAmount: g(pour3),
      cumulativeWater: g(totalWater),
    },
  ];

  return {
    method: "kurasu_kyoto",
    dripper: "kalita_wave",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(bloomSec + POUR_INTERVAL_SEC + DRAWDOWN_SEC),
    grindHint: grindByStrength[taste.strength],
    notes: [
      "2차 푸어는 강하게, 3차는 가는 물줄기로 센터만.",
      "맛 조정은 분쇄도(strength)와 뜸 시간(sweetness)으로.",
    ],
  };
};

export const kurasuKyoto: BrewMethod = {
  id: "kurasu_kyoto",
  name: "Kurasu Kyoto",
  shortName: "Kurasu",
  description:
    "클린 컵과 단맛을 강조하는 Kalita Wave 3분할 추출. 두 번째 푸어가 핵심.",
  supportedDrippers: ["kalita_wave"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
