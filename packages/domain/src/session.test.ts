import { describe, expect, it } from "vitest";
import type { Pour, Recipe } from "./types";
import { c, g, ratio, s } from "./units";
import {
  activeStepIdx,
  cuesBetween,
  elapsedSec,
  isComplete,
  leadInCountdown,
  LEAD_IN_SEC,
  nextStepIdx,
  sessionDurationSec,
  type BrewSession,
} from "./session";

const mkPour = (
  i: number,
  atSec: number,
  amt: number,
  cum: number,
  bloom = false,
): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
  ...(bloom ? { label: "bloom" as const } : {}),
});

const recipe: Recipe = {
  method: "hoffmann_v60",
  dripper: "v60",
  coffee: g(15),
  totalWater: g(250),
  ratio: ratio(16.67),
  temperature: c(93),
  pours: [
    mkPour(0, 0, 30, 30, true),
    mkPour(1, 45, 120, 150),
    mkPour(2, 75, 100, 250),
  ],
  totalTimeSec: s(210),
  grindHint: "medium-fine",
  notes: [],
};

const session: BrewSession = { recipe, startedAt: 1_000_000 };

describe("elapsedSec", () => {
  it("clamps to 0 when now < startedAt", () => {
    expect(elapsedSec(session, 999_000)).toBe(0);
  });

  it("floors to integer seconds", () => {
    expect(elapsedSec(session, 1_000_500)).toBe(0);
    expect(elapsedSec(session, 1_001_999)).toBe(1);
    expect(elapsedSec(session, 1_045_000)).toBe(45);
  });
});

describe("activeStepIdx", () => {
  it("returns 0 at elapsed=0 (first pour active)", () => {
    expect(activeStepIdx(recipe.pours, 0)).toBe(0);
  });

  it("returns 0 while elapsed < next pour atSec", () => {
    expect(activeStepIdx(recipe.pours, 44)).toBe(0);
  });

  it("advances to 1 when elapsed reaches 2nd pour atSec", () => {
    expect(activeStepIdx(recipe.pours, 45)).toBe(1);
    expect(activeStepIdx(recipe.pours, 74)).toBe(1);
  });

  it("advances to last pour", () => {
    expect(activeStepIdx(recipe.pours, 75)).toBe(2);
    expect(activeStepIdx(recipe.pours, 9999)).toBe(2);
  });

  it("handles negative elapsed as 0", () => {
    expect(activeStepIdx(recipe.pours, -5)).toBe(0);
  });
});

describe("nextStepIdx", () => {
  it("returns next pour index when one exists", () => {
    expect(nextStepIdx(recipe.pours, 0)).toBe(1);
    expect(nextStepIdx(recipe.pours, 45)).toBe(2);
  });

  it("returns null when no next pour", () => {
    expect(nextStepIdx(recipe.pours, 75)).toBeNull();
    expect(nextStepIdx(recipe.pours, 999)).toBeNull();
  });
});

describe("sessionDurationSec", () => {
  it("returns elapsed seconds between startedAt and completedAt", () => {
    const completed: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 1_180_000,
    };
    expect(sessionDurationSec(completed)).toBe(180);
  });

  it("floors to integer seconds", () => {
    const completed: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 1_180_750,
    };
    expect(sessionDurationSec(completed)).toBe(180);
  });

  it("falls back to recipe.totalTimeSec when completedAt missing", () => {
    expect(sessionDurationSec(session)).toBe(210);
  });

  it("clamps negative to 0", () => {
    const weird: BrewSession = {
      recipe,
      startedAt: 1_000_000,
      completedAt: 999_000,
    };
    expect(sessionDurationSec(weird)).toBe(0);
  });
});

describe("isComplete", () => {
  it("is false while elapsed < totalTimeSec", () => {
    expect(isComplete(session, 1_209_000)).toBe(false); // 209s elapsed
  });

  it("is true at totalTimeSec boundary", () => {
    expect(isComplete(session, 1_210_000)).toBe(true); // 210s elapsed
  });

  it("is true past totalTimeSec", () => {
    expect(isComplete(session, 2_000_000)).toBe(true);
  });
});

// 파일 끝에 추가. recipe/mkPour/s 는 파일 상단에 이미 정의돼 있어 재사용.
// pours: [bloom@0, @45, @75], totalTimeSec 210
describe("cuesBetween", () => {
  const pours = recipe.pours;
  const T = recipe.totalTimeSec;

  it("블룸(atSec=0)에는 어떤 큐도 없다", () => {
    expect(cuesBetween(-1, 0, pours, T, 5)).toEqual([]);
  });

  it("푸어 5초 전 구간에서 lead-in 큐를 낸다 (45 - 5 = 40)", () => {
    expect(cuesBetween(39, 40, pours, T, 5)).toEqual([
      { kind: "lead-in", stepIdx: 1 },
    ]);
  });

  it("푸어 경계(atSec)에서 pour 큐를 낸다", () => {
    expect(cuesBetween(44, 45, pours, T, 5)).toEqual([
      { kind: "pour", stepIdx: 1 },
    ]);
  });

  it("totalTimeSec 경계에서 complete 큐를 낸다", () => {
    expect(cuesBetween(209, 210, pours, T, 5)).toEqual([{ kind: "complete" }]);
  });

  it("한 구간에 여러 큐가 걸리면 시간순으로 모두 반환", () => {
    // 38..46 구간엔 lead-in@40, pour@45 둘 다
    expect(cuesBetween(38, 46, pours, T, 5)).toEqual([
      { kind: "lead-in", stepIdx: 1 },
      { kind: "pour", stepIdx: 1 },
    ]);
  });

  it("반열림 구간 (prev, cur] — prev 시각의 큐는 제외, cur 시각의 큐는 포함", () => {
    expect(cuesBetween(40, 45, pours, T, 5)).toEqual([
      { kind: "pour", stepIdx: 1 },
    ]); // lead-in@40 은 prev라 제외
  });

  it("lead-in 시각이 직전 푸어 경계보다 앞서면(간격<5초) lead-in 생략, pour는 유지", () => {
    const tight = [
      mkPour(0, 0, 30, 30, true),
      mkPour(1, 45, 120, 150),
      mkPour(2, 48, 100, 250), // 45와 3초 간격 → lead-in@43 은 45(직전경계)보다 앞 → 생략
    ];
    expect(cuesBetween(45, 48, tight, s(210), 5)).toEqual([
      { kind: "pour", stepIdx: 2 },
    ]); // 윈도 (45,48]: lead-in@43 억제됨, pour@45는 prev 경계라 제외, pour@48만
  });

  it("전 구간 1초 스위프: 큐 누락·중복 없이 lead-in/pour/complete 정확히 한 번씩", () => {
    const kinds: string[] = [];
    for (let t = 1; t <= 210; t++) {
      for (const c of cuesBetween(t - 1, t, pours, T, 5)) {
        kinds.push(c.kind === "complete" ? "complete" : `${c.kind}:${c.stepIdx}`);
      }
    }
    expect(kinds).toEqual([
      "lead-in:1", "pour:1", // @40, @45
      "lead-in:2", "pour:2", // @70, @75
      "complete", // @210
    ]);
  });

  it("구간 분할 무결성: 어떤 분할이든 이어붙이면 통짜 (0, T] 호출과 동일", () => {
    // 250ms 틱이 정수 초 elapsed 를 만들지만, 함수는 임의 분할에 견고해야 한다.
    const whole = cuesBetween(0, 210, pours, T, 5);
    // 1초 분할
    const byOne: typeof whole = [];
    for (let t = 1; t <= 210; t++) byOne.push(...cuesBetween(t - 1, t, pours, T, 5));
    expect(byOne).toEqual(whole);
    // 불규칙 분할 (7,13,1,…)
    const cuts = [0, 7, 20, 41, 42, 70, 71, 130, 209, 210];
    const byCut: typeof whole = [];
    for (let i = 1; i < cuts.length; i++) {
      byCut.push(...cuesBetween(cuts[i - 1]!, cuts[i]!, pours, T, 5));
    }
    expect(byCut).toEqual(whole);
  });
});

describe("leadInCountdown", () => {
  const pours = recipe.pours;
  it("lead-in 창 밖이면 null", () => {
    expect(leadInCountdown(0, pours, 5)).toBeNull(); // 다음 푸어 45, 45초 남음
    expect(leadInCountdown(45, pours, 5)).toBeNull(); // 막 부음, 다음 75 → 30초
  });
  it("lead-in 창 안이면 남은 정수 초(1..leadIn)", () => {
    expect(leadInCountdown(40, pours, 5)).toBe(5);
    expect(leadInCountdown(43, pours, 5)).toBe(2);
    expect(leadInCountdown(44, pours, 5)).toBe(1);
  });
  it("LEAD_IN_SEC 은 5", () => {
    expect(LEAD_IN_SEC).toBe(5);
  });
});
