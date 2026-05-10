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

const METHOD_RATIO = 15.4;
const POUR_COUNT = 4;
const DRAWDOWN_SEC = 60;

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 92,
  medium: 91,
  dark: 90,
};

const intervalBySweetness: Record<SweetnessProfile, number> = {
  sweet: 35,
  balanced: 30,
  bright: 25,
};

const grindByStrength: Record<StrengthProfile, GrindHint> = {
  light: "coarse",
  medium: "medium-coarse",
  strong: "medium",
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const perPour = Math.round(totalWater / POUR_COUNT);
  const interval = intervalBySweetness[taste.sweetness];

  const amounts = Array.from({ length: POUR_COUNT }, () => perPour);
  const sum = amounts.reduce((a, b) => a + b, 0);
  const lastIdx = amounts.length - 1;
  amounts[lastIdx] = amounts[lastIdx]! + (totalWater - sum);

  let cumulative = 0;
  const pours: readonly Pour[] = amounts.map((amt, i) => {
    cumulative += amt;
    return {
      index: i,
      atSec: s(i * interval),
      pourAmount: g(amt),
      cumulativeWater: g(cumulative),
    };
  });

  return {
    method: "april",
    dripper: "kalita_wave",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s((POUR_COUNT - 1) * interval + DRAWDOWN_SEC),
    grindHint: grindByStrength[taste.strength],
    notes: [
      "첫 푸어는 서클로 전면 적시기, 나머지는 센터 푸어로 난류 생성.",
      "맛 조정은 분쇄도(strength)와 푸어 간격(sweetness)으로.",
    ],
  };
};

export const april: BrewMethod = {
  id: "april",
  name: "April",
  shortName: "April",
  description:
    "Kalita Wave에 서클+센터 푸어를 결합한 4분할 추출. 유속과 클린 컵을 살림.",
  supportedDrippers: ["kalita_wave"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
