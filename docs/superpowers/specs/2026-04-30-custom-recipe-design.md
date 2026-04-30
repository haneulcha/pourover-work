# Custom Recipe Builder — Design

핸드드립 사용자가 빌트인 9개 메서드를 벗어나 자신의 푸어 스케줄을 직접 그리고 즉시 미리볼 수 있는 화면. v1에서는 **화면과 도메인 검증만 구현**하며, 저장/공유/브루잉 연결은 v2 범위.

## Goals

- 사용자가 `coffee + totalWater`를 출발점으로, 푸어 스케줄을 시각적/정밀하게 동시에 편집할 수 있다.
- 입력 단계에서 invariants가 깨지면 즉시 인라인으로 알 수 있다.
- 결과는 기존 `Recipe` 도메인 객체와 100% 호환되어, v2에서 BrewingScreen 연결이 한 줄로 끝난다.
- 9개 빌트인 메서드의 결과를 출발점으로 prefill해서 "기존 변형" 케이스를 자연스럽게 흡수한다.

## Non-Goals (v1)

- 저장(localStorage), 공유(URL serialization), "내 프리셋" 라이브러리.
- BrewingScreen 진입 (단, 결과 Recipe는 호환).
- Strength/taste 입력 (커스텀 = "보통" 가정 — 사용자가 푸어를 직접 그리므로 taste 추론 불필요).
- 자동 notes 생성 / 사용자 메모 필드.
- 테이블 행 드래그 reorder, 모바일 long-press 마커 추가.

## Domain Model Changes

### `BrewMethodId`

```ts
type BrewMethodId =
  | "kasuya_4_6" | "hoffmann_v60" | "scott_rao"
  | "april" | "kurasu_kyoto" | "frothy_monkey"
  | "standard_3_stage" | "caffe_luxxe" | "fuglen_tokyo"
  | "custom";   // ← 추가
```

### `Recipe` 도메인

**변경 없음.** 모든 필드(`coffee/totalWater/ratio/temperature/pours/totalTimeSec/grindHint/notes`)는 커스텀에서도 동일한 의미로 채워진다. `notes`는 v1에서 빈 배열.

### `brewMethods[id]` 호출 사이트 가드

현재 코드베이스에서 `brewMethods[recipe.method].name` / `.compute(...)`를 직접 룩업하는 사이트가 다수 존재한다 (`AppRoot`, `RecipeScreen`, `CompleteScreen`, `share-image/full`, `seo/documentMeta`). `"custom"`은 registry에 없으므로 모두 깨진다.

해결: `domain/methods/index.ts`에 안전한 헬퍼를 도입한다.

```ts
export const getMethodName = (id: BrewMethodId): string =>
  id === "custom" ? "Custom" : brewMethods[id].name;
```

`compute`는 `state.method === "custom"`이면 호출하지 않고 `state.customRecipe`를 사용 (위 Screen Flow 참고). 모든 룩업 사이트를 한 번에 마이그레이션하는 단계는 plan에서 별도 step.

### Plugin contract와 custom의 관계 (Path 1)

기존 `BrewMethod.compute(input: RecipeInput): Recipe` 계약은 그대로. `RecipeInput`은 `taste`/`roast`를 받아 wisdom으로 Recipe를 *유도*한다 — 커스텀은 이 유도 과정이 없으므로 plugin 계약 밖에 둔다.

- `methods/custom.ts`는 registry에 등록하지 않음.
- 대신 별도 함수 `buildCustomRecipe(input: CustomRecipeInput): Result<Recipe, ValidationError[]>` export.
- registry는 "compute를 가진 9개 메서드"의 모음으로 의미가 살짝 좁아짐 — 도메인 주석에 명시.

### 새 타입

```ts
// src/domain/methods/custom.ts
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
  | { kind: "coffee-non-positive" }
  | { kind: "water-non-positive" }
  | { kind: "time-non-positive" }
  | { kind: "no-pours" }
  | { kind: "first-pour-not-zero"; pourIndex: 0 }
  | { kind: "non-monotonic-time"; pourIndex: number }
  | { kind: "pour-after-total-time"; pourIndex: number }
  | { kind: "non-positive-pour"; pourIndex: number }
  | { kind: "sum-mismatch"; sum: number; totalWater: number }
  | { kind: "bloom-not-on-first"; pourIndex: number };

export type BuildResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; errors: ReadonlyArray<ValidationError> };

export const buildCustomRecipe: (input: CustomRecipeInput) => BuildResult;
```

`Result` 같은 외부 라이브러리는 도입하지 않고, 위처럼 도메인 내부 타입으로 표현한다 (CLAUDE.md core principle: 도메인은 외부 의존성 0).

`buildCustomRecipe`의 책임:

1. 위 invariants 전부 검증 → 실패 시 모든 위반을 모아서 `Err`.
2. 통과 시 `index`, `cumulativeWater`, `ratio` 파생 후 `Recipe` 반환.
3. `method: "custom"`, `notes: []`, `name`/`shortName`은 호출 측에서 `"Custom"`으로 표시 (registry lookup 안 됨).

## Domain Invariants

```
1. pours.length >= 1
2. pours[0].atSec === 0                         // 첫 푸어는 항상 0초
3. pours[i].atSec < pours[i+1].atSec            // 시간 단조증가
4. pours[i].atSec <= totalTimeSec
5. pours[i].pourAmount > 0
6. sum(pours[i].pourAmount) === totalWater      // 정확 일치
7. label="bloom"은 pours[0]에만 허용
8. coffee > 0, totalWater > 0, totalTimeSec > 0
```

`dripper`는 모든 값 허용(custom은 dripper별 제약 없음).

## Screen Flow

`AppState.screen`에 `"custom"` 추가. router 변경 없음 (기존 screen-based switching).

### 진입

`RecipeScreen`에 `Customize this recipe` 버튼 추가:
- 클릭 → `withViewTransition`으로 `screen: "custom"` 전환.
- prefill source = 현재 `state`에서 도출되는 `recipe` 객체 (즉 현재 보고 있는 빌트인 메서드 결과).
- prefill 시 `lockLastPour: true` 기본값.

빈 상태 시작은 `CustomRecipeScreen` 내부 `Start blank` 액션 (header에 작은 보조 버튼).

### 종료

- `Use this recipe`: `BuildResult`가 valid일 때만 활성. 클릭 시 결과 `Recipe`를 `state`에 반영하고 `screen: "recipe"`로 복귀. v1은 `state.method = "custom"` + 결과 Recipe를 별도 슬롯(예: `state.customRecipe`)에 저장 — 자세한 state shape는 plan에서 결정.
- `RecipeScreen`은 `state.method === "custom"`이면 registry lookup 대신 `state.customRecipe`를 직접 렌더하도록 분기 필요. brewMethods[id]가 빈 값일 때 깨지지 않게 가드 추가.
- `Cancel`: 변경 폐기, `screen: "recipe"` 복귀.

## File Structure

```
src/features/custom/
  CustomRecipeScreen.tsx        // top-level, owns form state, footer actions
  CustomBasicsForm.tsx          // dripper / coffee / water / temp / grind / total time
  PourTimelinePreview.tsx       // horizontal track + draggable markers
  PourEditTable.tsx             // vertical pour rows (precise input)
  CustomStatsPanel.tsx          // stats grid, validation summary
  customFormState.ts            // form state types, reducer, derived selectors

src/domain/methods/
  custom.ts                     // CustomRecipeInput, ValidationError, buildCustomRecipe
  custom.test.ts                // invariants + snapshot + prefill round-trip
```

## Component Layout (Hybrid C)

```
CustomRecipeScreen
├── Header: title + [Start blank] [Cancel] [Use this recipe]
│
├── CustomBasicsForm
│      Dripper picker (DripperIcon/DripperPopover 재사용)
│      Coffee [g]   Total Water [g]   → ratio derived 표시 (1:15.0)
│      Temperature [°C]    Grind [select: fine ... coarse]
│      Total time [m:ss]
│
├── Schedule section
│      ├── PourTimelinePreview      (가로 트랙, 드래그 가능, 마커 사이 +Δg/Δ% 라벨)
│      └── PourEditTable            (행 단위 정밀 입력, single source of truth)
│
└── CustomStatsPanel  (또는 우측 사이드, 데스크톱 ≥1024)
        Coffee / Water / Ratio / Pours / Total time / Avg interval
        invalid 시: stats dim + "Fix N issue(s)" 배너
        lockLastPour 토글: 🔒 마지막 푸어 자동 맞춤
```

데스크톱(≥1024px): basics + stats가 2열, schedule(timeline+table)이 메인 영역.
모바일(≤640px): 단일 칼럼 — basics → timeline(read-only preview) → table(카드형) → stats(sticky bottom strip).

### Form state

```ts
type CustomFormState = {
  dripper: DripperId;
  coffee: Grams;
  totalWater: Grams;
  temperature: Celsius;
  grindHint: GrindHint;
  totalTimeSec: Seconds;
  pours: ReadonlyArray<{
    atSec: Seconds;
    pourAmount: Grams;
    label?: "bloom";
  }>;
  lockLastPour: boolean;          // default true
  selectedPourIndex: number | null; // UI-only, sync with timeline ↔ table
};
```

매 변경마다 `buildCustomRecipe(toCustomInput(formState))` 호출. valid면 stats 갱신, invalid면 stats를 dim + 에러 배너 + 인라인 마커.

### Prefill mapping (RecipeScreen → CustomRecipeScreen)

```
recipe.dripper       → form.dripper
recipe.coffee        → form.coffee
recipe.totalWater    → form.totalWater
recipe.temperature   → form.temperature
recipe.grindHint     → form.grindHint
recipe.totalTimeSec  → form.totalTimeSec
recipe.pours         → form.pours (atSec, pourAmount, label만 추출)
form.lockLastPour    = true
form.selectedPourIndex = null
```

## Interactions

### 마커 드래그 (timeline)

- `atSec`만 변경. `pourAmount` 유지.
- 5초 snap (`Math.round(sec / 5) * 5`).
- 인접 마커와 최소 5초 gap을 hard stop으로 강제.
- 첫 마커는 `atSec = 0` 잠금 (드래그 비활성, 핸들 X).
- 마지막 마커는 `totalTimeSec`까지 드래그 가능.

### 테이블 입력

- `Time` 셀: `m:ss` 마스크. blur 시 검증, 위반이면 빨간 outline.
- `Pour(g)` 셀: 정수 g. 0 이하 거부.
- `Cum.` / `%` 셀: read-only, derived.
- 행 reorder는 v1 미지원. atSec 입력으로 순서 뒤집히면 자동 재정렬 + 인덱스 재계산.

### Pour 추가/삭제

- `+ Add pour`: 마지막 다음 또는 두 pour 사이의 가운데 시점에 삽입. snap 적용. `pourAmount`는 인접 pour 평균으로 prefill.
- 행 우측 `×`: 삭제. 첫 행은 삭제 불가. 삭제 후 `lockLastPour`가 ON이면 새 마지막 pour의 `pourAmount` 자동 보정.

### Bloom 토글

- 첫 행 좌측에 체크박스. default: ON.
- ON: 시각적 색 차별화(살구색 마커), `Bloom` 라벨 표시.
- 다른 행에는 토글 노출하지 않음 (invariant 7).

### `lockLastPour` (default ON)

- ON: 마지막 pour의 `pourAmount`는 `totalWater - sum(prev)`로 derived. 입력 비활성, 회색 텍스트.
- OFF: 수동 입력. invariant 6 위반 시 에러.
- 마지막 pour ≤ 0 케이스(`totalWater`가 prev sum보다 작거나 같음) → invariant 5 위반으로 에러.

### 베이직 입력 cascading

- `coffee` 변경 → ratio 표시만 갱신.
- `totalWater` 변경:
  - `lockLastPour: true` → 마지막 pour 자동 보정. 결과 ≤ 0이면 invariant 위반.
  - `lockLastPour: false` → 변경 반영, invariant 6 위반 가능.
- `totalTimeSec` 변경:
  - 새 값 ≥ 마지막 atSec → 단순 갱신.
  - 새 값 < 마지막 atSec → 역순으로 atSec 클램프(단조 유지). 토스트로 "Adjusted N pour(s) to fit new total time."
- `dripper` / `temperature` / `grindHint` 변경 → pour 영향 없음.

## Stats Panel

| 라벨 | 값 |
|---|---|
| Coffee | input |
| Water | input |
| Ratio | `1:${(totalWater/coffee).toFixed(1)}` |
| Pours | `pours.length` |
| Total time | `m:ss` |
| Avg interval | `totalTimeSec / (pours.length - 1)`, pour 1개면 `—` |

invalid 상태:
- 모든 값 `—`로 dim.
- 상단 배너: "Fix N issue(s) before preview" + 첫 에러로 점프 링크.
- `Use this recipe` 버튼 disabled, hover tooltip으로 첫 에러 메시지.

## Edge Cases

- `coffee = 0` 또는 음수: invariant 8.
- `totalWater < sum(pourAmount)` 인데 `lockLastPour: false`: invariant 6, 마지막 행 에러.
- `totalWater - sum(prev) ≤ 0` 인데 `lockLastPour: true`: 마지막 pour ≤ 0 → invariant 5.
- `pours.length === 1`: bloom 토글 비활성, 나머지 OK.
- prefill 후 invariant 위반: 발생 불가. 방어적 검증 후 실패 시 빈 상태로 fallback + console warn.
- totalTimeSec 단축으로 마커 충돌: 5초 gap을 유지하며 cascade 클램프, 그래도 안 맞으면 invariant 3.
- 매우 짧은 totalTimeSec: 5초 snap 고정 (적응형 snap은 v2).

## Mobile Behavior

- ≤640px: `PourTimelinePreview` 드래그 비활성, 탭으로 행 선택만. 마커 라벨 숨기고 dot만.
- 테이블 행 → 카드형 (한 화면에 1~2개, 스크롤).
- Stats panel: sticky bottom strip 또는 가로 스크롤 strip.
- 마커 추가는 + 버튼만(롱프레스 미구현).

## Testing

CLAUDE.md 정책 준수.

- `src/domain/methods/custom.test.ts`:
  - **필수 1 스냅샷**: 권장 케이스 — 15g coffee, 225g water, 5 pours (Kasuya 4:6 형태), 2:50 total. 첫 pour bloom.
  - **invariants test**: 위 8개 invariants 각각의 위반 케이스 → 적절한 `ValidationError` 반환 확인.
  - **prefill 라운드트립**: 9개 빌트인 메서드 각각의 `compute` 결과 → `toCustomInput` → `buildCustomRecipe` → 원본 Recipe와 deep equal (단 `method`는 `"custom"`으로 바뀜, `notes`는 `[]`로 바뀜 — 비교 시 두 필드 제외).
- `src/domain/methods/invariants.test.ts` 기존 sweep: custom은 registry 밖이라 자동 sweep에서 빠짐. 한 케이스 수동 추가.
- UI 컴포넌트 테스트는 선택. 권장: `PourTimelinePreview` 드래그/snap 단위 테스트.

## Design Tokens

- 컴포넌트는 `src/ui/tokens.*` CSS variable만 사용 (CLAUDE.md core principle 4).
- 새 토큰 도입 X — 마커/트랙/하이라이트 색은 기존 brand palette 재사용.

## v2 Expansion Points

- `notes` 사용자 입력 필드 추가.
- URL codec에 `method: "custom"` 핸들링 — 푸어 페이로드 직렬화.
- localStorage에 last custom recipe 저장.
- BrewingScreen 진입: `Use this recipe` → `state.method = "custom"` + 결과 Recipe를 session으로 전달 (한 줄 추가).
- "내 프리셋" 라이브러리.
- `lockLastPour`를 임의 pour 잠금으로 일반화.
- 적응형 snap (totalTimeSec에 비례).
- 모바일 timeline long-press 마커 추가.
- 테이블 행 드래그 reorder.
