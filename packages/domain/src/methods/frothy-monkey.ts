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

const METHOD_RATIO = 16;
const BLOOM_RATIO_TO_COFFEE = 2;
const HALFWAY_FRACTION = 0.5;
const PULSE_INTERVAL_SEC = 15;
const DRAWDOWN_SEC = 30;

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

const pulseCountByStrength: Record<StrengthProfile, number> = {
  light: 3,
  medium: 4,
  strong: 5,
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(coffee * BLOOM_RATIO_TO_COFFEE);
  const halfway = Math.round(totalWater * HALFWAY_FRACTION);
  const main = halfway - bloom;
  const pulseCount = pulseCountByStrength[taste.strength];
  const remaining = totalWater - halfway;
  const pulseAmt = Math.round(remaining / pulseCount);
  const bloomSec = bloomDurationBySweetness[taste.sweetness];
  const mainSec = bloomSec + PULSE_INTERVAL_SEC;

  const pulses = Array.from({ length: pulseCount }, () => pulseAmt);
  const pulseSum = pulses.reduce((a, b) => a + b, 0);
  const lastIdx = pulses.length - 1;
  pulses[lastIdx] = pulses[lastIdx]! + (remaining - pulseSum);

  const amounts = [bloom, main, ...pulses];

  let cumulative = 0;
  const pours: readonly Pour[] = amounts.map((amt, i) => {
    cumulative += amt;
    const atSec =
      i === 0
        ? 0
        : i === 1
          ? mainSec
          : mainSec + (i - 1) * PULSE_INTERVAL_SEC;
    const base = {
      index: i,
      atSec: s(atSec),
      pourAmount: g(amt),
      cumulativeWater: g(cumulative),
    };
    return i === 0 ? { ...base, label: "bloom" as const } : base;
  });

  const lastAtSec = pours[pours.length - 1]!.atSec;

  return {
    method: "frothy_monkey",
    dripper: "kalita_wave",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(lastAtSec + DRAWDOWN_SEC),
    grindHint: "medium-fine",
    notes: [
      "뜸 후 한 번 큰 푸어로 절반까지 채우고, 이후 짧은 펄스를 반복.",
      "맛 조정은 펄스 수(strength)와 뜸 시간(sweetness)으로.",
    ],
  };
};

export const frothyMonkey: BrewMethod = {
  id: "frothy_monkey",
  name: "Frothy Monkey",
  shortName: "Frothy",
  description:
    "바디감을 강조하는 펄스 푸어 방식. 절반까지 한 번에 채우고 짧은 펄스로 마무리.",
  supportedDrippers: ["kalita_wave"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
