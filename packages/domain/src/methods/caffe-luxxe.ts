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

const METHOD_RATIO = 13.3;
const BLOOM_FRACTION = 0.25;
const DRAWDOWN_SEC = 120;

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

const grindByStrength: Record<StrengthProfile, GrindHint> = {
  light: "medium-coarse",
  medium: "medium",
  strong: "medium-fine",
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(totalWater * BLOOM_FRACTION);
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
    method: "caffe_luxxe",
    dripper: "kalita_102",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(bloomSec + DRAWDOWN_SEC),
    grindHint: grindByStrength[taste.strength],
    notes: [
      "지그재그로 넓게 뜸, 이후 안팎 회전으로 연속 푸어.",
      "맛 조정은 분쇄도(strength)와 뜸 지속(sweetness)으로.",
    ],
  };
};

export const caffeLuxxe: BrewMethod = {
  id: "caffe_luxxe",
  name: "Caffe Luxxe",
  shortName: "Luxxe",
  description:
    "고농도 추출을 노리는 Kalita 102 연속 푸어. 1:13.3 저비율로 바디감 극대화.",
  supportedDrippers: ["kalita_102"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
