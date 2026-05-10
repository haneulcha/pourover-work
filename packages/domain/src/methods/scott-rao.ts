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

const METHOD_RATIO = 16.5;
const BLOOM_RATIO_TO_COFFEE = 2.5;
const DRAWDOWN_SEC = 90;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 97,
  medium: 94,
  dark: 91,
};

const bloomDurationBySweetness: Record<SweetnessProfile, number> = {
  sweet: 45,
  balanced: 30,
  bright: 20,
};

const grindByStrength: Record<StrengthProfile, GrindHint> = {
  light: "medium",
  medium: "medium-fine",
  strong: "fine",
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(coffee * BLOOM_RATIO_TO_COFFEE);
  const mainPour = totalWater - bloom;
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
      pourAmount: g(mainPour),
      cumulativeWater: g(totalWater),
    },
  ];

  return {
    method: "scott_rao",
    dripper: "v60",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(bloomSec + DRAWDOWN_SEC),
    grindHint: grindByStrength[taste.strength],
    notes: [
      "뜸 직후 Bird's Nest 구멍 만들기 + 강한 스월.",
      "메인은 끊지 말고 단일 연속 푸어. 맛 조정은 분쇄도(strength)와 뜸 시간(sweetness)으로.",
    ],
  };
};

export const scottRao: BrewMethod = {
  id: "scott_rao",
  name: "Scott Rao",
  shortName: "Scott Rao",
  description:
    "뜸 후 단일 연속 푸어로 추출 효율을 극대화하는 V60 스탠다드. 분쇄도와 뜸 시간으로 맛 조정.",
  supportedDrippers: ["v60"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
