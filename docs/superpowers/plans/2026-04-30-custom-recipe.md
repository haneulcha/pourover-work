# Custom Recipe Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1 화면 + 도메인 검증으로 커스텀 핸드드립 레시피 빌더를 구현. 저장/공유는 v2.

**Architecture:** `BrewMethodId`에 `"custom"` 추가, plugin 계약 밖에 별도 `buildCustomRecipe` 함수로 검증 + Recipe 조립. `src/features/custom/`에 hybrid 레이아웃(가로 timeline 미리보기 + 세로 테이블 입력) 컴포넌트 구성. `state.screen = "custom"` 화면 추가 + `state.customRecipe` 슬롯으로 결과 보관. 기존 `brewMethods[id]` 룩업 사이트는 `getMethodName` 헬퍼로 안전화.

**Tech Stack:** TypeScript (strict, noUncheckedIndexedAccess), React 19, Tailwind 3 + CSS variable token system, Vitest + jsdom + RTL, Bun.

**Spec:** `docs/superpowers/specs/2026-04-30-custom-recipe-design.md`

---

## File Structure

**도메인 (React 의존성 0)**
- Modify: `src/domain/types.ts` — `BrewMethodId`에 `"custom"` 추가
- Modify: `src/domain/methods/index.ts` — `Record` 키를 `Exclude<BrewMethodId, "custom">`로 좁히고 `getMethodName` export
- Modify: `src/domain/methods/index.test.ts` — `getMethodName` 테스트 추가
- Create: `src/domain/methods/custom.ts` — `CustomPourInput`, `CustomRecipeInput`, `ValidationError`, `BuildResult`, `buildCustomRecipe`
- Create: `src/domain/methods/custom.test.ts` — happy snapshot + invariants + prefill round-trip

**App state**
- Modify: `src/features/app/state.ts` — `Screen`에 `"custom"`, `AppState.customRecipe?: Recipe`, `mergeState`가 `"custom"`을 dripper-compat 검사에서 우회

**Custom 화면 (`src/features/custom/`)**
- Create: `customFormState.ts` — `CustomFormState` 타입, `fromRecipe`, `toCustomInput`, `reducer`, `initialBlankState`
- Create: `customFormState.test.ts`
- Create: `CustomBasicsForm.tsx` — dripper/coffee/water/temp/grind/total time
- Create: `CustomStatsPanel.tsx` — stats 그리드 + 에러 배너 + lockLastPour 토글
- Create: `PourEditTable.tsx` — 세로 행 입력
- Create: `PourTimelinePreview.tsx` — 가로 마커 (드래그 + 5초 snap)
- Create: `CustomRecipeScreen.tsx` — 컴포지션 + 푸터 액션

**App integration**
- Modify: `src/features/app/AppRoot.tsx` — `screen === "custom"` 분기, `state.method === "custom"`일 때 compute 스킵, prefill/save 핸들러
- Modify: `src/features/recipe/RecipeScreen.tsx` — `Customize this recipe` 버튼, `method === "custom"`일 때 `state.customRecipe` 직접 렌더

> 추가로 Task 2에서 `CompleteScreen`/`seo/documentMeta`/`share-image/full`의 brewMethods 룩업을 `getMethodName`으로 마이그레이션.

---

## Task 1 — BrewMethodId에 "custom" 추가 + 등록 안 함

**Files:**
- Modify: `src/domain/types.ts:7-16`
- Modify: `src/domain/methods/index.ts:12-21`

- [ ] Step 1: `BrewMethodId` union에 `"custom"` 한 줄 추가.
- [ ] Step 2: `bun run typecheck` — `Record<BrewMethodId, BrewMethod>`에서 `Property 'custom' is missing` 에러 확인.
- [ ] Step 3: `brewMethods` 타입을 `Record<Exclude<BrewMethodId, "custom">, BrewMethod>`로 좁힘. `methodList`/`methodsForDripper`는 그대로 (registry는 9개만).
- [ ] Step 4: `bun run typecheck` — 호출 사이트들(`AppRoot`/`RecipeScreen`/`CompleteScreen`/`share-image/full`/`seo/documentMeta`/`seo/documentMeta.test`)에서 일부 타입 에러 발생할 수 있음. **이 시점에 commit 하지 말고 Task 2까지 묶어 진행** — typecheck 깨진 채 커밋 금지.

---

## Task 2 — getMethodName 헬퍼 + 호출 사이트 마이그레이션

**Files:**
- Modify: `src/domain/methods/index.ts`, `src/domain/methods/index.test.ts`
- Modify: `src/features/complete/CompleteScreen.tsx:30`
- Modify: `src/features/share-image/variants/full.tsx:25`
- Modify: `src/features/seo/documentMeta.ts:56`, `src/features/seo/documentMeta.test.ts:78`

- [ ] Step 1: `index.test.ts`에 `getMethodName` 테스트 추가. 두 케이스: 등록된 id → registry name 동일, `"custom"` → `"Custom"`.

```ts
import { brewMethods, getMethodName } from "./index";

describe("getMethodName", () => {
  it("registry에 있는 메서드 이름을 반환한다", () => {
    expect(getMethodName("kasuya_4_6")).toBe(brewMethods.kasuya_4_6.name);
  });
  it('"custom"은 "Custom"을 반환한다', () => {
    expect(getMethodName("custom")).toBe("Custom");
  });
});
```

- [ ] Step 2: `bun run test:run src/domain/methods/index.test.ts` — FAIL (export 없음).
- [ ] Step 3: `index.ts` 끝에 헬퍼 추가:

```ts
export const getMethodName = (id: BrewMethodId): string =>
  id === "custom" ? "Custom" : brewMethods[id].name;
```

- [ ] Step 4: `bun run test:run src/domain/methods/index.test.ts` — PASS.
- [ ] Step 5: `CompleteScreen.tsx:30`의 `brewMethods[recipe.method].name` → `getMethodName(recipe.method)`. import 정리.
- [ ] Step 6: `share-image/variants/full.tsx:25` 동일 마이그레이션.
- [ ] Step 7: `seo/documentMeta.ts:56` 동일 마이그레이션.
- [ ] Step 8: `seo/documentMeta.test.ts:78` 동일 마이그레이션 (`brewMethods[id as ...].name` → `getMethodName(id as ...)`).
- [ ] Step 9: `bun run typecheck && bun run test:run`. AppRoot/RecipeScreen이 아직 깨지면 그건 Task 6/13에서 처리 — 이 시점 깨진 사이트가 있다면 커밋 미루고 그 사이트도 함께 가드(Task 6 Step 3 패턴 참고). **typecheck 깨진 채 커밋 금지.**
- [ ] Step 10: 커밋. 메시지: `feat(domain): add "custom" BrewMethodId and getMethodName helper`. (Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>)

---

## Task 3 — buildCustomRecipe (happy path 스냅샷)

**Files:**
- Create: `src/domain/methods/custom.ts`
- Create: `src/domain/methods/custom.test.ts`

- [ ] Step 1: 테스트 작성 (`custom.test.ts`).

```ts
import { describe, it, expect } from "vitest";
import { c, g, s } from "../units";
import { buildCustomRecipe, type CustomRecipeInput } from "./custom";

const baseInput: CustomRecipeInput = {
  dripper: "v60",
  coffee: g(15),
  totalWater: g(225),
  temperature: c(92),
  grindHint: "medium",
  totalTimeSec: s(170),
  pours: [
    { atSec: s(0), pourAmount: g(30), label: "bloom" },
    { atSec: s(45), pourAmount: g(50) },
    { atSec: s(90), pourAmount: g(60) },
    { atSec: s(140), pourAmount: g(50) },
    { atSec: s(170), pourAmount: g(35) },
  ],
};

describe("buildCustomRecipe", () => {
  it("권장 케이스 스냅샷", () => {
    const r = buildCustomRecipe(baseInput);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe).toMatchSnapshot();
  });
  it("ratio = totalWater/coffee", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.ratio).toBe(15);
  });
  it("cumulativeWater 누적", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.pours.map((p) => p.cumulativeWater)).toEqual([30, 80, 140, 190, 225]);
  });
  it("index = 0..n-1", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.pours.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
  });
  it("method='custom', notes=[]", () => {
    const r = buildCustomRecipe(baseInput);
    if (!r.ok) throw new Error("expected ok");
    expect(r.recipe.method).toBe("custom");
    expect(r.recipe.notes).toEqual([]);
  });
});
```

- [ ] Step 2: `bun run test:run src/domain/methods/custom.test.ts` — FAIL (모듈 없음).
- [ ] Step 3: `custom.ts` 구현.

```ts
import { ratio as makeRatio } from "../units";
import type {
  Celsius, DripperId, Grams, GrindHint, Pour, Recipe, Seconds,
} from "../types";

export type CustomPourInput = {
  readonly atSec: Seconds;
  readonly pourAmount: Grams;
  readonly label?: "bloom";
};

export type CustomRecipeInput = {
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly temperature: Celsius;
  readonly grindHint: GrindHint;
  readonly totalTimeSec: Seconds;
  readonly pours: readonly CustomPourInput[];
};

export type ValidationError =
  | { readonly kind: "coffee-non-positive" }
  | { readonly kind: "water-non-positive" }
  | { readonly kind: "time-non-positive" }
  | { readonly kind: "no-pours" }
  | { readonly kind: "first-pour-not-zero" }
  | { readonly kind: "non-monotonic-time"; readonly pourIndex: number }
  | { readonly kind: "pour-after-total-time"; readonly pourIndex: number }
  | { readonly kind: "non-positive-pour"; readonly pourIndex: number }
  | { readonly kind: "sum-mismatch"; readonly sum: number; readonly totalWater: number }
  | { readonly kind: "bloom-not-on-first"; readonly pourIndex: number };

export type BuildResult =
  | { readonly ok: true; readonly recipe: Recipe }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

export const buildCustomRecipe = (input: CustomRecipeInput): BuildResult => {
  const errors: ValidationError[] = [];
  if ((input.coffee as number) <= 0) errors.push({ kind: "coffee-non-positive" });
  if ((input.totalWater as number) <= 0) errors.push({ kind: "water-non-positive" });
  if ((input.totalTimeSec as number) <= 0) errors.push({ kind: "time-non-positive" });
  if (input.pours.length === 0) errors.push({ kind: "no-pours" });

  if (input.pours.length > 0) {
    if ((input.pours[0]!.atSec as number) !== 0) errors.push({ kind: "first-pour-not-zero" });
    input.pours.forEach((p, i) => {
      if ((p.pourAmount as number) <= 0) errors.push({ kind: "non-positive-pour", pourIndex: i });
      if ((p.atSec as number) > (input.totalTimeSec as number))
        errors.push({ kind: "pour-after-total-time", pourIndex: i });
      if (i > 0 && (p.atSec as number) <= (input.pours[i - 1]!.atSec as number))
        errors.push({ kind: "non-monotonic-time", pourIndex: i });
      if (p.label === "bloom" && i !== 0)
        errors.push({ kind: "bloom-not-on-first", pourIndex: i });
    });
    const sum = input.pours.reduce((acc, p) => acc + (p.pourAmount as number), 0);
    if (Math.abs(sum - (input.totalWater as number)) > 0.01)
      errors.push({ kind: "sum-mismatch", sum, totalWater: input.totalWater as number });
  }

  if (errors.length > 0) return { ok: false, errors };

  let cumulative = 0;
  const pours: Pour[] = input.pours.map((p, index) => {
    cumulative += p.pourAmount as number;
    return {
      index,
      atSec: p.atSec,
      pourAmount: p.pourAmount,
      cumulativeWater: cumulative as Grams,
      ...(p.label ? { label: p.label } : {}),
    };
  });

  const recipe: Recipe = {
    method: "custom",
    dripper: input.dripper,
    coffee: input.coffee,
    totalWater: input.totalWater,
    ratio: makeRatio((input.totalWater as number) / (input.coffee as number)),
    temperature: input.temperature,
    pours,
    totalTimeSec: input.totalTimeSec,
    grindHint: input.grindHint,
    notes: [],
  };
  return { ok: true, recipe };
};
```

- [ ] Step 4: `bun run test:run src/domain/methods/custom.test.ts` — PASS, 스냅샷 생성.
- [ ] Step 5: 커밋. `feat(domain): add buildCustomRecipe for custom recipes`. 스냅샷 파일도 함께 add.

---

## Task 4 — invariant 위반 케이스 테스트

**Files:** Modify `src/domain/methods/custom.test.ts`.

- [ ] Step 1: `describe("buildCustomRecipe invariants", () => { ... })` 블록에 10개 테스트 추가 — 각 ValidationError kind에 1개씩 (`coffee-non-positive`, `water-non-positive`, `time-non-positive`, `no-pours`, `first-pour-not-zero`, `non-monotonic-time`, `pour-after-total-time`, `non-positive-pour`, `sum-mismatch`, `bloom-not-on-first`).

  각 테스트는 `baseInput`을 기반으로 한 필드만 위반시키고 `expect(r.errors).toContainEqual(...)` 또는 `expect(r.errors.some(...)).toBe(true)` 사용.

  예시 (sum-mismatch):
```ts
it("sum(pourAmount) ≠ totalWater → sum-mismatch", () => {
  const r = buildCustomRecipe({
    ...baseInput,
    pours: [
      { atSec: s(0), pourAmount: g(50), label: "bloom" },
      { atSec: s(60), pourAmount: g(50) },
    ],
  });
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.errors).toContainEqual({ kind: "sum-mismatch", sum: 100, totalWater: 225 });
});
```

  나머지 9개도 같은 패턴(스펙 § Domain Invariants 참고).

- [ ] Step 2: `bun run test:run src/domain/methods/custom.test.ts` — PASS.
- [ ] Step 3: 커밋. `test(custom): cover all buildCustomRecipe validation paths`.

---

## Task 5 — prefill 라운드트립 (9개 빌트인 메서드)

**Files:** Modify `src/domain/methods/custom.test.ts`.

- [ ] Step 1: 라운드트립 테스트 추가.

```ts
import { brewMethods } from "./index";
import type { Recipe, RecipeInput } from "../types";

describe("prefill round-trip from built-in methods", () => {
  Object.values(brewMethods).forEach((m) => {
    it(`${m.id} → buildCustomRecipe → 동일 (method/notes 제외)`, () => {
      const input: RecipeInput = {
        method: m.id,
        dripper: m.supportedDrippers[0]!,
        coffee: g(15),
        roast: "medium",
        taste: { sweetness: "balanced", strength: "medium" },
      };
      const original = m.compute(input);
      const r = buildCustomRecipe({
        dripper: original.dripper,
        coffee: original.coffee,
        totalWater: original.totalWater,
        temperature: original.temperature,
        grindHint: original.grindHint,
        totalTimeSec: original.totalTimeSec,
        pours: original.pours.map((p) => ({
          atSec: p.atSec,
          pourAmount: p.pourAmount,
          ...(p.label ? { label: p.label } : {}),
        })),
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const stripped = (rec: Recipe) => ({
        dripper: rec.dripper, coffee: rec.coffee, totalWater: rec.totalWater,
        ratio: rec.ratio, temperature: rec.temperature, totalTimeSec: rec.totalTimeSec,
        grindHint: rec.grindHint, pours: rec.pours.map((p) => ({ ...p })),
      });
      expect(stripped(r.recipe)).toEqual(stripped(original));
    });
  });
});
```

- [ ] Step 2: `bun run test:run src/domain/methods/custom.test.ts` — 9개 PASS. 실패하면 sum 부동소수점 오차 또는 invariant 충돌. epsilon이 이미 0.01로 들어있으니 대부분 통과해야 함. 실패 메서드는 그 메서드 compute의 실제 출력 점검.
- [ ] Step 3: 커밋. `test(custom): round-trip every built-in compute through buildCustomRecipe`.

---

## Task 6 — AppState 확장 + AppRoot의 recipe 메모 가드

**Files:**
- Modify: `src/features/app/state.ts`
- Modify: `src/features/app/AppRoot.tsx`

- [ ] Step 1: `state.ts` 패치.

```ts
import type {
  BrewMethodId, DripperId, Grams, Recipe, RoastLevel, TasteProfile,
} from "@/domain/types";

export type Screen = "wall" | "recipe" | "brewing" | "complete" | "custom";

export type AppState = {
  readonly screen: Screen;
  readonly coffee: Grams;
  readonly dripper: DripperId;
  readonly method: BrewMethodId;
  readonly roast: RoastLevel;
  readonly taste: TasteProfile;
  readonly customRecipe?: Recipe;
};
```

`mergeState`에 가드 추가:

```ts
export const mergeState = (base: AppState, patch: Partial<AppState>): AppState => {
  const merged = { ...base, ...patch };
  if (merged.method === "custom") return merged;
  const compat = methodsForDripper(merged.dripper);
  if (!compat.some((m) => m.id === merged.method)) {
    return { ...merged, method: compat[0]!.id };
  }
  return merged;
};
```

- [ ] Step 2: `AppRoot.tsx`의 `recipe` useMemo를 가드. `Recipe`를 import에 추가, 결과를 `Recipe | null`로:

```ts
const recipe = useMemo<Recipe | null>(() => {
  if (state.method === "custom") return state.customRecipe ?? null;
  const input: RecipeInput = {
    method: state.method, dripper: state.dripper, coffee: state.coffee,
    roast: state.roast, taste: state.taste,
  };
  return brewMethods[state.method].compute(input);
}, [state.method, state.dripper, state.coffee, state.roast, state.taste, state.customRecipe]);
```

- [ ] Step 3: `recipe`가 null일 때를 처리.
  - `useEffect(...)` 안의 `applyMeta(buildMeta(state, recipe))` → `if (recipe) applyMeta(buildMeta(state, recipe));`
  - `handleStart`/`handleComplete` 등 recipe를 사용하는 콜백 시작에 `if (!recipe) return;` 가드.
  - `RecipeScreen`/`BrewingScreen`/`CompleteScreen` 호출에 recipe를 그대로 prop 전달하던 부분이 null 가능 — 호출 직전에 `if (!recipe && state.screen === "recipe") ...` 등 단순 분기로 빈 화면 또는 fallback. v1은 `screen === "custom"` 외에는 recipe가 항상 truthy하므로(method가 "custom"이 아니면 compute로부터 보장), `recipe!` 또는 가드된 분기로 처리.

- [ ] Step 4: `bun run typecheck && bun run test:run` — PASS.
- [ ] Step 5: 커밋. `feat(app): add "custom" screen + customRecipe slot to AppState`.

---

## Task 7 — customFormState 타입 + fromRecipe + initialBlankState + toCustomInput

**Files:**
- Create: `src/features/custom/customFormState.ts`
- Create: `src/features/custom/customFormState.test.ts`

- [ ] Step 1: 테스트 작성.

```ts
import { describe, it, expect } from "vitest";
import { g } from "@/domain/units";
import { brewMethods } from "@/domain/methods";
import {
  fromRecipe, initialBlankState, toCustomInput,
} from "./customFormState";

describe("initialBlankState", () => {
  it("V60 + 15g coffee + 1:15 ratio + 5 푸어, lockLastPour=true, 첫 푸어 bloom", () => {
    const s0 = initialBlankState();
    expect(s0.dripper).toBe("v60");
    expect(s0.coffee as number).toBe(15);
    expect(s0.totalWater as number).toBe(225);
    expect(s0.lockLastPour).toBe(true);
    expect(s0.pours[0]!.atSec as number).toBe(0);
    expect(s0.pours[0]!.label).toBe("bloom");
  });
});

describe("fromRecipe / toCustomInput", () => {
  it("Kasuya 4:6 → form state → CustomRecipeInput", () => {
    const recipe = brewMethods.kasuya_4_6.compute({
      method: "kasuya_4_6", dripper: "v60", coffee: g(15),
      roast: "medium", taste: { sweetness: "balanced", strength: "medium" },
    });
    const fs = fromRecipe(recipe);
    expect(fs.totalWater).toBe(recipe.totalWater);
    expect(fs.pours.length).toBe(recipe.pours.length);
    const input = toCustomInput(fs);
    const sum = input.pours.reduce((a, p) => a + (p.pourAmount as number), 0);
    expect(sum).toBeCloseTo(recipe.totalWater as number, 2);
  });
});
```

- [ ] Step 2: `bun run test:run src/features/custom/customFormState.test.ts` — FAIL (모듈 없음).

- [ ] Step 3: `customFormState.ts` 구현 (타입 + initialBlankState + fromRecipe + toCustomInput + applyLockLastPour 헬퍼).

```ts
import type {
  Celsius, DripperId, Grams, GrindHint, Recipe, Seconds,
} from "@/domain/types";
import { c, g, s } from "@/domain/units";
import type {
  CustomPourInput, CustomRecipeInput,
} from "@/domain/methods/custom";

export type CustomFormPour = {
  readonly atSec: Seconds;
  readonly pourAmount: Grams;
  readonly label?: "bloom";
};

export type CustomFormState = {
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly temperature: Celsius;
  readonly grindHint: GrindHint;
  readonly totalTimeSec: Seconds;
  readonly pours: readonly CustomFormPour[];
  readonly lockLastPour: boolean;
  readonly selectedPourIndex: number | null;
};

export const initialBlankState = (): CustomFormState => ({
  dripper: "v60",
  coffee: g(15),
  totalWater: g(225),
  temperature: c(92),
  grindHint: "medium",
  totalTimeSec: s(170),
  pours: [
    { atSec: s(0), pourAmount: g(45), label: "bloom" },
    { atSec: s(45), pourAmount: g(45) },
    { atSec: s(90), pourAmount: g(45) },
    { atSec: s(120), pourAmount: g(45) },
    { atSec: s(150), pourAmount: g(45) },
  ],
  lockLastPour: true,
  selectedPourIndex: null,
});

export const fromRecipe = (recipe: Recipe): CustomFormState => ({
  dripper: recipe.dripper,
  coffee: recipe.coffee,
  totalWater: recipe.totalWater,
  temperature: recipe.temperature,
  grindHint: recipe.grindHint,
  totalTimeSec: recipe.totalTimeSec,
  pours: recipe.pours.map((p) => ({
    atSec: p.atSec,
    pourAmount: p.pourAmount,
    ...(p.label ? { label: p.label } : {}),
  })),
  lockLastPour: true,
  selectedPourIndex: null,
});

const applyLockLastPour = (state: CustomFormState): CustomFormState => {
  if (!state.lockLastPour || state.pours.length === 0) return state;
  const prevSum = state.pours.slice(0, -1)
    .reduce((acc, p) => acc + (p.pourAmount as number), 0);
  const remainder = (state.totalWater as number) - prevSum;
  const last = state.pours[state.pours.length - 1]!;
  if ((last.pourAmount as number) === remainder) return state;
  const newPours = [...state.pours];
  newPours[newPours.length - 1] = { ...last, pourAmount: g(remainder) };
  return { ...state, pours: newPours };
};

export const toCustomInput = (state: CustomFormState): CustomRecipeInput => {
  const adjusted = applyLockLastPour(state);
  return {
    dripper: adjusted.dripper,
    coffee: adjusted.coffee,
    totalWater: adjusted.totalWater,
    temperature: adjusted.temperature,
    grindHint: adjusted.grindHint,
    totalTimeSec: adjusted.totalTimeSec,
    pours: adjusted.pours.map<CustomPourInput>((p) => ({
      atSec: p.atSec,
      pourAmount: p.pourAmount,
      ...(p.label ? { label: p.label } : {}),
    })),
  };
};

export const ratioOf = (state: CustomFormState): number =>
  (state.totalWater as number) / ((state.coffee as number) || 1);
```

- [ ] Step 4: `bun run test:run src/features/custom/customFormState.test.ts` — PASS.
- [ ] Step 5: 커밋. `feat(custom): form state types, fromRecipe, toCustomInput`.

---

## Task 8 — customReducer (액션 처리)

**Files:** Modify `customFormState.ts` + `customFormState.test.ts`.

- [ ] Step 1: reducer 테스트 추가 (10개 액션).

`setCoffee`, `setTotalWater`, `setPourAmount`, `setPourAtSec` (5초 snap + 첫 행 잠금), `addPour`, `removePour` (첫 행 보호), `toggleBloom`, `setLockLastPour`, `selectPour`, `setTotalTimeSec` (cascade 클램프 + 단조 보장).

각 액션 1개 테스트로 충분. 핵심 시그널:
  - snap: `setPourAtSec value=s(47)` → 결과 atSec === 45.
  - 첫 행 잠금: `setPourAtSec index=0 value=s(10)` → atSec 0 그대로.
  - lockLastPour: `setTotalWater value=g(300)` 후 `toCustomInput(s1)`의 sum === 300.
  - cascade: `setTotalTimeSec value=s(60)` → 모든 pour atSec ≤ 60, 단조성 유지.

- [ ] Step 2: `bun run test:run` — FAIL (`customReducer` 없음).

- [ ] Step 3: reducer 구현 — 액션 union + reducer 함수 + helper(`snap`, `clamp`, `clampPoursToTotalTime`):

```ts
export type CustomAction =
  | { type: "setDripper"; value: DripperId }
  | { type: "setCoffee"; value: Grams }
  | { type: "setTotalWater"; value: Grams }
  | { type: "setTemperature"; value: Celsius }
  | { type: "setGrindHint"; value: GrindHint }
  | { type: "setTotalTimeSec"; value: Seconds }
  | { type: "setPourAmount"; index: number; value: Grams }
  | { type: "setPourAtSec"; index: number; value: Seconds }
  | { type: "addPour" }
  | { type: "removePour"; index: number }
  | { type: "toggleBloom" }
  | { type: "setLockLastPour"; value: boolean }
  | { type: "selectPour"; index: number | null };

const SNAP_SEC = 5;
const snap = (sec: number): number => Math.round(sec / SNAP_SEC) * SNAP_SEC;
const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

const clampPoursToTotalTime = (
  state: CustomFormState, newTotal: Seconds,
): CustomFormState => {
  const total = newTotal as number;
  if (state.pours.length === 0) return { ...state, totalTimeSec: newTotal };
  const pours: CustomFormPour[] = [];
  for (let i = state.pours.length - 1; i >= 0; i--) {
    const orig = state.pours[i]!.atSec as number;
    const upperBound = pours.length === 0 ? total : (pours[0]!.atSec as number) - SNAP_SEC;
    const lowerBound = i === 0 ? 0 : SNAP_SEC * i;
    const bounded = clamp(Math.min(orig, upperBound), lowerBound, upperBound);
    pours.unshift({ ...state.pours[i]!, atSec: s(bounded) });
  }
  return { ...state, totalTimeSec: newTotal, pours };
};

export const customReducer = (
  state: CustomFormState, action: CustomAction,
): CustomFormState => {
  switch (action.type) {
    case "setDripper": return { ...state, dripper: action.value };
    case "setCoffee": return { ...state, coffee: action.value };
    case "setTotalWater": return { ...state, totalWater: action.value };
    case "setTemperature": return { ...state, temperature: action.value };
    case "setGrindHint": return { ...state, grindHint: action.value };
    case "setTotalTimeSec": return clampPoursToTotalTime(state, action.value);
    case "setPourAmount": {
      if (action.index < 0 || action.index >= state.pours.length) return state;
      const pours = [...state.pours];
      pours[action.index] = { ...pours[action.index]!, pourAmount: action.value };
      return { ...state, pours };
    }
    case "setPourAtSec": {
      if (action.index <= 0 || action.index >= state.pours.length) return state;
      const total = state.totalTimeSec as number;
      const prev = state.pours[action.index - 1]!.atSec as number;
      const next = action.index + 1 < state.pours.length
        ? (state.pours[action.index + 1]!.atSec as number) : total;
      const snapped = snap(action.value as number);
      const bounded = clamp(snapped, prev + SNAP_SEC, Math.min(next - SNAP_SEC, total));
      const pours = [...state.pours];
      pours[action.index] = { ...pours[action.index]!, atSec: s(bounded) };
      return { ...state, pours };
    }
    case "addPour": {
      const total = state.totalTimeSec as number;
      const last = state.pours[state.pours.length - 1];
      const newAt = last
        ? snap(Math.min((last.atSec as number) + 30, total - SNAP_SEC))
        : 0;
      if (last && newAt <= (last.atSec as number)) return state;
      const newAmount = last ? (last.pourAmount as number) : 30;
      return { ...state, pours: [...state.pours, { atSec: s(newAt), pourAmount: g(newAmount) }] };
    }
    case "removePour": {
      if (action.index === 0) return state;
      if (action.index < 0 || action.index >= state.pours.length) return state;
      return { ...state, pours: state.pours.filter((_, i) => i !== action.index) };
    }
    case "toggleBloom": {
      const first = state.pours[0];
      if (!first) return state;
      const updated: CustomFormPour = first.label === "bloom"
        ? { atSec: first.atSec, pourAmount: first.pourAmount }
        : { atSec: first.atSec, pourAmount: first.pourAmount, label: "bloom" };
      return { ...state, pours: [updated, ...state.pours.slice(1)] };
    }
    case "setLockLastPour": return { ...state, lockLastPour: action.value };
    case "selectPour": return { ...state, selectedPourIndex: action.index };
  }
};
```

- [ ] Step 4: `bun run test:run src/features/custom/customFormState.test.ts` — PASS.
- [ ] Step 5: 커밋. `feat(custom): reducer with snap, clamp, lock-last-pour, bloom toggle`.

---

## Task 9 — CustomStatsPanel + CustomBasicsForm

**Files:**
- Create: `src/features/custom/CustomStatsPanel.tsx`, `src/features/custom/CustomBasicsForm.tsx`

UI 컴포넌트 단위 테스트 생략 (CLAUDE.md "선택" 정책).

- [ ] Step 1: 기존 코드의 토큰 클래스 패턴 확인.

```bash
ls src/ui/tokens
grep -rh "className=" src/features/recipe src/features/wall | head -20
```

기존이 Tailwind 유틸리티 + 커스텀 토큰 클래스 (`text-token-*`/`bg-token-*` 형태) 인지, 아니면 인라인 `style={{ color: "var(--...)" }}` 패턴인지 확인. 두 신규 컴포넌트는 동일 패턴을 따른다 — 새 토큰 도입 금지 (CLAUDE.md core principle 4).

- [ ] Step 2: `CustomStatsPanel.tsx` 작성. props: `{ result: BuildResult; lockLastPour: boolean; onToggleLock: (v: boolean) => void; }`. valid면 6개 stat 카드 (Coffee/Water/Ratio/Pours/Total/Avg interval), invalid면 모든 값 `—` + 상위 3개 에러 메시지 배너. 우상단에 `🔒 Auto-fit last pour` 토글.

  에러 메시지 매핑은 `ValidationError.kind`별로 switch (스펙 § Validation 참고).

- [ ] Step 3: `CustomBasicsForm.tsx` 작성. props: `{ dripper, coffee, totalWater, temperature, grindHint, totalTimeSec, onChange: (patch: Partial<...>) => void; }`.

  필드: Dripper select, Coffee/Water number inputs (한 줄에 묶고 우측에 derived ratio `1:15.0` 표시), Temperature number input (°C), Grind select (5단계), Total time text input with `m:ss` 마스크 (blur 시 검증).

- [ ] Step 4: `bun run typecheck` — PASS.
- [ ] Step 5: 커밋. `feat(custom): stats panel + basics form components`.

---

## Task 10 — PourEditTable

**Files:** Create `src/features/custom/PourEditTable.tsx`.

- [ ] Step 1: 작성. props:

```ts
type Props = {
  readonly state: CustomFormState;
  readonly mobile: boolean;
  readonly onPatchPour: (index: number, patch: { atSec?: Seconds; pourAmount?: Grams }) => void;
  readonly onAddPour: () => void;
  readonly onRemovePour: (index: number) => void;
  readonly onToggleBloom: () => void;
  readonly onSelectPour: (index: number | null) => void;
};
```

  데스크톱: HTML table — 컬럼 `# / Time / Pour(g) / Cum. / % / ×`. 첫 행 `#`은 Bloom 토글 체크박스, `×`는 첫 행에서 숨김. `lockLastPour && i===last && length>1`일 때 마지막 행의 Pour 셀은 derived 텍스트로 read-only (회색).

  TimeCell/GramsCell은 controlled가 아니라 `defaultValue + key={value}` 패턴으로 blur 시 commit (입력 중 갱신은 reducer 호출 폭증 방지).

  `onClick={() => onSelectPour(i)}` 행 단위 — selected이면 background 강조.

  맨 아래 `+ Add pour` 버튼 한 행.

  모바일(`mobile === true`): table 대신 카드 리스트. 각 카드 = `Pour i` 라벨 + Time 입력 + Pour 입력 + (i>0 시) Remove 버튼. `+ Add pour` 카드 맨 아래.

- [ ] Step 2: `bun run typecheck` — PASS.
- [ ] Step 3: 커밋. `feat(custom): PourEditTable with bloom toggle, last-pour lock, add/remove`.

---

## Task 11 — PourTimelinePreview (가로 마커, 드래그)

**Files:** Create `src/features/custom/PourTimelinePreview.tsx`.

- [ ] Step 1: 작성. props: `{ state, mobile, onDragMarker, onSelect }`.

  구조: 외부 div (relative, height 14) + 트랙(절대 inset-x-0 top 1/2 h-2 rounded) + 각 pour를 `style={{ left: \`${(atSec/total)*100}%\` }}` 절대 위치 마커 (button — keyboard accessible).

  드래그: `onPointerDown` (mobile/index===0이면 무시) → `setDragIdx(i)` + `setPointerCapture`. `onPointerMove`에서 trackRef rect 기준 비율 계산 → `Math.round(ratio * total)` → `onDragMarker(i, s(sec))`. `onPointerUp/Cancel` → `setDragIdx(null)`.

  스타일: bloom 마커는 `bg-token-bloom`, 일반은 `bg-token-accent`, selected는 `ring-2 ring-token-fg-strong`.

  데스크톱: 트랙 아래에 5개 tick 라벨 (`0:00 / total/4 / total/2 / 3total/4 / total`). 모바일: tick 생략.

- [ ] Step 2: `bun run typecheck` — PASS.
- [ ] Step 3: 커밋. `feat(custom): PourTimelinePreview with draggable markers (desktop)`.

---

## Task 12 — CustomRecipeScreen 컴포지션

**Files:** Create `src/features/custom/CustomRecipeScreen.tsx`.

- [ ] Step 1: 작성. props: `{ prefillFrom?: Recipe; onUseRecipe: (recipe: Recipe) => void; onCancel: () => void; }`.

  `useReducer(customReducer, prefillFrom ? fromRecipe(prefillFrom) : initialBlankState())` — `useMemo`로 초기값 계산하고 deps `[]` (진입 시 한 번만).

  `useState`로 `mobile = window.innerWidth <= 640`. `useEffect`로 resize listener 등록/해제.

  `useMemo`로 `result = buildCustomRecipe(toCustomInput(state))`.

  레이아웃:
  1. Header — 타이틀 + `Start blank` 보조 버튼 (location.reload 또는 `dispatch`로 `initialBlankState`로 리셋 — 단, 리셋 액션이 reducer에 없으므로 v1은 페이지 새로고침으로 단순 처리하거나, `setState`를 분리해서 reducer 자체를 교체하는 패턴 사용. 단순화를 위해 v1에서는 reducer 액션 `reset`을 추가하는 것이 가장 깨끗 — Task 8에서 추가하지 않았다면 여기서 추가하고 테스트 1개 보강).
  2. `<CustomBasicsForm />` — onChange는 patch를 dispatch로 분기.
  3. `<PourTimelinePreview />` — onDragMarker → `setPourAtSec`, onSelect → `selectPour`.
  4. 그리드 (`lg:grid-cols-[1fr_280px]`): 좌 `<PourEditTable mobile={mobile} />`, 우 `<CustomStatsPanel />`.
  5. Footer — `Cancel` (onClick → onCancel), `Use this recipe` (`disabled={!result.ok}`, `onClick={() => result.ok && onUseRecipe(result.recipe)}`).

  > Reset 처리 추가: Task 8에 `{ type: "reset" }` 액션을 추가하고 reducer가 `initialBlankState()`를 반환하도록. 테스트 1개 추가. 이 plan 진행 중 Task 8로 거슬러 올라가는 변경이 부담되면 `Start blank`는 v1에서 페이지 새로고침으로 처리하고 v2 followup에 명시.

- [ ] Step 2: `bun run typecheck` — PASS.
- [ ] Step 3: 커밋. `feat(custom): CustomRecipeScreen composition with footer actions`.

---

## Task 13 — AppRoot 라우팅 + Use/Cancel 핸들러

**Files:** Modify `src/features/app/AppRoot.tsx`.

- [ ] Step 1: import 추가 (`CustomRecipeScreen`, 필요 시 `Recipe` 타입).
- [ ] Step 2: 핸들러 추가:

```ts
const handleCustomize = useCallback((): void => {
  withViewTransition(() => setState((prev) => mergeState(prev, { screen: "custom" })));
}, []);

const handleUseCustom = useCallback((customRecipe: Recipe): void => {
  withViewTransition(() => {
    setState((prev) => mergeState(prev, {
      method: "custom", screen: "recipe", customRecipe,
      dripper: customRecipe.dripper, coffee: customRecipe.coffee,
    }));
  });
}, []);

const handleCancelCustom = useCallback((): void => {
  withViewTransition(() => setState((prev) => mergeState(prev, { screen: "recipe" })));
}, []);
```

- [ ] Step 3: 화면 분기에 `screen === "custom"` 추가:

```tsx
if (state.screen === "custom") {
  return (
    <CustomRecipeScreen
      prefillFrom={recipe ?? undefined}
      onUseRecipe={handleUseCustom}
      onCancel={handleCancelCustom}
    />
  );
}
```

- [ ] Step 4: `RecipeScreen` 호출 부분에 `onCustomize={handleCustomize}` 전달.
- [ ] Step 5: `bun run build` — PASS.
- [ ] Step 6: 커밋. `feat(app): wire CustomRecipeScreen into AppRoot routing`.

---

## Task 14 — RecipeScreen에 Customize 버튼 + custom 분기

**Files:** Modify `src/features/recipe/RecipeScreen.tsx`.

- [ ] Step 1: `RecipeScreen` props에 `onCustomize: () => void` 추가.
- [ ] Step 2: `methodMeta`(라인 58 부근) 가드: `const methodMeta = method === "custom" ? null : brewMethods[method];`. `methodMeta.name` 사용처는 `getMethodName(method)`로 교체. `methodMeta.description` 등은 `method === "custom"`일 때 fallback 텍스트("Your custom recipe") 또는 숨김.
- [ ] Step 3: `method === "custom"`일 때 메서드 picker 영역 숨김 (또는 "Custom" 라벨만).
- [ ] Step 4: 액션 영역 (예: Start 버튼 옆)에 `<button onClick={onCustomize}>Customize this recipe</button>` 추가. `method === "custom"`일 때 라벨은 `Edit custom recipe`로 변경.
- [ ] Step 5: `bun run build` — PASS.
- [ ] Step 6: `bun run dev` — 수동 시나리오 점검.
  1. 메인 → 메서드 선택 → RecipeScreen → "Customize" → CustomRecipeScreen, prefill 확인.
  2. 마커 드래그 → stats 즉시 갱신.
  3. Bloom 토글, lockLastPour 토글.
  4. "Use this recipe" → RecipeScreen 복귀, "Custom" 라벨.
  5. "Cancel" → 변경 폐기.
  6. invalid 상태에서 "Use" 버튼 disabled.
- [ ] Step 7: 커밋. `feat(recipe): add Customize entry + custom render branch`.

---

## Task 15 — 모바일 폴리싱

**Files:** Modify `PourEditTable.tsx`, `CustomRecipeScreen.tsx`.

- [ ] Step 1: `PourEditTable`에 `mobile === true` 분기로 카드 리스트 렌더 (Task 10 Step 1에서 이미 명시 — 미구현이라면 여기서 구현).
- [ ] Step 2: `CustomStatsPanel`은 모바일에서 그대로 두되, 부모(`CustomRecipeScreen`)에서 모바일 시 그리드를 단일 컬럼으로 (Tailwind 기본 `grid-cols-1` + `lg:grid-cols-[1fr_280px]`).
- [ ] Step 3: `bun run dev` — 모바일 viewport(375x667)에서 동선 점검. 마커 드래그 비활성, 탭 선택 동작, 카드 리스트 입력, sticky/scroll 흐름.
- [ ] Step 4: 커밋. `feat(custom): mobile-friendly card layout for pour table`.

---

## Task 16 — 최종 검증

- [ ] Step 1: `bun run typecheck && bun run test:run && bun run build` — 모두 PASS.
- [ ] Step 2: 수동 시나리오 — Wall → Recipe → Customize → Use → Recipe → 다시 Customize → Cancel. 데스크톱/모바일 viewport 모두.
- [ ] Step 3: 추가 fix 발견 시 별도 commit. 없으면 종료.

---

## v2 후속 (`docs/superpowers/followups.md`에 기록 권장)

- localStorage에 마지막 custom recipe 저장 / URL codec에 `method=custom` 핸들링.
- BrewingScreen이 `method=custom` + `state.customRecipe`로 시작 가능하게 연결.
- 사용자 메모(`notes`) 입력 필드.
- 적응형 snap, 모바일 long-press 마커 추가, 테이블 행 드래그 reorder.
- "내 프리셋" 라이브러리 진입점.
- `CustomBasicsForm` 진입을 RecipeScreen 외에서도 (예: 메인 wall에서 직접 빈 상태로 시작).
