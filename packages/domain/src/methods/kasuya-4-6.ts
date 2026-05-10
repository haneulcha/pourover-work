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
const POUR_INTERVAL_SEC = 45;
const DRAWDOWN_SEC = 30;
const FIRST_40_FRACTION = 0.4;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 94,
  medium: 88,
  dark: 83,
};

// fraction of first 40% assigned to [pour 1, pour 2]
const sweetnessSplit: Record<SweetnessProfile, readonly [number, number]> = {
  sweet: [7 / 12, 5 / 12],
  balanced: [6 / 12, 6 / 12],
  bright: [5 / 12, 7 / 12],
};

// number of pours in the last 60%
const strengthPourCount: Record<StrengthProfile, number> = {
  light: 1,
  medium: 2,
  strong: 3,
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = coffee * METHOD_RATIO;
  const first40 = totalWater * FIRST_40_FRACTION;
  const last60 = totalWater - first40;

  const [frac1, frac2] = sweetnessSplit[taste.sweetness];
  const pourCount = strengthPourCount[taste.strength];
  const perPour = last60 / pourCount;

  const amounts: number[] = [
    Math.round(first40 * frac1),
    Math.round(first40 * frac2),
    ...Array.from({ length: pourCount }, () => Math.round(perPour)),
  ];

  // absorb rounding drift into the final pour so sum === totalWater exactly
  const sum = amounts.reduce((a, b) => a + b, 0);
  const lastIdx = amounts.length - 1;
  amounts[lastIdx] = amounts[lastIdx]! + (totalWater - sum);

  let cumulative = 0;
  const pours: readonly Pour[] = amounts.map((amt, i) => {
    cumulative += amt;
    return {
      index: i,
      atSec: s(i * POUR_INTERVAL_SEC),
      pourAmount: g(amt),
      cumulativeWater: g(cumulative),
    };
  });

  return {
    method: "kasuya_4_6",
    dripper: "v60",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(lastIdx * POUR_INTERVAL_SEC + DRAWDOWN_SEC),
    grindHint: "coarse",
    notes: [
      "주전자를 천천히, 중심부터 나선형으로.",
      "총 추출 시간 3:30 ± 15초를 목표로. 더 오래 걸리면 분쇄도를 약간 굵게.",
    ],
  };
};

export const kasuya46: BrewMethod = {
  id: "kasuya_4_6",
  name: "Kasuya 4:6",
  shortName: "4:6",
  description:
    "맛 프로파일로 파라미터 매핑이 가장 풍부한 V60 메서드. 첫 40%는 단맛, 나머지 60%는 농도를 결정.",
  supportedDrippers: ["v60"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
