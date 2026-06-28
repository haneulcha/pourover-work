# Brewing — "안 봐도 되는" 큐 (소리/진동)

**Date:** 2026-06-28
**Status:** Design
**Scope:** `packages/domain/src/session.ts` (확장) + `apps/web/src/features/brewing/**` + tests

## Context

`BrewingScreen`은 이미 완성도 있는 실시간 가이드다 — 경과 시계, 차오르는 액체, 푸어별 링 마커, 현재 단계 히어로(`지금 · {bloom/N차}` + 누적 물량 + `+Xg 붓기`), 건너뛰기·중단·화면 깨우기·aria-live. 흐름은 `recipe → brewing → complete`.

그러나 **모든 안내가 시각뿐**이다. 사용자는 부을 때를 알려면 화면을 계속 봐야 한다. "동료"라면 고개를 들 시점을 *신호*로 알려, 화면에서 눈을 떼게 해야 한다. 지금은 단계 전환 큐(소리/진동)가 전혀 없다.

## Goal

브루잉 중 푸어 시점을 소리·진동으로 알리는 큐를 얹어, 사용자가 화면을 계속 보지 않아도 레시피 타이밍을 따라갈 수 있게 한다. 기존 타이머 골격은 그대로 두고 *얹기만* 한다.

큐 모델은 **리드인 + 경계**: 푸어 5초 전 예고(+ 화면 `3·2·1` 카운트다운), 푸어 시각에 본 큐, 브루 종료에 완료 큐.

## Non-Goals

- "왜"(위키 지식) 한 줄 띄우기 — 별도 슬라이스(제품 방향 #2).
- 음성 안내(TTS), 음악, 커스텀 사운드 업로드.
- 큐 시점/횟수를 세션 기록에 저장.
- Recipe / Complete / Wall 스크린 및 `AppRoot` 변경(오디오 unlock은 `BrewingScreen` 마운트에서 처리하므로 `AppRoot` 불변).
- 큐 타이밍을 건너뛰기(`manualStepFloor`)와 결합 — 큐는 레시피 클럭(atSec) 기준으로만 운다.

## Design

### 1. 도메인 — 순수 큐 스케줄 (`packages/domain/src/session.ts` 확장)

큐의 "언제 무엇을"은 순수 함수. Core Principle 1(도메인/UI 분리) 준수 — React/DOM/오디오 의존 없음.

```ts
export const LEAD_IN_SEC = 5;

export type BrewCue =
  | { readonly kind: "lead-in"; readonly stepIdx: number }
  | { readonly kind: "pour"; readonly stepIdx: number }
  | { readonly kind: "complete" };

// 트리거 시각이 반열림 구간 (prev, cur] 안에 든 큐들을 시간순으로 반환.
// prev < cur 가정(호출부에서 보장). 같은 초에 여러 큐가 걸리면 모두 반환.
export const cuesBetween = (
  prev: number,
  cur: number,
  pours: readonly Pour[],
  totalTimeSec: number,
  leadInSec: number,
): BrewCue[]
```

**트리거 시각 규칙:**

- 각 푸어 `p`(인덱스 `i`)에 대해 `p.atSec > 0`인 경우:
  - **pour 큐**: 트리거 = `p.atSec`.
  - **lead-in 큐**: 트리거 = `p.atSec - leadInSec`. 단 다음 두 조건을 모두 만족할 때만 방출:
    1. `p.atSec - leadInSec > 0` (브루 시작 전이 아님)
    2. `p.atSec - leadInSec >= pours[i-1].atSec` (직전 푸어 경계보다 앞서지 않음 — 간격 <5초인 드문 경우 lead-in 생략, pour 큐는 유지)
- **블룸(`atSec === 0`)**: lead-in·pour 둘 다 없음(시작과 동시에 이미 부음).
- **complete 큐**: 트리거 = `totalTimeSec`.

각 트리거 시각 `t`에 대해 `prev < t <= cur`이면 해당 큐를 결과에 포함. 결과는 트리거 시각 오름차순 정렬.

### 2. web — 부작용 레이어 (`apps/web/src/features/brewing/`)

#### `cueTones.ts` — 소리를 코드로 정의 (사운드 "토큰")

음을 주파수·길이·엔벨로프 상수로 정의. 토큰 철학과 동일("리디자인 = 값만 수정"). 셋은 귀로 구분되게:

```ts
export type ToneSpec = {
  readonly freqHz: readonly number[]; // 순차 재생할 음들
  readonly toneMs: number;            // 각 음 길이
  readonly gapMs: number;             // 음 사이 간격
  readonly peakGain: number;          // 0..1
};

export const CUE_TONES: Record<BrewCue["kind"], ToneSpec> = {
  "lead-in":  { freqHz: [440],      toneMs: 90,  gapMs: 0,  peakGain: 0.18 }, // 낮고 짧게 — 예고
  pour:       { freqHz: [660, 880], toneMs: 110, gapMs: 70, peakGain: 0.30 }, // 또렷한 두 음 — 본 큐
  complete:   { freqHz: [880, 660, 440], toneMs: 140, gapMs: 40, peakGain: 0.22 }, // 부드러운 하행 — 마무리
};

export const VIBRATE_PATTERNS: Record<BrewCue["kind"], readonly number[]> = {
  "lead-in": [40],
  pour:      [60, 50, 60],
  complete:  [120],
};
```

#### `haptics.ts` — 진동 (안드로이드 + iOS)

```ts
export const vibrate: (pattern: readonly number[]) => void
```

- 안드로이드/지원 브라우저: `navigator.vibrate(pattern)`.
- iOS Safari(navigator.vibrate 미지원): `<input>`/`<label switch>` 토글로 햅틱을 끌어내는 트릭. 구현 시 검증된 라이브러리/패턴을 선정해 적용(예: `<label><input type="checkbox" switch></label>`의 프로그램적 토글). DOM에 숨김 엘리먼트를 1회 마운트해 재사용.
- 어느 채널도 불가하면 조용히 no-op.

#### `cuePlayer.ts` — 재생기

```ts
export type CuePlayer = {
  unlock: () => void;                              // iOS 오디오 잠금 해제 (시작 탭에서 호출)
  play: (kind: BrewCue["kind"], muted: boolean) => void; // muted면 소리 skip, 진동은 유지
};
export const createCuePlayer: () => CuePlayer
```

- Web Audio `AudioContext` lazy 생성. `window.AudioContext`(또는 webkit 프리픽스) 없으면 오디오 no-op(jsdom·구형 가드).
- `unlock()`: AudioContext 생성 + `resume()` + peakGain 0짜리 무음 1회 → iOS 제스처 잠금 해제.
- `play(kind, muted)`: `muted`가 false면 `CUE_TONES[kind]`를 oscillator+gain 엔벨로프로 재생. 항상 `vibrate(VIBRATE_PATTERNS[kind])` 호출(음소거여도 진동은 살림).

#### `useCueMuted.ts` — 음소거 영속

```ts
export const useCueMuted: () => readonly [boolean, () => void] // [muted, toggle]
```

- localStorage 키 `pourover.cue.muted`(boolean). 기본 `false`(ON). 토글이 즉시 영속.

#### `useBrewCues.ts` — 배선 훅

```ts
export const useBrewCues: (args: {
  readonly elapsed: number;
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly player: CuePlayer;
  readonly muted: boolean;
  readonly active: boolean; // 일시정지/완료면 false → 큐 정지
}) => void
```

- `prevElapsed`를 `useRef`로 추적. `elapsed` 변할 때마다 `active`면 `cuesBetween(prev, elapsed, pours, totalTimeSec, LEAD_IN_SEC)`을 호출해 각 큐를 `player.play(kind, muted)`로 디스패치. 그 후 `prevElapsed = elapsed`.
- 비활성(`active=false`)이면 큐를 울리지 않되 `prevElapsed`는 갱신해 재개 시 과거 큐가 몰아서 터지지 않게 한다.

### 3. 데이터 흐름 & 기존 코드 접점

1. **시작 탭에서 unlock**: 플레이어 인스턴스는 `BrewingScreen` 마운트 시 `useMemo(createCuePlayer)`로 생성하고, mount effect에서 `player.unlock()`을 호출한다. 브루잉 진입 자체가 "브루잉 시작" 탭 제스처 직후라 iOS 오디오 잠금 해제가 유효하다. `AppRoot`는 건드리지 않는다.
2. `BrewingScreen`이 `useBrewCues({ elapsed, pours, totalTimeSec, player, muted, active })` 호출. `active = pausedAt === null && !done`.
3. **시각 카운트다운**: 히어로에 lead-in 창(`다음 푸어.atSec - elapsed <= LEAD_IN_SEC && > 0`) 동안 남은 정수 초(`3·2·1`)를 작게 표시. 소리 꺼도 눈으로 보이는 백업. `nextStepIdx`/링 데이터에서 다음 푸어 atSec 파생.
4. **음소거 토글**: RIM(건너뛰기·중단이 있는 줄)에 작은 토글 버튼. `useCueMuted` 값으로 아이콘 토글, `aria-pressed`/`aria-label` 부여. 소리만 끄고 진동 유지.
5. **일시정지/건너뛰기**: 일시정지(`pausedAt !== null`)면 `elapsed` 동결 → 새 크로싱 없음(+ `active=false`로 이중 차단). 건너뛰기(`manualStepFloor`)는 *시각만* 앞당기고 큐 타임라인(atSec)은 불변 — 큐 로직을 skip과 결합하지 않아 순수성 유지.

## Testing

### 도메인 (`packages/domain/src/session.test.ts`에 추가)

- `cuesBetween`: 구간 크로싱 감지(트리거가 `(prev, cur]`에 들 때만), 블룸 큐 없음, lead-in 근접 생략 룰(간격 <5초 → lead-in 빠지고 pour만), complete 큐, 한 구간에 여러 큐 동시 방출, 전 구간 스위프 시 큐 누락·중복 없음.

### web (`apps/web/src/features/brewing/`)

- `useBrewCues`: 가짜 elapsed 진행 + mock player로 호출 순서/인자 검증, 비활성 시 침묵하되 prev 갱신, 재개 후 과거 큐 미발화.
- `cuePlayer`: `AudioContext` 부재(jsdom)에서 `play`가 throw 없이 no-op, `vibrate` 경로는 호출됨(mock).
- `useCueMuted`: localStorage 영속(토글 후 재마운트 시 유지), 기본 false.
- `haptics`: `navigator.vibrate` 있을 때 호출, 없을 때 iOS 폴백 경로/ no-op 가드.

## File Structure

- 확장: `packages/domain/src/session.ts` (`LEAD_IN_SEC`, `BrewCue`, `cuesBetween`)
- 신규: `apps/web/src/features/brewing/cueTones.ts`
- 신규: `apps/web/src/features/brewing/haptics.ts`
- 신규: `apps/web/src/features/brewing/cuePlayer.ts`
- 신규: `apps/web/src/features/brewing/useCueMuted.ts`
- 신규: `apps/web/src/features/brewing/useBrewCues.ts`
- 수정: `apps/web/src/features/brewing/BrewingScreen.tsx` (큐 훅·토글·카운트다운 배선)
- 테스트: 위 각 모듈 옆 `*.test.ts(x)`

## Open Risks

- **iOS 햅틱 트릭**: input/switch 햅틱은 비공식 동작이라 iOS 버전에 따라 약하거나 무력화될 수 있다. 소리가 주 채널이므로 진동 실패는 degrade-gracefully(앱은 정상 동작). 구현 시 실제 기기 검증 필요.
- **오디오 unlock 타이밍**: 브루잉 진입이 탭 제스처 직후가 아닌 경로(예: 자동 진입)가 생기면 iOS에서 첫 큐가 무음일 수 있다. 현재 흐름은 항상 사용자 탭 → 안전.
