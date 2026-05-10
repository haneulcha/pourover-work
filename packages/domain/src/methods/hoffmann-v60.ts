import { c, g, ratio, s } from "../units";
import type {
  BrewMethod,
  GrindHint,
  Pour,
  Recipe,
  RecipeInput,
  RoastLevel,
  TasteProfile,
} from "../types";

const METHOD_RATIO = 16.67;
const BLOOM_RATIO_TO_COFFEE = 2;
const BLOOM_END_SEC = 45;
const POUR_3_SEC = 75;
const TOTAL_TIME_SEC = 210; // 3:30 target drawdown

const temperatureByRoast: Record<RoastLevel, number> = {
  light: 96,
  medium: 93,
  dark: 90,
};

const GRIND_SCALE: readonly GrindHint[] = [
  "fine",
  "medium-fine",
  "medium",
  "medium-coarse",
  "coarse",
];
const BASE_GRIND_IDX = 1; // medium-fine

// design.md의 grind 규칙은 두 축이 같은 방향으로 겹칠 때 처리가 모호.
// boolean OR로 해석: 각 방향 최대 1단계, 반대 방향 동시 지정 시 상쇄.
// 대안은 가산(sweet+strong = 2단계). Hoffmann 원전에서도 조합 케이스가
// 명시되지 않아 리서치 필요 — 사용자 피드백으로 재검토.
const grindFor = (taste: TasteProfile): GrindHint => {
  const wantFiner = taste.sweetness === "sweet" || taste.strength === "strong";
  const wantCoarser =
    taste.sweetness === "bright" || taste.strength === "light";
  const shift = (wantFiner ? -1 : 0) + (wantCoarser ? 1 : 0);
  const idx = Math.max(
    0,
    Math.min(GRIND_SCALE.length - 1, BASE_GRIND_IDX + shift),
  );
  return GRIND_SCALE[idx]!;
};

const compute = (input: RecipeInput): Recipe => {
  const { coffee, roast, taste } = input;
  const totalWater = Math.round(coffee * METHOD_RATIO);
  const bloom = Math.round(coffee * BLOOM_RATIO_TO_COFFEE);
  const target60 = Math.round(totalWater * 0.6);
  const pour2Amt = target60 - bloom;
  const pour3Amt = totalWater - target60;

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
      atSec: s(BLOOM_END_SEC),
      pourAmount: g(pour2Amt),
      cumulativeWater: g(target60),
    },
    {
      index: 2,
      atSec: s(POUR_3_SEC),
      pourAmount: g(pour3Amt),
      cumulativeWater: g(totalWater),
    },
  ];

  return {
    method: "hoffmann_v60",
    dripper: "v60",
    coffee,
    totalWater: g(totalWater),
    ratio: ratio(METHOD_RATIO),
    temperature: c(temperatureByRoast[roast]),
    pours,
    totalTimeSec: s(TOTAL_TIME_SEC),
    grindHint: grindFor(taste),
    notes: [
      "블룸 직후 스월. 본 푸어 종료 후 한 번 더 스월.",
      "이 메서드는 맛 조정을 분쇄도로 함. 비율/시간은 고정.",
    ],
  };
};

export const hoffmannV60: BrewMethod = {
  id: "hoffmann_v60",
  name: "Hoffmann V60",
  shortName: "Hoffmann",
  description:
    "한 레시피로 모든 맛을 대응하는 V60 메서드. 비율·시간은 고정이고 맛 조정은 분쇄도로.",
  supportedDrippers: ["v60"],
  defaultRatio: ratio(METHOD_RATIO),
  compute,
};
