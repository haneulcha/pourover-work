# Brewing "상태가 곧 화면" 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브루잉 화면을 컵 메타포에서 상태 기반(부어/기다려/드로우다운, 배경색 + 큰 숫자 하나)으로 재작성한다. 스펙: `docs/superpowers/specs/2026-07-06-brewing-timer-redesign-design.md`.

**Architecture:** 도메인에 순수 함수 `brewPhase`(시퀀스 위치 = max(시계, 탭))를 추가하고, `BrewingScreen`을 상태별 풀스크린 뷰로 재작성한다. 리퀴드/링/일시정지를 삭제하고, 탭 = 한 칸 전진, 길게 누르기 = 중단으로 단순화한다. #61 큐 레이어(`cuesBetween`/`cuePlayer`/`useBrewCues`/`useCueMuted`/`haptics`)는 불변.

**Tech Stack:** Bun workspaces, Vite 6 + React 19 + TS strict, Tailwind 3 + CSS 변수 토큰, Vitest 2 + jsdom + @testing-library/react.

**Branch:** `brewing-timer-redesign` (스펙 커밋이 이미 올라가 있음. 이 브랜치에서 작업.)

## Global Constraints

- `packages/domain/**`에 React/DOM/localStorage import 금지 (순수 함수만).
- `Grams`/`Seconds` 등은 `@pourover/domain/units`의 `g/s` 생성자로만 생성. `as Grams` 캐스팅 금지.
- 컴포넌트에 색/스페이싱/폰트 하드코딩 금지 — 모든 스타일 값은 토큰(CSS 변수) 경유.
- #61 큐 파일 수정 금지: `cueTones.ts`, `haptics.ts`, `cuePlayer.ts`, `useCueMuted.ts`, `useBrewCues.ts` (+ 각 테스트).
- 테스트 파일은 대상과 같은 디렉토리에 `*.test.ts(x)`.
- 각 태스크 완료 시 커밋. 커밋 메시지 한 줄 요약(한국어 가능).

---

### Task 1: 도메인 `brewPhase`

**Files:**
- Modify: `packages/domain/src/session.ts` (파일 끝에 추가)
- Test: `packages/domain/src/session.test.ts` (파일 끝에 추가)

**Interfaces:**
- Consumes: 기존 `activeStepIdx(pours, elapsed)`, `Pour` 타입 (같은 파일/`./types`).
- Produces: `BrewPhase` 타입과 `brewPhase(pours, totalTimeSec, elapsed, tapPos): BrewPhase` — Task 3의 `BrewingScreen`이 import.

**배경 (구현자 필독):** 브루잉은 고정 시퀀스 `pour(0) → wait → pour(1) → wait → … → pour(n-1) → drawdown`을 따른다. 위치를 정수로 인코딩: **pos 2·i = pour(i), 2·i+1 = 그 뒤의 wait** (마지막 홀수 pos는 drawdown). 시계는 `clockPos = 2 · activeStepIdx`로 경계마다 pour로 강제 전진(뒤로 안 감), 탭(`tapPos`, UI가 보관)은 화면 상태만 한 칸 당긴다. 유효 위치 = `max(clockPos, tapPos)`를 drawdown 위치로 클램프해 해석한다. `tapPos`가 `2 * pours.length`(완료 신호) 이상인 경우의 완료 판정은 UI 몫 — 이 함수는 pos를 클램프해서 drawdown을 돌려줄 뿐이다.

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/domain/src/session.test.ts` 파일 끝에 추가. 이 파일 상단에 이미 `mkPour` 헬퍼와 `recipe`(pours: bloom@0s/30g누적30, 1차@45s/누적150, 2차@75s/누적250, totalTimeSec 210)가 있다 — 그대로 재사용. import 목록에 `brewPhase`를 추가한다:

```ts
// import 블록에 추가
import {
  activeStepIdx,
  brewPhase, // ← 추가
  cuesBetween,
  // …기존 그대로
} from "./session";
```

```ts
describe("brewPhase", () => {
  const pours = recipe.pours;
  const total = recipe.totalTimeSec;

  it("시작(elapsed=0, 탭 없음)은 pour(0)", () => {
    expect(brewPhase(pours, total, 0, 0)).toEqual({ kind: "pour", stepIdx: 0 });
  });

  it("탭 없이 경계를 넘으면 시계가 pour를 전진시킨다", () => {
    expect(brewPhase(pours, total, 44, 0)).toEqual({ kind: "pour", stepIdx: 0 });
    expect(brewPhase(pours, total, 45, 0)).toEqual({ kind: "pour", stepIdx: 1 });
    expect(brewPhase(pours, total, 75, 0)).toEqual({ kind: "pour", stepIdx: 2 });
  });

  it("pour 중 탭(홀수 pos)이면 wait — 다음 푸어까지 남은 초", () => {
    // pour(0)에서 탭 → tapPos=1 → wait, 다음은 1차(atSec=45)
    expect(brewPhase(pours, total, 10, 1)).toEqual({
      kind: "wait",
      nextIdx: 1,
      remainingSec: 35,
    });
  });

  it("wait 중 탭이면 다음 pour를 미리 당긴다", () => {
    // tapPos=2 → pour(1), 시계(elapsed=10, clockPos=0)보다 앞섬
    expect(brewPhase(pours, total, 10, 2)).toEqual({ kind: "pour", stepIdx: 1 });
  });

  it("시계가 탭을 추월하면 시계를 따른다 (자가 치유)", () => {
    // tapPos=1(wait)이지만 elapsed=45로 경계 도달 → clockPos=2 → pour(1)
    expect(brewPhase(pours, total, 45, 1)).toEqual({ kind: "pour", stepIdx: 1 });
  });

  it("탭이 시계보다 앞서 있으면 탭을 따른다", () => {
    // elapsed=50(clockPos=2), tapPos=4 → pour(2)
    expect(brewPhase(pours, total, 50, 4)).toEqual({ kind: "pour", stepIdx: 2 });
  });

  it("마지막 pour 뒤 탭이면 drawdown — 완료까지 남은 초", () => {
    // elapsed=80(clockPos=4), tapPos=5 → drawdown, 210-80=130
    expect(brewPhase(pours, total, 80, 5)).toEqual({
      kind: "drawdown",
      remainingSec: 130,
    });
  });

  it("drawdown remainingSec은 0 밑으로 내려가지 않는다", () => {
    expect(brewPhase(pours, total, 300, 5)).toEqual({
      kind: "drawdown",
      remainingSec: 0,
    });
  });

  it("과다 탭은 drawdown 위치로 클램프된다", () => {
    expect(brewPhase(pours, total, 80, 99)).toEqual({
      kind: "drawdown",
      remainingSec: 130,
    });
  });

  it("푸어 1개짜리 레시피: pour(0) → 탭 → drawdown", () => {
    const single = [mkPour(0, 0, 200, 200, true)];
    expect(brewPhase(single, 180, 0, 0)).toEqual({ kind: "pour", stepIdx: 0 });
    expect(brewPhase(single, 180, 30, 1)).toEqual({
      kind: "drawdown",
      remainingSec: 150,
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/haneul/Projects/pourover-work/packages/domain && bunx vitest run src/session.test.ts`
Expected: FAIL — `brewPhase` export 없음 (SyntaxError/undefined).

- [ ] **Step 3: 최소 구현**

`packages/domain/src/session.ts` 파일 끝에 추가:

```ts
export type BrewPhase =
  | { readonly kind: "pour"; readonly stepIdx: number }
  | {
      readonly kind: "wait";
      readonly nextIdx: number;
      readonly remainingSec: number;
    }
  | { readonly kind: "drawdown"; readonly remainingSec: number };

// 브루잉 시퀀스 위치: pos 2i = pour(i), 2i+1 = 그 뒤의 wait(마지막은 drawdown).
// 유효 위치 = max(시계, 탭). 시계(activeStepIdx)는 경계마다 pour로 강제 전진하고
// 뒤로 가지 않으므로, 실수 탭은 다음 경계에서 자동 재동기화된다.
// tapPos >= 2 * pours.length (완료 신호) 판정은 호출부(UI) 몫 — 여기선 클램프만.
export const brewPhase = (
  pours: readonly Pour[],
  totalTimeSec: number,
  elapsed: number,
  tapPos: number,
): BrewPhase => {
  const maxPos = 2 * (pours.length - 1) + 1; // drawdown 위치
  const pos = Math.min(
    maxPos,
    Math.max(2 * activeStepIdx(pours, elapsed), tapPos),
  );
  if (pos % 2 === 0) return { kind: "pour", stepIdx: pos / 2 };
  const nextIdx = (pos + 1) / 2;
  if (nextIdx < pours.length) {
    return {
      kind: "wait",
      nextIdx,
      remainingSec: Math.max(0, pours[nextIdx]!.atSec - elapsed),
    };
  }
  return { kind: "drawdown", remainingSec: Math.max(0, totalTimeSec - elapsed) };
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/haneul/Projects/pourover-work/packages/domain && bunx vitest run src/session.test.ts`
Expected: PASS (기존 테스트 포함 전부).

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/session.ts packages/domain/src/session.test.ts
git commit -m "feat(domain): brewPhase — 브루잉 시퀀스 위치 해석 (max(시계, 탭))"
```

---

### Task 2: 토큰 추가 (상태 배경색 · display-xl · 리드인 모션)

**Files:**
- Modify: `apps/web/src/ui/tokens/components/brewing.css` (기존 토큰 유지, 새 토큰 추가 — 구 토큰 삭제는 Task 4)
- Modify: `apps/web/src/ui/tokens/motion.css`
- Modify: `apps/web/tailwind.config.ts`

**Interfaces:**
- Produces: Tailwind 클래스 — `bg-brewing-pour-bg` / `text-brewing-pour-fg` / `text-brewing-pour-fg-muted`, `bg-brewing-wait-bg` / `text-brewing-wait-fg` / `text-brewing-wait-fg-muted`, `text-display-xl`, `duration-leadin`. Task 3의 `BrewingScreen`이 사용.

**주의:** 이 태스크는 **추가만** 한다. 구 토큰(liquid/ring/meniscus/rim)은 구 `BrewingScreen`이 아직 쓰므로 Task 4에서 삭제.

- [ ] **Step 1: brewing.css에 상태 토큰 추가**

`apps/web/src/ui/tokens/components/brewing.css`의 `:root` 블록 끝(기존 `--brewing-hero-gap: 12px;` 아래)에 추가:

```css
  /* ── 상태가 곧 화면 (2026-07 리디자인) ──
     pour = 따뜻한 액센트로 화면 전체가 물듦 (주변시야 신호),
     wait/drawdown = 차분한 캔버스. 큰 숫자는 fg, 보조 줄은 fg-muted. */
  --color-brewing-state-pour-bg: var(--accent-200);
  --color-brewing-state-pour-fg: var(--neutral-900);
  --color-brewing-state-pour-fg-muted: var(--neutral-700);

  --color-brewing-state-wait-bg: var(--neutral-0);
  --color-brewing-state-wait-fg: var(--neutral-900);
  --color-brewing-state-wait-fg-muted: var(--neutral-500);
```

`[data-theme="dark"]` 블록 끝에 추가:

```css
  --color-brewing-state-pour-bg: var(--accent-800);
  --color-brewing-state-pour-fg: var(--neutral-0);
  --color-brewing-state-pour-fg-muted: var(--neutral-100);

  --color-brewing-state-wait-bg: var(--neutral-900);
  --color-brewing-state-wait-fg: var(--neutral-50);
  --color-brewing-state-wait-fg-muted: var(--neutral-400);
```

- [ ] **Step 2: motion.css에 리드인 duration 추가**

`apps/web/src/ui/tokens/motion.css`의 `:root` 블록 끝에 추가:

```css
  /* Brewing lead-in — 배경 물듦. 소리 리드인 큐(5초 전)와 함께 서서히 전환 */
  --motion-duration-leadin: 1500ms;
```

- [ ] **Step 3: tailwind.config.ts에 매핑 추가**

`transitionDuration`에 추가:

```ts
      transitionDuration: {
        DEFAULT: "var(--motion-duration-base)",
        long: "var(--motion-duration-long)",
        leadin: "var(--motion-duration-leadin)", // ← 추가
      },
```

`fontSize`에 추가 (`"heading-xl"` 줄 위):

```ts
        // 글랜서블 디스플레이 — 브루잉 큰 숫자 전용. 뷰포트 반응, tabular-nums 전제.
        "display-xl": ["clamp(88px, 26vw, 150px)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "500" }],
```

`colors.brewing`에 상태 키 추가 (기존 liquid 키들은 유지 — Task 4에서 삭제):

```ts
        brewing: {
          "liquid-top": "var(--color-brewing-liquid-top)",
          "liquid-mid": "var(--color-brewing-liquid-mid)",
          "liquid-deep": "var(--color-brewing-liquid-deep)",
          "liquid-bottom": "var(--color-brewing-liquid-bottom)",
          meniscus: "var(--color-meniscus-highlight)",
          // ↓ 추가
          "pour-bg": "var(--color-brewing-state-pour-bg)",
          "pour-fg": "var(--color-brewing-state-pour-fg)",
          "pour-fg-muted": "var(--color-brewing-state-pour-fg-muted)",
          "wait-bg": "var(--color-brewing-state-wait-bg)",
          "wait-fg": "var(--color-brewing-state-wait-fg)",
          "wait-fg-muted": "var(--color-brewing-state-wait-fg-muted)",
        },
```

- [ ] **Step 4: 타입체크 + 빌드 확인**

Run: `cd /Users/haneul/Projects/pourover-work && bun run typecheck && bun run build`
Expected: 둘 다 성공 (토큰 추가는 기존 코드에 영향 없음).

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/ui/tokens/components/brewing.css apps/web/src/ui/tokens/motion.css apps/web/tailwind.config.ts
git commit -m "feat(tokens): 브루잉 상태 배경/전경 + display-xl + 리드인 duration"
```

---

### Task 3: BrewingScreen 재작성

**Files:**
- Rewrite: `apps/web/src/features/brewing/BrewingScreen.tsx`
- Rewrite: `apps/web/src/features/brewing/BrewingScreen.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `brewPhase`/`BrewPhase`, Task 2의 Tailwind 클래스, 기존 `useElapsed(session)` (두 번째 인자 생략 — 시그니처 정리는 Task 4), `useBrewCues`/`createCuePlayer`/`useCueMuted`/`useScreenWakeLock`/`StopConfirmDialog`/`formatTime`/`cx`, 도메인 `activeStepIdx`/`pourLabel`/`LEAD_IN_SEC`/`leadInCountdown`.
- Produces: `BrewingScreen({ session, onExit, onComplete })` — **props 불변**이므로 `AppRoot` 수정 없음.

**동작 요약 (구현자 필독):**
- 탭(중앙 큰 버튼) = 유효 위치 +1 (`min(완료pos, max(clockPos, tapPos) + 1)`). 완료pos = `2 * pours.length`.
- 길게 누르기(600ms) = 중단 다이얼로그. 길게 누르기로 판정되면 그 제스처의 click은 무시.
- 하단 `길게 눌러 중단` 캡션은 **실제 버튼**(클릭 시 다이얼로그) — 키보드/스크린리더의 중단 경로 겸 발견성 힌트.
- 일시정지 없음. 다이얼로그 열려도 시계·큐 계속.
- 리드인: `leadInCountdown(elapsed, pours, LEAD_IN_SEC) !== null`이면 wait 중에도 pour 배경색 (전환 duration-leadin).
- 완료: `elapsed >= totalTimeSec || tapPos >= 완료pos` → `onComplete` 1회 (completedRef).

- [ ] **Step 1: 실패하는 테스트 작성 (파일 전체 교체)**

`apps/web/src/features/brewing/BrewingScreen.test.tsx` 전체를 아래로 교체:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cuePlayerModule from "./cuePlayer";
import type { Pour, Recipe } from "@pourover/domain/types";
import { c, g, ratio, s } from "@pourover/domain/units";
import type { BrewSession } from "@pourover/domain/session";
import { BrewingScreen } from "./BrewingScreen";

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

const BASE = 1_000_000_000_000;
const makeSession = (startedAt: number): BrewSession => ({ recipe, startedAt });

const renderScreen = (
  startedAt = BASE,
  handlers: { onExit?: () => void; onComplete?: () => void } = {},
) =>
  render(
    <BrewingScreen
      session={makeSession(startedAt)}
      onExit={handlers.onExit ?? vi.fn()}
      onComplete={handlers.onComplete ?? vi.fn()}
    />,
  );

const advanceTo = (elapsedMs: number) => {
  act(() => {
    vi.setSystemTime(new Date(BASE + elapsedMs));
    vi.advanceTimersByTime(500); // useElapsed 250ms 틱 최소 1회
  });
};

const tapArea = () => screen.getByTestId("tap-area");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(BASE));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("BrewingScreen — pour 상태", () => {
  it("시작 시 pour: 목표 누적량과 라벨, 액센트 배경", () => {
    renderScreen();
    expect(screen.getByTestId("big-number")).toHaveTextContent("30");
    expect(screen.getByText(/bloom/)).toBeInTheDocument();
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("true");
  });

  it("마지막 pour에는 '마지막' 표기", () => {
    renderScreen(BASE - 80_000); // elapsed=80 → pour(2)
    expect(screen.getByTestId("big-number")).toHaveTextContent("250");
    expect(screen.getByText(/마지막/)).toBeInTheDocument();
  });

  it("탭 없이도 경계에서 시계가 pour를 전진시킨다", () => {
    renderScreen();
    advanceTo(46_000);
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
  });
});

describe("BrewingScreen — 탭 전진", () => {
  it("pour 중 탭 → wait: 다음 푸어까지 카운트다운 + 프리뷰, 차분한 배경", () => {
    renderScreen();
    fireEvent.click(tapArea());
    // 다음 푸어 atSec=45, elapsed=0 → 0:45
    expect(screen.getByTestId("big-number")).toHaveTextContent("0:45");
    expect(screen.getByText(/다음 · 1차 150g/)).toBeInTheDocument();
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("false");
  });

  it("wait 중 탭 → 다음 pour를 미리 당긴다", () => {
    renderScreen();
    fireEvent.click(tapArea()); // → wait
    fireEvent.click(tapArea()); // → pour(1)
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
  });

  it("wait 중 시계가 경계를 넘으면 자동으로 pour 복귀 (자가 치유)", () => {
    renderScreen();
    fireEvent.click(tapArea()); // → wait
    advanceTo(45_000);
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
  });

  it("마지막 pour에서 탭 → drawdown: 완료까지 카운트다운", () => {
    renderScreen(BASE - 80_000); // elapsed=80 → pour(2)
    fireEvent.click(tapArea());
    // 210-80=130 → 2:10
    expect(screen.getByTestId("big-number")).toHaveTextContent("2:10");
    expect(screen.getByText("드로우다운")).toBeInTheDocument();
  });

  it("drawdown 중 탭 → onComplete", () => {
    const onComplete = vi.fn();
    renderScreen(BASE - 80_000, { onComplete });
    fireEvent.click(tapArea()); // → drawdown
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(tapArea()); // → 완료
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("탭 영역 aria-label이 상태 따라 바뀐다", () => {
    renderScreen();
    expect(tapArea()).toHaveAttribute("aria-label", "붓기 완료");
    fireEvent.click(tapArea());
    expect(tapArea()).toHaveAttribute("aria-label", "다음 푸어로 건너뛰기");
  });
});

describe("BrewingScreen — 리드인", () => {
  it("다음 푸어 5초 전부터 wait에서도 액센트 배경", () => {
    renderScreen();
    fireEvent.click(tapArea()); // → wait
    advanceTo(41_000); // 45초 푸어 4초 전
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("true");
    expect(screen.getByTestId("big-number")).toHaveTextContent("0:04");
  });
});

describe("BrewingScreen — 중단", () => {
  it("길게 누르기(600ms)로 중단 다이얼로그가 열린다", () => {
    renderScreen();
    fireEvent.pointerDown(tapArea());
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
    // 길게 누르기 후의 click은 전진으로 새지 않는다
    fireEvent.pointerUp(tapArea());
    fireEvent.click(tapArea());
    expect(screen.getByTestId("big-number")).toHaveTextContent("30");
  });

  it("600ms 전에 떼면 다이얼로그가 열리지 않는다", () => {
    renderScreen();
    fireEvent.pointerDown(tapArea());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(tapArea());
    expect(screen.queryByText("브루잉을 중단할까요?")).toBeNull();
  });

  it("하단 힌트 버튼으로도 다이얼로그가 열린다 (키보드 경로)", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
  });

  it("처음으로 확인 시 onExit", () => {
    const onExit = vi.fn();
    renderScreen(BASE, { onExit });
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("다이얼로그가 떠 있어도 시계는 흐른다 (일시정지 없음)", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    advanceTo(46_000);
    fireEvent.click(screen.getByRole("button", { name: "계속하기" }));
    // 46초 경과가 반영되어 pour(1)
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
  });
});

describe("BrewingScreen — 완료 / 부가", () => {
  it("elapsed >= totalTimeSec이면 onComplete 1회", () => {
    const onComplete = vi.fn();
    renderScreen(BASE - 300_000, { onComplete });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("진행 중에는 onComplete가 불리지 않는다", () => {
    const onComplete = vi.fn();
    renderScreen(BASE, { onComplete });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("구석 정보: 경과/총시간과 스텝 카운트", () => {
    renderScreen();
    expect(screen.getByText(/0:00 \/ 3:30/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
  });

  it("음소거 토글 aria-pressed", () => {
    renderScreen();
    const toggle = screen.getByRole("button", { name: /큐 소리/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-live가 경계 통과 시 새 스텝을 안내한다", () => {
    renderScreen();
    advanceTo(46_000);
    expect(screen.getByRole("status")).toHaveTextContent("1차: 150그램까지");
  });
});

describe("BrewingScreen — 큐 발화 배선 (불변 확인)", () => {
  it("푸어 경계를 넘으면 player.play 호출 (lead-in + pour)", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    renderScreen();
    advanceTo(46_000);
    const kinds = play.mock.calls.map((call) => call[0]);
    expect(kinds).toContain("lead-in");
    expect(kinds).toContain("pour");
  });

  it("totalTimeSec 도달 시 complete 큐 발화", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    renderScreen();
    advanceTo(210_000);
    const kinds = play.mock.calls.map((call) => call[0]);
    expect(kinds).toContain("complete");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/haneul/Projects/pourover-work/apps/web && bunx vitest run src/features/brewing/BrewingScreen.test.tsx`
Expected: FAIL 다수 — `tap-area`/`big-number` testid 없음 등. (구 화면 기준 테스트는 교체됐으므로 전부 새 기준으로 실패.)

- [ ] **Step 3: BrewingScreen 구현 (파일 전체 교체)**

`apps/web/src/features/brewing/BrewingScreen.tsx` 전체를 아래로 교체:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  activeStepIdx,
  brewPhase,
  LEAD_IN_SEC,
  leadInCountdown,
  pourLabel,
  type BrewSession,
} from "@pourover/domain/session";
import type { Pour } from "@pourover/domain/types";
import { createCuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";
import { useCueMuted } from "./useCueMuted";
import { formatTime } from "@/ui/format";
import { cx } from "@/ui/cx";
import { StopConfirmDialog } from "./StopConfirmDialog";
import { useElapsed } from "./useElapsed";
import { useScreenWakeLock } from "./useScreenWakeLock";

type Props = {
  readonly session: BrewSession;
  readonly onExit: () => void;
  readonly onComplete: () => void;
};

const LONG_PRESS_MS = 600;

export function BrewingScreen({ session, onExit, onComplete }: Props) {
  useScreenWakeLock();
  const player = useMemo(() => createCuePlayer(), []);
  const [muted, toggleMuted] = useCueMuted();
  useEffect(() => {
    player.unlock(); // 브루잉 진입 = 시작 탭 제스처 직후 → iOS 오디오 잠금 해제
  }, [player]);

  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [tapPos, setTapPos] = useState(0);
  const completedRef = useRef(false);

  const elapsed = useElapsed(session);
  const {
    recipe: { pours, totalTimeSec },
  } = session;

  useBrewCues({ elapsed, pours, totalTimeSec, player, muted, active: true });

  const phase = brewPhase(pours, totalTimeSec, elapsed, tapPos);
  const completePos = 2 * pours.length;
  const done = elapsed >= totalTimeSec || tapPos >= completePos;
  // 리드인 창에서는 wait 중에도 배경을 미리 물들여 "곧이야"를 예고 (소리 큐와 동기)
  const accent = phase.kind === "pour" || leadInCountdown(elapsed, pours, LEAD_IN_SEC) !== null;

  // 구석 정보·aria-live용 현재 스텝 (wait는 방금 부은 스텝에 머무름)
  const stepIdx =
    phase.kind === "pour"
      ? phase.stepIdx
      : phase.kind === "wait"
        ? phase.nextIdx - 1
        : pours.length - 1;

  useEffect(() => {
    if (done && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  const advance = () => {
    const clockPos = 2 * activeStepIdx(pours, elapsed);
    setTapPos((prev) => Math.min(completePos, Math.max(clockPos, prev) + 1));
  };

  // 길게 누르기(중단) vs 탭(전진) — 길게 누르기로 판정되면 그 제스처의 click은 무시
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const startLongPress = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setStopDialogOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const handleTap = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    advance();
  };

  const tapLabel =
    phase.kind === "pour"
      ? "붓기 완료"
      : phase.kind === "wait"
        ? "다음 푸어로 건너뛰기"
        : "브루잉 완료";
  const fgMuted = accent
    ? "text-brewing-pour-fg-muted"
    : "text-brewing-wait-fg-muted";

  return (
    <div
      data-testid="brewing-screen"
      data-accent={accent ? "true" : "false"}
      className={cx(
        "relative mx-auto flex min-h-svh max-w-lg select-none flex-col transition-colors",
        accent
          ? "bg-brewing-pour-bg text-brewing-pour-fg duration-leadin"
          : "bg-brewing-wait-bg text-brewing-wait-fg duration-long",
      )}
    >
      <AriaLiveStep session={session} activeIdx={stepIdx} />

      <header className="flex items-center justify-between px-5 pt-4">
        <div className={cx("text-caption-sm tabular-nums", fgMuted)}>
          {formatTime(elapsed)} / {formatTime(totalTimeSec)} · {stepIdx + 1}/
          {pours.length}
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          aria-label={muted ? "큐 소리 켜기" : "큐 소리 끄기"}
          className={cx("flex min-h-11 items-center px-2 text-caption-sm", fgMuted)}
        >
          {muted ? "소리 꺼짐" : "소리"}{" "}
          <span aria-hidden>{muted ? "🔇" : "🔔"}</span>
        </button>
      </header>

      <button
        type="button"
        data-testid="tap-area"
        aria-label={tapLabel}
        onClick={handleTap}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        className="flex flex-1 touch-manipulation flex-col items-center justify-center px-5 text-center"
      >
        {phase.kind === "pour" ? (
          <PourView
            pour={pours[phase.stepIdx]!}
            stepIdx={phase.stepIdx}
            isLast={phase.stepIdx === pours.length - 1}
            fgMuted={fgMuted}
          />
        ) : (
          <CountdownView
            remainingSec={phase.remainingSec}
            next={phase.kind === "wait" ? pours[phase.nextIdx]! : null}
            nextIdx={phase.kind === "wait" ? phase.nextIdx : null}
            fgMuted={fgMuted}
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => setStopDialogOpen(true)}
        className={cx("pb-5 pt-2 text-caption-sm", fgMuted)}
      >
        길게 눌러 중단
      </button>

      {stopDialogOpen && (
        <StopConfirmDialog
          onCancel={() => setStopDialogOpen(false)}
          onConfirm={onExit}
        />
      )}
    </div>
  );
}

function PourView({
  pour,
  stepIdx,
  isLast,
  fgMuted,
}: {
  readonly pour: Pour;
  readonly stepIdx: number;
  readonly isLast: boolean;
  readonly fgMuted: string;
}) {
  return (
    <>
      <span
        className={cx(
          "text-caption-xxs font-semibold uppercase tracking-widest",
          fgMuted,
        )}
      >
        지금 부어 · {pourLabel(pour, stepIdx)}
      </span>
      <span
        data-testid="big-number"
        className="mt-2 block text-display-xl tabular-nums"
      >
        {pour.cumulativeWater}
        <span className="text-heading-lg">g</span>
      </span>
      <span className={cx("mt-2 block text-body-md", fgMuted)}>
        +{pour.pourAmount}g{isLast ? " · 마지막" : ""}
      </span>
    </>
  );
}

function CountdownView({
  remainingSec,
  next,
  nextIdx,
  fgMuted,
}: {
  readonly remainingSec: number;
  readonly next: Pour | null;
  readonly nextIdx: number | null;
  readonly fgMuted: string;
}) {
  return (
    <>
      <span
        className={cx(
          "text-caption-xxs font-semibold uppercase tracking-widest",
          fgMuted,
        )}
      >
        {next ? "기다려" : "드로우다운"}
      </span>
      <span
        data-testid="big-number"
        className="mt-2 block text-display-xl tabular-nums"
      >
        {formatTime(remainingSec)}
      </span>
      {next && nextIdx !== null && (
        <span className={cx("mt-2 block text-body-md", fgMuted)}>
          다음 · {pourLabel(next, nextIdx)} {next.cumulativeWater}g
        </span>
      )}
    </>
  );
}

function AriaLiveStep({
  session,
  activeIdx,
}: {
  readonly session: BrewSession;
  readonly activeIdx: number;
}) {
  const [announced, setAnnounced] = useState<string>("");
  useEffect(() => {
    const pour = session.recipe.pours[activeIdx];
    if (!pour) return;
    setAnnounced(
      `${pourLabel(pour, activeIdx)}: ${pour.cumulativeWater}그램까지`,
    );
  }, [session, activeIdx]);
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {announced}
    </span>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/haneul/Projects/pourover-work/apps/web && bunx vitest run src/features/brewing/BrewingScreen.test.tsx`
Expected: PASS 전부.

주의할 함정:
- `advanceTimersByTime(600)`이 useElapsed 250ms 틱도 2회 굴린다 — 길게 누르기 테스트에서 elapsed가 0→0으로 유지되는지(BASE 고정 setSystemTime이므로 유지됨) 확인.
- jsdom의 `fireEvent.click`은 pointerDown을 선행하지 않음 → 일반 탭 테스트에서 `longPressFired`는 항상 false — 의도된 동작.

- [ ] **Step 5: brewing 스위트 전체 실행 (큐 레이어 불변 확인)**

Run: `cd /Users/haneul/Projects/pourover-work/apps/web && bunx vitest run src/features/brewing/`
Expected: PASS — `cuePlayer`/`useBrewCues`/`useCueMuted`/`haptics`/`useScreenWakeLock`/`StopConfirmDialog` 테스트 포함 전부.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/features/brewing/BrewingScreen.tsx apps/web/src/features/brewing/BrewingScreen.test.tsx
git commit -m "feat(brewing): 상태가 곧 화면 — pour/wait/drawdown 풀스크린 뷰 + 탭 전진 + 길게 눌러 중단"
```

---

### Task 4: 잔재 정리 (useFillRatio · pause · 죽은 토큰)

**Files:**
- Delete: `apps/web/src/features/brewing/useFillRatio.ts`
- Modify: `apps/web/src/features/brewing/useElapsed.ts` (pausedAt 파라미터 제거)
- Modify: `apps/web/src/ui/tokens/components/brewing.css` (구 토큰 삭제 → 상태 토큰만 남김)
- Modify: `apps/web/tailwind.config.ts` (죽은 매핑 삭제)

**Interfaces:**
- Consumes: Task 3 완료 상태 (구 토큰/훅의 마지막 사용처가 사라진 뒤여야 함).
- Produces: `useElapsed(session: BrewSession | null): number` — 단일 파라미터 시그니처.

- [ ] **Step 1: useFillRatio 삭제**

```bash
rm /Users/haneul/Projects/pourover-work/apps/web/src/features/brewing/useFillRatio.ts
```

- [ ] **Step 2: useElapsed 단순화 (파일 전체 교체)**

`apps/web/src/features/brewing/useElapsed.ts`:

```ts
import { useEffect, useState } from "react";
import { elapsedSec, type BrewSession } from "@pourover/domain/session";

const TICK_MS = 250;

export function useElapsed(session: BrewSession | null): number {
  const [elapsed, setElapsed] = useState<number>(() =>
    session ? elapsedSec(session, Date.now()) : 0,
  );

  useEffect(() => {
    if (!session) {
      setElapsed(0);
      return;
    }
    setElapsed(elapsedSec(session, Date.now()));
    const id = window.setInterval(() => {
      setElapsed(elapsedSec(session, Date.now()));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [session]);

  return elapsed;
}
```

- [ ] **Step 3: brewing.css를 상태 토큰만으로 교체 (파일 전체 교체)**

`apps/web/src/ui/tokens/components/brewing.css`:

```css
/* Brewing domain tokens — 상태가 곧 화면 (pour/wait 배경·전경).
   spec 외 brand 차별화 영역. semantic 참조하지 않고 자체 값.
   pour = 따뜻한 액센트로 화면 전체가 물듦 (주변시야 신호),
   wait/drawdown = 차분한 캔버스. 큰 숫자는 fg, 보조 줄은 fg-muted. */

:root {
  --color-brewing-state-pour-bg: var(--accent-200);
  --color-brewing-state-pour-fg: var(--neutral-900);
  --color-brewing-state-pour-fg-muted: var(--neutral-700);

  --color-brewing-state-wait-bg: var(--neutral-0);
  --color-brewing-state-wait-fg: var(--neutral-900);
  --color-brewing-state-wait-fg-muted: var(--neutral-500);
}

[data-theme="dark"] {
  --color-brewing-state-pour-bg: var(--accent-800);
  --color-brewing-state-pour-fg: var(--neutral-0);
  --color-brewing-state-pour-fg-muted: var(--neutral-100);

  --color-brewing-state-wait-bg: var(--neutral-900);
  --color-brewing-state-wait-fg: var(--neutral-50);
  --color-brewing-state-wait-fg-muted: var(--neutral-400);
}
```

- [ ] **Step 4: tailwind.config.ts 죽은 매핑 삭제**

다음을 삭제 (Task 2에서 추가한 것과 `pour.bloom`/`pour.main`, `timeline.*`은 유지):

- `colors.brewing`의 `"liquid-top"`, `"liquid-mid"`, `"liquid-deep"`, `"liquid-bottom"`, `meniscus` 키
- `colors.ring` 블록 전체 (`future`, `"on-liquid"`, `"on-liquid-label"`)
- `colors.text`의 `"on-liquid"` 키 (주석 포함)
- `boxShadow`의 `"rim-inset"`, `"cup-inset"` 키
- `height`의 `"brewing-rim"` 키

삭제 후 `colors.brewing`은 다음만 남는다:

```ts
        brewing: {
          "pour-bg": "var(--color-brewing-state-pour-bg)",
          "pour-fg": "var(--color-brewing-state-pour-fg)",
          "pour-fg-muted": "var(--color-brewing-state-pour-fg-muted)",
          "wait-bg": "var(--color-brewing-state-wait-bg)",
          "wait-fg": "var(--color-brewing-state-wait-fg)",
          "wait-fg-muted": "var(--color-brewing-state-wait-fg-muted)",
        },
```

- [ ] **Step 5: 잔여 참조 없는지 확인**

Run: `grep -rn "useFillRatio\|brewing-liquid\|ring-on-liquid\|ring-future\|meniscus\|text-on-liquid\|rim-inset\|cup-inset\|brewing-rim\|brewing-hero-gap\|pausedAt" /Users/haneul/Projects/pourover-work/apps/web/src /Users/haneul/Projects/pourover-work/packages/domain/src`
Expected: 출력 없음 (exit 1).

- [ ] **Step 6: 전체 검증**

Run: `cd /Users/haneul/Projects/pourover-work && bun run typecheck && bun run test:run && bun run build`
Expected: 전부 성공.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore(brewing): 컵 메타포 잔재 정리 — useFillRatio/일시정지/리퀴드·링 토큰 삭제"
```

---

### Task 5: 수동 검증 (실기기 감각 확인)

**Files:** 없음 (검증만).

- [ ] **Step 1: dev 서버로 실제 흐름 확인**

Run: `cd /Users/haneul/Projects/pourover-work && bun run dev`

체크리스트 (레시피 하나로 브루잉 시작):

1. 시작 직후 액센트 배경 + 큰 `30g`(bloom) 표시.
2. 탭 → 차분한 배경 + `0:XX` 카운트다운 + `다음 · 1차 150g`.
3. 다음 푸어 5초 전 배경이 서서히 액센트로 물듦 (소리 리드인과 동시).
4. 경계 도달 시 pour 화면 자동 전환 + 소리/진동 큐.
5. 길게 누르기(600ms) → 중단 다이얼로그. 계속하기 → 시계가 흐르고 있었음.
6. 하단 `길게 눌러 중단` 탭 → 다이얼로그.
7. 마지막 푸어 → 탭 → 드로우다운 카운트다운 → 완료 시 Complete 화면 전환.
8. 다크 모드 토글 후 1–4 재확인 (pour/wait 색 대비).
9. 팔 뻗은 거리(~60cm)에서 큰 숫자와 배경색 구분이 읽히는지.

- [ ] **Step 2: 이상 발견 시 수정 후 커밋, 없으면 완료 보고**

발견된 시각/타이밍 미세 조정은 토큰 값 수정으로 해결(컴포넌트 수정 금지 원칙). 조정 시:

```bash
git add -A
git commit -m "polish(brewing): 수동 검증 피드백 반영 (토큰 값 조정)"
```

---

## Self-Review 결과 (플랜 작성자 체크)

- **스펙 커버리지**: 상태 모델(Task 1), 화면/토큰(Task 2·3·4), 인터랙션 탭/길게 누르기/일시정지 폐기(Task 3), 삭제 목록(Task 4), 테스트(각 태스크 + Task 4 Step 6), 수동 검증(Task 5). 스펙의 "drawdown 탭 = 완료"·"리드인 물듦"·"aria-label 동적"·"음소거 유지" 모두 태스크에 존재.
- **의도적 스펙 보강 1건**: 하단 힌트를 캡션이 아닌 실제 버튼으로 — 키보드/스크린리더 사용자의 중단 경로 확보 (스펙의 접근성 원칙에 부합).
- **타입 일관성**: `brewPhase` 시그니처(Task 1 Produces)와 Task 3 호출부 일치. `useElapsed` 단일 파라미터 전환은 Task 3에서 두 번째 인자 생략 호출 → Task 4에서 시그니처 정리 (기존 시그니처의 두 번째 인자는 optional이라 중간 상태도 컴파일 됨).
