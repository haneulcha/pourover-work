import { c, g, ratio, s } from "../units";
import type {
  BrewMethod,
  Pour,
  Recipe,
  RecipeInput,
  RoastLevel,
  StrengthProfile,
  SweetnessProfile,
} from "../types";

const METHOD_RATIO = 15;
const BLOOM_RATIO_TO_COFFEE = 2;
const POUR_INTERVAL_SEC = 30;
const DRAWDOWN_SEC = 60;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 96,
  medium: 93,
  dark: 90,
};

const bloomDurationBySweetness: Record<SweetnessProfile, number> = {
  sweet: 40,
  balanced: 30,
  bright: 25,
};

// Last pour weight (baseline 100 = research reference)
const lastWeightByStrength: Record<StrengthProfile, number> = {
  light: 100,
  medium: 110,
  strong: 120,
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(coffee * BLOOM_RATIO_TO_COFFEE);
  const rest = totalWater - bloom;

  // weights for [pour 1, pour 2, pour 3]; first two fixed at 80, last varies
  const w1 = 80;
  const w2 = 80;
  const w3 = lastWeightByStrength[taste.strength];
  const wSum = w1 + w2 + w3;
  const pour1 = Math.round((rest * w1) / wSum);
  const pour2 = Math.round((rest * w2) / wSum);
  const pour3 = rest - pour1 - pour2;
  const bloomSec = bloomDurationBySweetness[taste.sweetness];

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
      pourAmount: g(pour1),
      cumulativeWater: g(bloom + pour1),
    },
    {
      index: 2,
      atSec: s(bloomSec + POUR_INTERVAL_SEC),
      pourAmount: g(pour2),
      cumulativeWater: g(bloom + pour1 + pour2),
    },
    {
      index: 3,
      atSec: s(bloomSec + POUR_INTERVAL_SEC * 2),
      pourAmount: g(pour3),
      cumulativeWater: g(totalWater),
    },
  ];

  return {
    method: "standard_3_stage",
    dripper: "kalita_102",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(bloomSec + POUR_INTERVAL_SEC * 2 + DRAWDOWN_SEC),
    grindHint: "medium",
    notes: [
      "일본 정통 사다리꼴 3단 분할. 수위를 끊지 않고 일정하게 유지.",
      "맛 조정은 마지막 푸어 비중(strength)과 뜸 시간(sweetness)으로.",
    ],
  };
};

export const standard3Stage: BrewMethod = {
  id: "standard_3_stage",
  name: "Standard 3-Stage",
  shortName: "3-Stage",
  description:
    "Kalita 102의 정통 3단 분할 추출. 바디감과 밸런스를 동시에 확보.",
  supportedDrippers: ["kalita_102"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
