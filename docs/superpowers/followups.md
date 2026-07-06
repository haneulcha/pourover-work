# Follow-ups — 이월된 minor 이슈

Phase 별 리뷰에서 **Critical/Important가 아닌 minor**로 분류되어 다음 마일스톤 이후로 이월된 항목들. 각 항목이 직접 관련된 Phase가 끝난 뒤 한꺼번에 정리하거나, 해당 파일을 터치하는 다른 작업이 생길 때 자연스럽게 처리.

---

## Phase 1 (Recipe 스크린) 이월

출처: `b897f29 feat: UI 라벨 로컬라이즈` 이후 Phase 1 리뷰 (`5485c96`까지 반영된 상태).

### P1-M1. `DripperPopover` 키보드 접근성

- **파일**: `src/features/recipe/DripperPopover.tsx`
- **내용**: Escape 키로 닫기 핸들러 없음, focus trap 없음, 닫힘 시 이전 포커스 복귀 없음.
- **영향**: 키보드 사용자가 popover를 탭 네비게이션으로만 닫을 수 있음. 모바일 위주라 당장 큰 문제 아님.
- **처리 제안**: `useEffect`로 `keydown` 리스너 추가 + `inert`/focus trap 라이브러리 또는 수동 구현. Phase 5 (Share) 또는 접근성 사이클에서 일괄 점검.

### P1-M2. `popoverOptions` 매 렌더마다 재계산

- **파일**: `src/features/recipe/RecipeScreen.tsx`
- **내용**: `dripperList.map(...)` 등 정적 데이터가 렌더마다 새 배열로 빌드됨.
- **영향**: 현재 2개 아이템이라 무의미. 향후 드리퍼 추가 시 스케일 문제.
- **처리 제안**: 모듈 스코프 상수로 승격하거나 `useMemo([])`. 드리퍼 plugin registry에 추가할 때 함께 정리.

### P1-M3. `clearParams` export 현재 미사용

- **파일**: `src/features/share/storage.ts`
- **내용**: Phase 1에서 `초기화` 버튼 제거 후 `clearParams`는 호출 없음.
- **영향**: Dead code (tree-shake로 번들에선 제거됨).
- **처리 제안**: Phase 3/4에서 reset 플로우 재도입 예정이면 유지. 그렇지 않으면 삭제.

### P1-M4. `dripperById` 조회 헬퍼 없음

- **파일**: `src/features/recipe/RecipeScreen.tsx`, `src/domain/drippers.ts`
- **내용**: `dripperList.find((d) => d.id === dripper)?.name` 선형 스캔. 결과 `undefined` 시 silent fallthrough.
- **처리 제안**: `drippers` 객체가 이미 있으므로 `drippers[dripper].name` 으로 직접 접근 (현재 도메인에 exported record 있음).

---

## Phase 2 (Brewing + 타이머) 이월

출처: Phase 2 code quality review (b76b6b4 이후 상태).

### P2-M1. `done` vs `isComplete` 중복 정의

- **파일**: `src/features/brewing/BrewingScreen.tsx`
- **내용**: 도메인에 `isComplete(session, now)` 순수 헬퍼가 있으나, 컴포넌트에선 `const done = elapsed >= totalTimeSec` 로 별도 계산.
- **영향**: 진실의 소스 2개. 완료 조건이 바뀌면 두 곳 모두 수정 필요.
- **처리 제안**: `BrewingScreen`에서 `isComplete(session, Date.now())` 또는 `elapsed >= recipe.totalTimeSec`를 통과시키는 어댑터로 도메인 헬퍼 재사용.

### P2-M2. Progress rail `0차` latent edge case

- **파일**: `src/features/brewing/BrewingScreen.tsx`
- **내용**: `p.label === 'bloom' ? '뜸' : \`${i}차\``. 현재 모든 메서드의 첫 푸어가 `bloom`라벨이라`0차`가 렌더되지 않지만, 향후 non-bloom 첫 푸어를 가진 레시피가 추가되면 `0차`가 노출.
- **처리 제안**: `i === 0 && !p.label === 'bloom'` 케이스 처리. 예: `i === 0 ? '시작' : \`${i}차\`` 또는 1-indexed 렌더.

### P2-M3. Non-null 단언 `pours[activeIdx]!` / `pours[nextIdx]!`

- **파일**: `src/features/brewing/BrewingScreen.tsx`
- **내용**: `activeStepIdx`가 빈 배열에도 0을 리턴하므로 `pours[0]`이 `undefined`일 때 `!` 단언이 크래시. 현재 `Recipe.pours`는 늘 비어있지 않지만 타입으로 강제되진 않음.
- **처리 제안**: `Recipe.pours`를 non-empty tuple 타입으로 refinement (`readonly [Pour, ...Pour[]]`), 또는 런타임 guard 추가.

### P2-M4. Scrim 색 하드코딩

- **파일**: `src/features/brewing/StopConfirmDialog.tsx`
- **내용**: `bg-[rgba(42,36,30,0.45)]` 아비트러리 값. 토큰 시스템에 scrim 색 없음.
- **처리 제안**: Phase 3/4에서 또 다른 overlay (Wall 드리퍼 시트 등)가 추가될 때 `--color-scrim` 토큰 도입 후 일괄 교체.

### P2-M5. `AriaLiveStep` mount 동작 주석 누락

- **파일**: `src/features/brewing/BrewingScreen.tsx`
- **내용**: `useState('')` 초기 빈 문자열 → `useEffect`에서 set. 마운트 시 announce가 의도된 동작이지만 코드만 보면 "버그인가?" 혼동 가능.
- **처리 제안**: 한 줄 주석 추가 — "/// 의도적으로 mount 직후 빈 상태에서 effect로 첫 step announce를 트리거."

### P2-M6. `BrewingScreen.tsx` 컴포넌트 분해 여지

- **파일**: `src/features/brewing/BrewingScreen.tsx`
- **내용**: Hero / ProgressRail / NextPreview / 완료 UI가 한 파일 177줄에 모여 있음. 각 섹션이 독립 상태 없음.
- **처리 제안**: Phase 3에서 Wall 진입 전이 애니메이션 추가하거나 Phase 4에서 완료 UI를 Complete 스크린으로 옮길 때 섹션별로 쪼개면 자연스러움.

---

## Phase 3 (Wall 스크린) 이월

출처: Phase 3 code quality review (e875317 이후 상태).

### P3-M1. WallScreen 드리퍼 버튼의 `aria-label` 중복

- **파일**: `src/features/wall/WallScreen.tsx`
- **내용**: 버튼이 `aria-label={d.name}` + 내부에 가시 `<span>{d.name}</span>`을 동시에 보유. `DripperIcon`은 `aria-hidden="true"`라 라벨에 기여하지 않음. 결과적으로 accessible name은 동일하지만 override 경로 둘이 공존.
- **영향**: 기능 영향 없음. 단, 가시 텍스트 변경 시 aria-label과 drift할 수 있음.
- **처리 제안**: `aria-label` 제거하고 가시 span의 accessible name에 의존.

---

## Brewing 리디자인 (상태가 곧 화면) 이월

출처: brewing-timer-redesign 최종 리뷰 + 수동 검증 (a329d5c 이후 상태).

### BR-M1. bloom 라벨 없는 첫 푸어가 "0차"로 표기

- **파일**: `packages/domain/src/session.ts` (`pourLabel`)
- **내용**: `pourLabel`이 bloom 라벨 없는 푸어를 0-인덱스 그대로 "{idx}차"로 표기 → Kasuya 4:6 첫 푸어가 "지금 부어 · 0차". 기존 동작(구 화면도 동일)이지만 새 화면에서 라벨이 거대해져 어색함이 두드러짐.
- **영향**: 표기 어색함만. 기능 영향 없음.
- **처리 제안**: 1-인덱스("1차..n차")로 바꾸거나 첫 푸어 전용 표현 도입. `pourLabel` 사용처(aria-live 포함) 일괄 확인 필요.

### BR-M2. wait/drawdown 중 aria-live 문구가 푸어 목표를 계속 읽음

- **파일**: `apps/web/src/features/brewing/BrewingScreen.tsx` (`AriaLiveStep`)
- **내용**: wait/drawdown에서도 안내 문구가 "{n}차: {X}그램까지" 형태 — 화면은 카운트다운을 보여주는데 SR은 푸어 목표를 읽음.
- **영향**: SR 사용자에게 사소한 불일치. 경계 전환 안내 자체는 정확.
- **처리 제안**: phase-aware 문구 (wait: "다음 푸어까지 N초" 등) — 이 레이어를 다시 만질 때 함께.

---

## 관리 원칙

- 항목이 해결되면 삭제 (git history에 남음).
- 새 Phase 리뷰에서 발견된 minor는 같은 규칙으로 추가.
- Critical/Important 이슈는 해당 Phase 커밋 내에서 즉시 해결 — 이 파일에 들어오지 않음.
