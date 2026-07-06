# Brewing — "상태가 곧 화면" 리디자인 (부엌 타이머 모티프)

**Date:** 2026-07-06
**Status:** Design
**Scope:** `packages/domain/src/session.ts` (확장) + `apps/web/src/features/brewing/**` 재작성 + 토큰 + tests

## Context

현재 `BrewingScreen`은 "화면 전체가 컵" 메타포다 — 시간에 따라 리퀴드가 차오르고, 푸어 경계마다 링(수위선)이 그어지고, 히어로 블록에 목표 누적량·붓기 안내·리드인 카운트다운이 뜬다. #61(브루잉 큐)로 소리/진동 레이어까지 얹힌 상태.

사용자 피드백:

- **정보가 많아 한눈에 안 들어옴** — 링 마커·시간 라벨·히어로가 겹쳐, 물 붓는 중에 훑기 어렵다.
- **컵 메타포가 와닿지 않음** — 리퀴드 차오름은 예쁘지만 실제 브루잉 동작에 도움이 안 된다.

모티프는 **부엌 타이머**: 한 번에 한 정보, 즉물적 원-제스처, 모드 없음, 소리가 주인공. 타이머의 형태(다이얼)가 아니라 **동작 문법**을 가져온다.

## Goal

브루잉 화면을 상태 기반으로 재설계한다. 화면은 항상 브루잉의 현재 상태 하나만 표현하고, 큰 요소는 숫자 하나뿐이다. 멀리서는 **배경색**이 상태를 말하고(주변시야 감지), 다가가면 **숫자 하나**가 디테일을 말한다. 소리 큐(#61)가 주 채널이고 화면은 곁눈질 확인용.

- 탭(화면 아무 데나) = 한 칸 전진(재동기화). **탭 없이도 완주된다.**
- 길게 누르기 = 중단.
- 일시정지 폐기.
- 컵 메타포(리퀴드·링·수위선) 폐기.

## Non-Goals

- 큐 소리/진동 로직 변경 — #61 레이어(`cuesBetween`, `cuePlayer`, `useBrewCues`, `useCueMuted`, `haptics`)는 손대지 않는다.
- 레시피 도메인(메서드 compute, Pour 스키마) 변경 — `Pour`에 붓기 지속시간을 추가하지 않는다.
- 스케줄 시프트 — 탭은 화면 상태만 당긴다. 시계·큐 타임라인(atSec)은 불변.
- "왜" 한 줄 지식(제품 방향 #2), 슬림 진행 레일(접근 2) — 정보가 부족하다고 판단되면 후속 슬라이스로.
- Recipe / Complete / Wall 스크린, `AppRoot` 흐름 변경.

## Design

### 1. 상태 모델 (도메인 — `packages/domain/src/session.ts` 확장)

브루잉은 고정 시퀀스를 따른다: `pour(0) → wait → pour(1) → wait → … → pour(n-1) → drawdown → 완료`.

시퀀스 위의 위치를 정수 하나로 인코딩한다: **pos = 2·i가 pour(i), 2·i+1이 그 뒤의 wait** (마지막 `2·(n-1)+1`은 drawdown). 위치를 정하는 힘은 둘:

- **시계**: `clockPos = 2 · activeStepIdx(pours, elapsed)`. 경계 시각(atSec)마다 해당 pour로 강제 이동. 뒤로는 안 간다.
- **탭**: 현재 유효 위치에서 +1. `tapPos`는 UI 상태(React state)로 보관.

**유효 위치 = max(clockPos, tapPos).** 시계는 절대 멈추지 않고 큐도 스케줄대로 발화한다. 실수 탭은 다음 경계에서 시계가 자동 재동기화(자가 치유). 탭을 한 번도 안 하면 pour 상태만 순회하며 완주된다.

```ts
export type BrewPhase =
  | { readonly kind: "pour"; readonly stepIdx: number }
  | { readonly kind: "wait"; readonly nextIdx: number; readonly remainingSec: number }
  | { readonly kind: "drawdown"; readonly remainingSec: number };

// 유효 위치 max(clockPos, tapPos)를 BrewPhase로 해석. 순수 함수.
export const brewPhase = (
  pours: readonly Pour[],
  totalTimeSec: number,
  elapsed: number,
  tapPos: number,
): BrewPhase
```

**규칙:**

- `pos = max(2 * activeStepIdx(pours, elapsed), tapPos)`를 `2 * (pours.length - 1) + 1`(drawdown 위치)로 클램프해 해석. 단 `tapPos` 자체는 탭 핸들러가 최대 `2 * pours.length`(완료 신호)까지 올릴 수 있다 — 그 이상의 탭은 no-op.
- 짝수 pos → `{ kind: "pour", stepIdx: pos / 2 }`.
- 홀수 pos, 다음 푸어 존재 → `{ kind: "wait", nextIdx, remainingSec: pours[nextIdx].atSec - elapsed }`. `remainingSec`이 0 이하로 떨어지는 경우는 clockPos가 이미 추월하므로 발생하지 않는다.
- 홀수 pos, 다음 푸어 없음(마지막 pour 뒤) → `{ kind: "drawdown", remainingSec: max(0, totalTimeSec - elapsed) }`.
- 완료 판정은 기존과 동일하게 화면 레이어에서: `elapsed >= totalTimeSec || tapPos >= 2 * pours.length` → `onComplete`. (drawdown에서 탭 = 완료 처리 — "벌써 다 빠졌네" 케이스, 현행 건너뛰기와 동등.)

기존 `activeStepIdx` / `nextStepIdx` / `leadInCountdown` / `pourLabel` / `LEAD_IN_SEC` 재사용.

### 2. 화면 (상태별 렌더)

상태마다 화면 전체(배경 포함)가 바뀌고, 중앙 정보는 하나:

| 상태 | 배경 | 큰 숫자 (display-xl) | 보조 줄 (작게) |
|---|---|---|---|
| **pour** | 액센트 (`--color-brewing-state-pour-bg`) | `120g` — 목표 누적량 = 저울에서 볼 숫자 | `+60g · 2차` (마지막 푸어면 `· 마지막`, 블룸이면 `bloom` 라벨) |
| **wait** | 차분 (`--color-brewing-state-wait-bg`) | `0:23` — 다음 푸어까지 | `다음 · 3차 180g` (주전자 준비용 프리뷰) |
| **drawdown** | 차분 (wait와 동일) | `0:45` — 완료까지 | `드로우다운` |

- **리드인 시각화**: wait/pour 무관하게 다음 경계까지 `<= LEAD_IN_SEC`(5초)이면 배경이 액센트로 서서히 물든다(CSS transition, 소리 리드인 큐와 동일 타이밍). wait 상태에선 카운트다운 숫자가 이미 그 시간을 보여주고 있다.
- **구석 정보 (최소한)**: 좌상단 `2:34 / 3:30`(경과/총시간) + `3/5`(현재 스텝/전체). 우상단 음소거 토글(기존 `useCueMuted`). 하단 가장자리에 캡션 한 줄 `길게 눌러 중단`.
- 링·리퀴드·수위선·`FinishMarker`·히어로 겹침 계산 전부 삭제.

### 3. 인터랙션

- **탭 (화면 아무 데나)**: 유효 위치 +1. pour 중 = "다 부었어" → wait 카운트다운. wait 중 = "먼저 부을래" → 다음 pour. drawdown 중 = 완료. 화면 전체가 하나의 `<button>`이라 젖은 손등으로 툭 쳐도 된다.
- **길게 누르기 (600ms)**: `StopConfirmDialog` 오픈. pointer down/up 타이밍으로 판별하고, 길게 누르기로 판정된 제스처는 탭으로 세지 않는다.
- **일시정지 폐기**: `pausedAt` / `pauseOffsetMs` / `effectiveSession` 제거. 중단 다이얼로그가 떠 있어도 시계는 흐르고 큐도 발화(물은 계속 빠지니까). `useElapsed`는 `pausedAt` 파라미터 없는 시그니처로 단순화. `useBrewCues`의 `active`는 항상 `true`가 되지만 훅 API는 유지(#61 불변 원칙).
- **접근성**: 전체 화면 탭 영역은 실제 `<button>`, aria-label은 상태 따라 동적("붓기 완료", "다음 푸어로 건너뛰기", "브루잉 완료"). 기존 `AriaLiveStep`(aria-live 스텝 안내) 유지. 음소거·중단 다이얼로그 버튼은 기존 접근성 유지.

### 4. 토큰

`apps/web/src/ui/tokens/components/brewing.css` 재편 + `tailwind.config.ts` fontSize 확장. 컴포넌트 하드코딩 금지(Core Principle 4).

- **추가**: 상태 배경/전경 시맨틱 토큰 — `--color-brewing-state-pour-bg` / `-fg`, `--color-brewing-state-wait-bg` / `-fg` (light/dark 각각). 값은 `brand.md` 팔레트(커피 앰버 계열)에서 도출: pour = 따뜻한 액센트, wait = 차분한 뉴트럴. pour 배경 위 큰 숫자는 WCAG 대비 확보.
- **추가**: `display-xl` fontSize 토큰 — 현 최대 `heading-xl`(64px)보다 큰 글랜서블 스케일. `clamp()`로 뷰포트 반응(예: `clamp(96px, 28vw, 160px)`), tabular-nums 전제.
- **추가**: 배경 전환 모션 토큰(리드인 물듦용 duration/easing) — `motion.css` 체계에 편입.
- **정리**: 리퀴드/링/meniscus/rim 토큰(`--color-brewing-liquid-*`, `--color-ring-*`, `--color-meniscus-highlight`, `--color-text-on-liquid`, `--shadow-rim-inset`, `--shadow-cup-inset`, `--brewing-rim-height`, `--brewing-hero-gap`)은 이 화면 전용이므로 사용처 삭제와 함께 제거. 다른 사용처가 발견되면 남긴다.

### 5. 컴포넌트 / 파일

- **재작성**: `BrewingScreen.tsx` — 상태 머신 배선 + 상태별 프레젠테이션 컴포넌트 2–3개(`PourView`/`WaitView` 수준, 같은 파일 내 소컴포넌트로 시작). 447줄 → 절반 이하 목표(히어로/링 겹침 레이아웃 수학 전부 삭제).
- **삭제**: `useFillRatio.ts`, `RingMarker`, `FinishMarker`, 리퀴드 DOM, `topRingFallback` 계산.
- **수정**: `useElapsed.ts` (pause 파라미터 제거), `StopConfirmDialog.tsx` (일시정지 결합 제거 — "재개" 문구가 있으면 "계속"으로).
- **유지 (불변)**: `useBrewCues`, `cuePlayer`, `cueTones`, `haptics`, `useCueMuted`, `useScreenWakeLock`.
- **도메인**: `session.ts`에 `BrewPhase` + `brewPhase` 추가.

### 6. 데이터 흐름

```
session ──▶ useElapsed ──▶ elapsed ─┬─▶ brewPhase(pours, total, elapsed, tapPos) ──▶ 상태별 뷰
                                    ├─▶ useBrewCues (불변, 큐 발화)
                                    └─▶ 완료 판정 ──▶ onComplete
탭 ──▶ tapPos = 유효pos + 1 (상한 캡)
길게누르기 ──▶ StopConfirmDialog ──▶ onExit
```

## Testing

### 도메인 (`session.test.ts`에 추가)

`brewPhase`: 시작(블룸, elapsed=0) = pour(0) / 경계 전환(atSec 직전·직후) / 탭 전진 pour→wait→pour / 시계·탭 max 상호작용(탭이 앞선 뒤 시계 추월, 시계가 앞선 뒤 탭) / wait의 remainingSec 계산 / 마지막 pour 뒤 탭 = drawdown / drawdown remainingSec / 상한 캡(과다 탭) / 푸어 1개짜리 레시피.

### web (`BrewingScreen.test.tsx` 재작성)

- pour 상태: 목표 누적 g + 보조 줄 렌더. wait 상태: 카운트다운 + 다음 프리뷰. drawdown 렌더.
- 탭 → 상태 전진, drawdown 탭 → `onComplete`.
- 길게 누르기 → 중단 다이얼로그, 확인 → `onExit`, 취소 → 계속 (시계 미정지 확인).
- 길게 누르기가 탭으로 새지 않음.
- 음소거 토글 유지, aria-live 안내, 전체 화면 버튼 aria-label 동적 변경.
- 완료(`elapsed >= totalTimeSec`) → `onComplete` 1회.

메서드 스냅샷/invariants 스위프는 레시피 로직 무변경이므로 그대로.

## Open Risks

- **탭 오작동(주머니/물방울 터치)**: 탭은 화면 상태만 당기고 시계·큐는 불변이라 피해가 작고, 다음 경계에서 자동 복구된다. drawdown 중 탭만 완료로 이어지는데, 완료 화면에서 되돌아올 수 없다면 실제 사용에서 문제가 되는지 관찰 후 보완(예: drawdown 탭에만 이중 탭 요구).
- **정보 부족 가능성**: 레시피 전체 지형(다음에 뭐가 오는지)이 안 보인다. 사용해보고 부족하면 접근 2(슬림 진행 레일)를 후속 슬라이스로 얹는다 — 사용자와 합의된 경로.
- **길게 누르기 발견성**: 하단 캡션 한 줄로 해소 가정. 부족하면 첫 진입 시 힌트 강조 등 후속.
