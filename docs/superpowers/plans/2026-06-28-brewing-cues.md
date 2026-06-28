# Brewing Cues (소리/진동) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브루잉 중 푸어 시점을 소리·진동 큐로 알려, 화면을 보지 않아도 레시피 타이밍을 따라갈 수 있게 한다.

**Architecture:** 큐의 "언제 무엇을"은 도메인 순수 함수(`cuesBetween`, `leadInCountdown`)로, "실제 재생"은 web 부작용 모듈(`cuePlayer`/`haptics`)로 가른다. `BrewingScreen`은 기존 `elapsed`(250ms 틱) 위에 큐 훅·음소거 토글·카운트다운을 얹기만 한다.

**Tech Stack:** TypeScript(strict, `noUncheckedIndexedAccess`), React 19, Web Audio API, `navigator.vibrate` + iOS `<input switch>` 햅틱 트릭, Vitest 2 + jsdom, localStorage.

## Global Constraints

- `packages/domain/**`에서 React/DOM/localStorage/오디오 등 플랫폼 의존성 import 금지 — 순수 함수만 (Core Principle 1).
- 브랜디드 타입 직접 캐스팅 금지. 단 본 작업은 새 `Grams/Seconds` 값을 *생성*하지 않고 기존 `Pour.atSec`(Seconds)를 number로 비교만 한다 — 생성자 불필요.
- `noUncheckedIndexedAccess` 켜짐 → 배열 인덱싱은 `!` 또는 가드 필수.
- 모든 스타일 값은 `apps/web/src/ui/tokens.*` CSS 변수로만 (하드코딩 색/스페이싱 금지). 단 사운드 톤(주파수/길이/게인)은 시각 토큰이 아니라 `cueTones.ts` 상수로 정의.
- 어느 큐 채널(오디오/진동)도 불가한 환경(jsdom·구형·iOS 미지원)에서 throw 없이 조용히 no-op — 브루잉 흐름은 항상 정상 동작.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- 테스트 실행: 도메인 `bun run --filter @pourover/domain test:run`, web `bun run --filter @pourover/web test:run`. 타입체크 `bun run typecheck`.

## File Structure

- **확장** `packages/domain/src/session.ts` — `LEAD_IN_SEC`, `BrewCue`, `cuesBetween`, `leadInCountdown` 추가.
- **확장** `packages/domain/src/session.test.ts` — 위 함수 테스트 추가.
- **신규** `apps/web/src/features/brewing/cueTones.ts` — `ToneSpec`, `CUE_TONES`, `VIBRATE_PATTERNS` 상수.
- **신규** `apps/web/src/features/brewing/haptics.ts` + `haptics.test.ts` — `vibrate()`.
- **신규** `apps/web/src/features/brewing/cuePlayer.ts` + `cuePlayer.test.ts` — `createCuePlayer()`.
- **신규** `apps/web/src/features/brewing/useCueMuted.ts` + `useCueMuted.test.ts` — 음소거 영속 훅.
- **신규** `apps/web/src/features/brewing/useBrewCues.ts` + `useBrewCues.test.tsx` — 배선 훅.
- **수정** `apps/web/src/features/brewing/BrewingScreen.tsx` (+ 기존 `BrewingScreen.test.tsx`) — 토글·카운트다운·큐 훅 배선.

---

### Task 1: 도메인 — 큐 스케줄 순수 함수

**Files:**
- Modify: `packages/domain/src/session.ts` (끝에 추가)
- Test: `packages/domain/src/session.test.ts` (끝에 `describe` 추가)

**Interfaces:**
- Consumes: 기존 `Pour`(`{ index, atSec: Seconds, pourAmount, cumulativeWater, label? }`), 기존 `nextStepIdx(pours, elapsed): number | null`.
- Produces:
  - `LEAD_IN_SEC = 5` (number)
  - `BrewCue = { kind:"lead-in"; stepIdx:number } | { kind:"pour"; stepIdx:number } | { kind:"complete" }`
  - `cuesBetween(prev:number, cur:number, pours:readonly Pour[], totalTimeSec:number, leadInSec:number): BrewCue[]`
  - `leadInCountdown(elapsed:number, pours:readonly Pour[], leadInSec:number): number | null`

- [ ] **Step 1: 실패하는 테스트 작성** — `packages/domain/src/session.test.ts`. 파일 상단의 기존 `from "./session"` import 에 `cuesBetween, leadInCountdown, LEAD_IN_SEC` 를 추가하고(중복 import 문 만들지 말 것), 파일 끝에 다음 `describe` 들을 추가한다:

```ts
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
    expect(cuesBetween(42, 48, tight, s(210), 5)).toEqual([
      { kind: "pour", stepIdx: 2 },
    ]); // 43 lead-in 없음, 48 pour만
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
```

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/domain test:run`
Expected: FAIL — `cuesBetween is not a function` / `leadInCountdown is not a function` / `LEAD_IN_SEC` undefined.

- [ ] **Step 3: 구현** — `packages/domain/src/session.ts` 끝에 추가:

```ts
export const LEAD_IN_SEC = 5;

export type BrewCue =
  | { readonly kind: "lead-in"; readonly stepIdx: number }
  | { readonly kind: "pour"; readonly stepIdx: number }
  | { readonly kind: "complete" };

// 트리거 시각이 반열림 구간 (prev, cur] 안에 든 큐들을 시간순으로 반환.
// 블룸(atSec<=0)은 큐 없음. lead-in은 시작 후(>0)이고 직전 푸어 경계보다
// 앞서지 않을 때만(간격<leadInSec면 생략, pour 큐는 유지).
export const cuesBetween = (
  prev: number,
  cur: number,
  pours: readonly Pour[],
  totalTimeSec: number,
  leadInSec: number,
): BrewCue[] => {
  const out: { at: number; cue: BrewCue }[] = [];
  const inWindow = (t: number) => t > prev && t <= cur;

  for (let i = 0; i < pours.length; i++) {
    const at = pours[i]!.atSec;
    if (at <= 0) continue; // 블룸 / 시작 푸어
    const leadAt = at - leadInSec;
    const prevAt = i > 0 ? pours[i - 1]!.atSec : 0;
    if (leadAt > 0 && leadAt >= prevAt && inWindow(leadAt)) {
      out.push({ at: leadAt, cue: { kind: "lead-in", stepIdx: i } });
    }
    if (inWindow(at)) {
      out.push({ at, cue: { kind: "pour", stepIdx: i } });
    }
  }
  if (inWindow(totalTimeSec)) {
    out.push({ at: totalTimeSec, cue: { kind: "complete" } });
  }
  out.sort((a, b) => a.at - b.at);
  return out.map((o) => o.cue);
};

// 다음 푸어까지 남은 정수 초 — 단 lead-in 창(1..leadInSec) 안일 때만, 아니면 null.
// 히어로의 3·2·1 시각 카운트다운용.
export const leadInCountdown = (
  elapsed: number,
  pours: readonly Pour[],
  leadInSec: number,
): number | null => {
  const next = nextStepIdx(pours, elapsed);
  if (next === null) return null;
  const remaining = pours[next]!.atSec - elapsed;
  return remaining >= 1 && remaining <= leadInSec ? remaining : null;
};
```

- [ ] **Step 4: 통과 확인**

Run: `bun run --filter @pourover/domain test:run`
Expected: PASS (모든 신규 + 기존 테스트).

- [ ] **Step 5: 커밋**

```bash
git add packages/domain/src/session.ts packages/domain/src/session.test.ts
git commit -m "feat(domain): 브루잉 큐 스케줄 cuesBetween/leadInCountdown

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 진동 — `haptics.ts`

**Files:**
- Create: `apps/web/src/features/brewing/haptics.ts`
- Test: `apps/web/src/features/brewing/haptics.test.ts`

**Interfaces:**
- Produces: `vibrate(pattern: readonly number[]): void`
- 안드로이드/지원 브라우저는 `navigator.vibrate`, iOS Safari(미지원)는 숨김 `<label><input type="checkbox" switch></label>` 토글로 햅틱 1회. 둘 다 불가면 no-op.

- [ ] **Step 1: 실패하는 테스트 작성** — `haptics.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "./haptics";

describe("vibrate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error 테스트 정리
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  it("navigator.vibrate 가 있으면 그것을 패턴과 함께 호출", () => {
    const spy = vi.fn(() => true);
    (navigator as { vibrate?: unknown }).vibrate = spy;
    vibrate([60, 50, 60]);
    expect(spy).toHaveBeenCalledWith([60, 50, 60]);
  });

  it("navigator.vibrate 가 없으면 throw 없이 폴백 — 숨김 switch label 을 click", () => {
    // jsdom: navigator.vibrate 없음. 폴백이 label.click() 호출하는지 spy.
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click");
    expect(() => vibrate([40])).not.toThrow();
    expect(clickSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: FAIL — `Cannot find module './haptics'`.

- [ ] **Step 3: 구현** — `haptics.ts`:

```ts
// iOS Safari 는 navigator.vibrate 미지원. <input type="checkbox" switch> 를
// 프로그램적으로 토글하면 단일 햅틱 틱이 발생하는 트릭으로 폴백한다.
let switchLabel: HTMLLabelElement | null = null;

function ensureSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (switchLabel) return switchLabel;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  Object.assign(label.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", ""); // iOS switch control
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  switchLabel = label;
  return label;
}

export function vibrate(pattern: readonly number[]): void {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as { vibrate?: (p: number | number[]) => boolean })
      : undefined;
  if (nav && typeof nav.vibrate === "function") {
    try {
      nav.vibrate([...pattern]);
      return;
    } catch {
      // 폴백으로
    }
  }
  const label = ensureSwitch();
  if (label) {
    try {
      label.click();
    } catch {
      // no-op
    }
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/brewing/haptics.ts apps/web/src/features/brewing/haptics.test.ts
git commit -m "feat(brewing): 진동 큐 haptics (안드로이드 + iOS switch 폴백)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 사운드 토큰 + 재생기 — `cueTones.ts` / `cuePlayer.ts`

**Files:**
- Create: `apps/web/src/features/brewing/cueTones.ts`
- Create: `apps/web/src/features/brewing/cuePlayer.ts`
- Test: `apps/web/src/features/brewing/cuePlayer.test.ts`

**Interfaces:**
- Consumes: `BrewCue`(domain), `vibrate`(Task 2).
- Produces:
  - `cueTones.ts`: `ToneSpec`, `CUE_TONES: Record<BrewCue["kind"], ToneSpec>`, `VIBRATE_PATTERNS: Record<BrewCue["kind"], readonly number[]>`
  - `cuePlayer.ts`: `CuePlayer = { unlock():void; play(kind:BrewCue["kind"], muted:boolean):void }`, `createCuePlayer(): CuePlayer`

- [ ] **Step 1: `cueTones.ts` 작성** (테스트 전 — 순수 상수, 테스트는 player에서):

```ts
import type { BrewCue } from "@pourover/domain/session";

export type ToneSpec = {
  readonly freqHz: readonly number[]; // 순차 재생할 음들
  readonly toneMs: number; // 각 음 길이
  readonly gapMs: number; // 음 사이 간격
  readonly peakGain: number; // 0..1
};

// 셋은 귀로 구분되게: 예고=낮고 짧게, 본 큐=또렷한 두 음, 완료=부드러운 하행.
export const CUE_TONES: Record<BrewCue["kind"], ToneSpec> = {
  "lead-in": { freqHz: [440], toneMs: 90, gapMs: 0, peakGain: 0.18 },
  pour: { freqHz: [660, 880], toneMs: 110, gapMs: 70, peakGain: 0.3 },
  complete: { freqHz: [880, 660, 440], toneMs: 140, gapMs: 40, peakGain: 0.22 },
};

export const VIBRATE_PATTERNS: Record<BrewCue["kind"], readonly number[]> = {
  "lead-in": [40],
  pour: [60, 50, 60],
  complete: [120],
};
```

- [ ] **Step 2: 실패하는 테스트 작성** — `cuePlayer.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createCuePlayer } from "./cuePlayer";
import * as haptics from "./haptics";

describe("createCuePlayer (jsdom: AudioContext 없음)", () => {
  it("play 는 throw 없이 동작하고 진동을 울린다 (오디오는 no-op)", () => {
    const spy = vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const player = createCuePlayer();
    expect(() => player.play("pour", false)).not.toThrow();
    expect(spy).toHaveBeenCalledWith([60, 50, 60]);
    spy.mockRestore();
  });

  it("muted=true 여도 진동은 울린다 (소리만 끔)", () => {
    const spy = vi.spyOn(haptics, "vibrate").mockImplementation(() => {});
    const player = createCuePlayer();
    player.play("lead-in", true);
    expect(spy).toHaveBeenCalledWith([40]);
    spy.mockRestore();
  });

  it("unlock 은 throw 하지 않는다", () => {
    const player = createCuePlayer();
    expect(() => player.unlock()).not.toThrow();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: FAIL — `Cannot find module './cuePlayer'`.

- [ ] **Step 4: 구현** — `cuePlayer.ts`:

```ts
import type { BrewCue } from "@pourover/domain/session";
import { CUE_TONES, VIBRATE_PATTERNS, type ToneSpec } from "./cueTones";
import { vibrate } from "./haptics";

export type CuePlayer = {
  readonly unlock: () => void;
  readonly play: (kind: BrewCue["kind"], muted: boolean) => void;
};

function getAudioCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function createCuePlayer(): CuePlayer {
  const Ctor = getAudioCtor();
  let ctx: AudioContext | null = null;

  const ensureCtx = (): AudioContext | null => {
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const playTone = (spec: ToneSpec): void => {
    const ac = ensureCtx();
    if (!ac) return;
    let t = ac.currentTime;
    const dur = spec.toneMs / 1000;
    for (const freq of spec.freqHz) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(spec.peakGain, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur + spec.gapMs / 1000;
    }
  };

  return {
    unlock: () => {
      const ac = ensureCtx();
      if (!ac) return;
      // 무음 blip 으로 iOS 제스처 잠금 해제
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.01);
    },
    play: (kind, muted) => {
      if (!muted) playTone(CUE_TONES[kind]);
      vibrate(VIBRATE_PATTERNS[kind]);
    },
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/features/brewing/cueTones.ts apps/web/src/features/brewing/cuePlayer.ts apps/web/src/features/brewing/cuePlayer.test.ts
git commit -m "feat(brewing): Web Audio 큐 재생기 + 사운드 토큰

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 음소거 영속 훅 — `useCueMuted.ts`

**Files:**
- Create: `apps/web/src/features/brewing/useCueMuted.ts`
- Test: `apps/web/src/features/brewing/useCueMuted.test.ts`

**Interfaces:**
- Produces: `useCueMuted(): readonly [boolean, () => void]` — `[muted, toggle]`. localStorage 키 `pourover.cue.muted`, 기본 `false`.

- [ ] **Step 1: 실패하는 테스트 작성** — `useCueMuted.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useCueMuted } from "./useCueMuted";

describe("useCueMuted", () => {
  afterEach(() => localStorage.clear());

  it("기본값은 false (ON)", () => {
    const { result } = renderHook(() => useCueMuted());
    expect(result.current[0]).toBe(false);
  });

  it("토글하면 true 가 되고 localStorage 에 영속", () => {
    const { result } = renderHook(() => useCueMuted());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("pourover.cue.muted")).toBe("true");
  });

  it("재마운트 시 영속값을 읽는다", () => {
    localStorage.setItem("pourover.cue.muted", "true");
    const { result } = renderHook(() => useCueMuted());
    expect(result.current[0]).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: FAIL — `Cannot find module './useCueMuted'`.

- [ ] **Step 3: 구현** — `useCueMuted.ts`:

```ts
import { useCallback, useState } from "react";

const KEY = "pourover.cue.muted";

function readMuted(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function useCueMuted(): readonly [boolean, () => void] {
  const [muted, setMuted] = useState<boolean>(readMuted);
  const toggle = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // 영속 실패해도 세션 내 토글은 동작
      }
      return next;
    });
  }, []);
  return [muted, toggle] as const;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/brewing/useCueMuted.ts apps/web/src/features/brewing/useCueMuted.test.ts
git commit -m "feat(brewing): 음소거 영속 훅 useCueMuted

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 배선 훅 — `useBrewCues.ts`

**Files:**
- Create: `apps/web/src/features/brewing/useBrewCues.ts`
- Test: `apps/web/src/features/brewing/useBrewCues.test.tsx`

**Interfaces:**
- Consumes: `cuesBetween`, `LEAD_IN_SEC`(domain), `Pour`(domain), `CuePlayer`(Task 3).
- Produces: `useBrewCues(args: { elapsed:number; pours:readonly Pour[]; totalTimeSec:number; player:CuePlayer; muted:boolean; active:boolean }): void`
- 동작: `prevElapsed` ref 추적. `elapsed`가 증가할 때 `active`면 `cuesBetween(prev, elapsed, …)`의 각 큐를 `player.play(kind, muted)`로 디스패치. 활성 여부와 무관하게 `prevElapsed`는 증가분만큼 갱신(재개 시 과거 큐 몰림 방지). `muted`는 ref로 읽어 토글이 effect 재실행을 유발하지 않게 한다.

- [ ] **Step 1: 실패하는 테스트 작성** — `useBrewCues.test.tsx`:

```ts
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { s, g } from "@pourover/domain/units";
import type { Pour } from "@pourover/domain/types";
import type { CuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";

const pours: Pour[] = [
  { index: 0, atSec: s(0), pourAmount: g(30), cumulativeWater: g(30), label: "bloom" },
  { index: 1, atSec: s(45), pourAmount: g(120), cumulativeWater: g(150) },
];

function mkPlayer(): CuePlayer & { play: ReturnType<typeof vi.fn> } {
  return { unlock: vi.fn(), play: vi.fn() };
}

describe("useBrewCues", () => {
  it("elapsed 가 lead-in/pour 경계를 넘으면 player.play 를 순서대로 호출", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: false, active: true }),
      { initialProps: { elapsed: 39 } },
    );
    rerender({ elapsed: 40 }); // lead-in@40
    rerender({ elapsed: 45 }); // pour@45
    expect(player.play.mock.calls).toEqual([
      ["lead-in", false],
      ["pour", false],
    ]);
  });

  it("active=false 면 큐를 울리지 않되 prev 는 갱신 (재개 후 과거 큐 미발화)", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed, active }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: false, active }),
      { initialProps: { elapsed: 39, active: false } },
    );
    rerender({ elapsed: 46, active: false }); // 정지 중 40,45 통과 — 침묵
    rerender({ elapsed: 47, active: true }); // 재개 — 이미 지난 큐 안 울림
    expect(player.play).not.toHaveBeenCalled();
  });

  it("muted 를 인자로 전달", () => {
    const player = mkPlayer();
    const { rerender } = renderHook(
      ({ elapsed }) =>
        useBrewCues({ elapsed, pours, totalTimeSec: 210, player, muted: true, active: true }),
      { initialProps: { elapsed: 44 } },
    );
    rerender({ elapsed: 45 });
    expect(player.play).toHaveBeenCalledWith("pour", true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: FAIL — `Cannot find module './useBrewCues'`.

- [ ] **Step 3: 구현** — `useBrewCues.ts`:

```ts
import { useEffect, useRef } from "react";
import { cuesBetween, LEAD_IN_SEC } from "@pourover/domain/session";
import type { Pour } from "@pourover/domain/types";
import type { CuePlayer } from "./cuePlayer";

type Args = {
  readonly elapsed: number;
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly player: CuePlayer;
  readonly muted: boolean;
  readonly active: boolean;
};

export function useBrewCues({
  elapsed,
  pours,
  totalTimeSec,
  player,
  muted,
  active,
}: Args): void {
  const prevRef = useRef(elapsed);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const prev = prevRef.current;
    if (elapsed === prev) return;
    if (elapsed > prev) {
      if (active) {
        for (const cue of cuesBetween(prev, elapsed, pours, totalTimeSec, LEAD_IN_SEC)) {
          player.play(cue.kind, mutedRef.current);
        }
      }
    }
    // 증가/감소 모두 prev 동기화 (감소는 클럭 리셋 — 큐 미발화)
    prevRef.current = elapsed;
  }, [elapsed, active, pours, totalTimeSec, player]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/brewing/useBrewCues.ts apps/web/src/features/brewing/useBrewCues.test.tsx
git commit -m "feat(brewing): elapsed→큐 배선 훅 useBrewCues

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: BrewingScreen 배선 — 토글 · 카운트다운 · 큐

**Files:**
- Modify: `apps/web/src/features/brewing/BrewingScreen.tsx`
- Test: `apps/web/src/features/brewing/BrewingScreen.test.tsx` (추가)

**Interfaces:**
- Consumes: `createCuePlayer`(Task 3), `useCueMuted`(Task 4), `useBrewCues`(Task 5), `leadInCountdown`/`LEAD_IN_SEC`(Task 1).
- Produces: 사용자 노출 동작 — RIM 음소거 토글 버튼(`aria-pressed`), 히어로 lead-in 카운트다운 텍스트, 마운트 시 오디오 unlock, 활성 중 큐 발화.

- [ ] **Step 1: 실패하는 테스트 작성** — `BrewingScreen.test.tsx` 끝(마지막 `})` 직전)에 추가. 기존 파일은 이미 `render/screen/fireEvent`, `makeSession`, fake timers 를 갖고 있으므로 그대로 재사용한다. 단 토글 영속 격리를 위해 `localStorage.clear()` 를 더한다:

```tsx
describe("BrewingScreen — 큐 음소거 토글", () => {
  afterEach(() => localStorage.clear());

  it("RIM 에 음소거 토글이 있고 클릭하면 aria-pressed 가 바뀐다", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const toggle = screen.getByRole("button", { name: /큐 소리/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
```

> 참고: 카운트다운/오디오 자체는 jsdom 타이머·AudioContext 제약으로 여기서 단위 검증하지 않는다 — 큐 발화는 Task 5(`useBrewCues`), 스케줄은 Task 1, 카운트다운 계산은 Task 1(`leadInCountdown`)에서 이미 커버. 여기선 토글의 접근성·동작만 검증한다. `aria-label`은 Task 6 Step 4에서 `muted ? "큐 소리 켜기" : "큐 소리 끄기"` 이므로 `/큐 소리/` 로 매칭된다.

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/web test:run`
Expected: FAIL — `getByRole("button", { name: /소리.../ })` 없음.

- [ ] **Step 3: 구현 — import 및 훅 배선** — `BrewingScreen.tsx` 상단 import 추가:

```ts
import { activeStepIdx, leadInCountdown, LEAD_IN_SEC, pourLabel, type BrewSession } from "@pourover/domain/session";
import { createCuePlayer } from "./cuePlayer";
import { useBrewCues } from "./useBrewCues";
import { useCueMuted } from "./useCueMuted";
```

컴포넌트 본문, `useScreenWakeLock();` 아래에 추가:

```ts
  const player = useMemo(() => createCuePlayer(), []);
  const [muted, toggleMuted] = useCueMuted();
  useEffect(() => {
    player.unlock(); // 브루잉 진입 = 시작 탭 제스처 직후 → iOS 오디오 잠금 해제
  }, [player]);
```

`done` 계산 이후(이미 존재) 큐 훅·카운트다운 배선 추가:

```ts
  const cueActive = pausedAt === null && !done;
  useBrewCues({
    elapsed,
    pours,
    totalTimeSec,
    player,
    muted,
    active: cueActive,
  });
  const countdown = leadInCountdown(elapsed, pours, LEAD_IN_SEC);
```

- [ ] **Step 4: 구현 — RIM 토글 버튼** — RIM 헤더의 우측 버튼 그룹(`<div className="flex items-center gap-3">`, 건너뛰기/중단이 있는 곳) 맨 앞에 추가:

```tsx
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label={muted ? "큐 소리 켜기" : "큐 소리 끄기"}
            className="flex min-h-11 items-center px-2 text-caption-sm text-text-muted hover:text-text-secondary"
          >
            {muted ? "소리 꺼짐" : "소리"} <span aria-hidden>{muted ? "🔇" : "🔔"}</span>
          </button>
```

- [ ] **Step 5: 구현 — 히어로 카운트다운** — 히어로의 `지금 · {phaseLabelText}` 줄(드로우다운이 아닐 때) 아래, `+{active.pourAmount}g 붓기` 블록 근처에 카운트다운 표시 추가. `!isDrawdown && countdown !== null` 일 때:

```tsx
          {!isDrawdown && countdown !== null && (
            <div
              data-testid="lead-in-countdown"
              className="mt-1 text-caption-sm font-semibold tabular-nums text-pour-bloom"
            >
              곧 붓기 · {countdown}
            </div>
          )}
```

- [ ] **Step 6: 통과 확인 + 타입체크**

Run: `bun run --filter @pourover/web test:run`
Expected: PASS (신규 토글 테스트 + 기존 BrewingScreen 테스트).

Run: `bun run typecheck`
Expected: 에러 0.

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/features/brewing/BrewingScreen.tsx apps/web/src/features/brewing/BrewingScreen.test.tsx
git commit -m "feat(brewing): 큐 배선 — 음소거 토글·리드인 카운트다운·오디오 unlock

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 통합 검증 (전체 스위트 + 타입 + 빌드)

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트**

Run: `bun run test:run`
Expected: 모든 워크스페이스 PASS.

- [ ] **Step 2: 타입체크**

Run: `bun run typecheck`
Expected: 에러 0.

- [ ] **Step 3: 빌드**

Run: `bun run build`
Expected: 성공 (출력 `apps/web/dist`).

- [ ] **Step 4: 수동 확인 (dev 서버)**

Run: `bun run dev` → http://localhost:5173 → recipe(원두량 작게)에서 브루잉 시작.
확인: ① RIM 음소거 토글 보이고 눌리는지 ② 푸어 5초 전 히어로에 `곧 붓기 · 5…1` ③ 소리/진동 큐 ④ 음소거 시 소리만 꺼지고 카운트다운/진동 유지 ⑤ 중단(일시정지) 중 큐 침묵 ⑥ 완료 큐.

- [ ] **Step 5: (마무리)** superpowers:finishing-a-development-branch 로 PR/머지 처리.
