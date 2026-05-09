# TODO

다음 세션에서 고를 작업 메뉴. 현재 상태와 배경을 여기에 담음.

## 현재 지점

- **계산기 + 브랜드 1·2차 + 4-스크린 리추얼 플로우(Wall → Recipe → Brewing → Complete → Wall) + View Transitions API 전이(A1) 완료.**
- **테스트 126개 / 15 파일**, `bun run typecheck` / `bun run test:run` / `bun run build` 모두 green.
- 데스크톱(1200×900) + 모바일(390×844) Playwright 시각 QA로 전 플로우 통과.
- 브라우저 tab title / index.html `<title>`: `핸드드립 계산기`.
- 정적 SPA, 서버 없음, 아직 배포 전.

### 주요 커밋 그룹 (최신 → 과거)

| 그룹                  | 대표 커밋                                  | 내용                                                      |
| --------------------- | ------------------------------------------ | --------------------------------------------------------- |
| 브랜드 정리           | `bebe82d`, `8b9e75f`, `8b475ca`            | '뜸' 브랜드 드롭 + screen 모션 토큰 분리 + font-smoothing |
| A1 View Transitions   | `391baa9`, `6625fbb`, `de548e1`            | fix + impl + plan                                         |
| Phase 4 Complete      | `da9eede`, `993f0b9`, `2f237a3`            | fix + impl + plan                                         |
| Phase 3 Wall          | `e875317`, `e7f55cd`, `f5bbada`, `0cbbf51` | fix + impl + plan + followups 추가                        |
| Phase 2 Brewing+Timer | `b76b6b4` 등                               | fix + impl + plan (D1 타이머 본체)                        |
| Phase 0~1             | `5485c96` 등                               | AppRoot + Recipe 재설계                                   |
| Brand 2차             | `b897f29`                                  | UI 라벨 한국어 로컬라이즈                                 |
| Brand 1차 + 최초 앱   | `5080a5f`, `198e3e8`                       | 토큰 + 최초 앱                                            |

### 관련 문서

- `CLAUDE.md` — 프로젝트 규약 (domain/UI 분리, branded types, 플러그인 레지스트리, 토큰 단일 출처)
- `docs/brand.md` — 브랜드 원본 문서 (★ "뜸" 네이밍은 드롭되었으나 보이스·톤·비주얼 원칙은 여전히 유효)
- `docs/design-tokens.md` — 토큰 시스템 설명
- `docs/design_handoff/README.md` + `reference/wall-flow.jsx` — 4-스크린 핸드오프 (Claude Design 산출물)
- `docs/superpowers/specs/2026-04-19-brewing-flow-design.md` — 리추얼 플로우 스펙
- `docs/superpowers/plans/*` — 각 Phase / A1 구현 플랜 (총 6개)
- `docs/superpowers/followups.md` — 이월 minor 이슈 목록 (11개)

## 보류 결정 (기록용)

- **브랜드 3차 마감 (타이틀 교체 / Segmented shadow 제거 / 초기화 버튼 숨김)** — 불필요로 판단, 스킵.
- **"뜸" 브랜드 네이밍 드롭** (2026-04-19) — 네이밍 자체가 어색. Wall 타이틀은 `핸드드립 계산기`(text-2xl), Brewing 레이블은 `bloom`으로 일반화. 브랜드 보이스·톤·비주얼 원칙 자체는 여전히 유효 (`brand.md`의 3색 원칙, 느린 모션, 침묵 기본 등). 문서(brand.md, spec/plan/handoff 등)는 작업 히스토리라 유지.
- 메서드 설명/노트는 brand.md의 짧은 버전이 아니라 기존(더 정확함) 유지.
- bloom 배지·고유명사(Kasuya/Hoffmann/Kalita Wave)는 원어 유지 — 브랜드 과잉 푸시 회피.
- Phase 1 시작 전 servings 모드(by-coffee/by-servings 토글) 제거 — 핸드오프에 없고 침묵 원칙과 맞음.
- 완료/중단 destination: Phase 2→Recipe, Phase 3→Wall, Phase 4→Complete가 완료 경로를 가로채고 최종 Wall로 복귀.

## 토큰 현황 요약

- **색**: `--neutral-0~950` (ivory→espresso) + `--accent-50~900` (ochre). Semantic: surface/border/text/accent/pour/timeline/wall/focus/danger/warning/success.
- **모션 2종**:
  - `--motion-duration-base: 320ms` + `--motion-easing: cubic-bezier(0.2, 0.8, 0.2, 1)` — 일반 UI(hover, segmented).
  - `--motion-duration-screen: 600ms` + `--motion-easing-screen: cubic-bezier(0.34, 1.12, 0.36, 1)` — View Transitions 전용 (살짝 overshoot로 생기).
- **폰트**: Pretendard Variable (한글) + Inter (라틴) + system fallbacks. `font-feature-settings: 'ss01', 'ss02'`. 여러 곳에 `tabular-nums`. **Mono 폰트는 미도입** — 옵션 메뉴 C6 참고.
- **prefers-reduced-motion**: VT 전이 + 애니메이션 전역 비활성화 가드 있음.

---

## 옵션 메뉴

### A. 후속 마일스톤 (design-handoff Phase 5 잔여)

~~**A1. View Transitions**~~ — **완료 (commits `de548e1`, `6625fbb`, `391baa9`)**.

**A2. Share PNG 카드 + Web Share API** — Square 1080×1080 / Story 1080×1920 두 포맷 렌더링. 현재 Complete의 `공유` 버튼 disabled → 활성화. Canvas 또는 html2canvas 라이브러리 도입. 네이티브 공유 시트(Web Share API Level 2) 연동. 아이콘·워터마크 디자인 결정 필요.

### B. 운영 / 배포

**B1. README** — 외부인용 최소 설명 + 실제 배포 URL.

**B2. 배포 (Vercel / Cloudflare Pages)** — 공유 URL이 실제 공유되려면 필요. 정적 SPA이므로 설정 단순.

**B3. PWA / 오프라인** — `vite-plugin-pwa` + manifest + 앱 아이콘. 부엌 wifi 불안정 시나리오와 브랜드 침묵 원칙에 맞음. 작업량: 중. 아이콘 디자인 결정 필요 (현재 favicon은 ☕ 이모지 — brand.md § 이모지 금지와 충돌, 교체해야).

### C. 기술 부채 / 품질

**C1. Dark mode 값 확정** — 현재 skeleton만 (`--neutral-800` 등 상속). brand가 light만 정의. 디자인 결정 필요.

**C2. Hoffmann grind 규칙 리서치** — 현재 boolean OR 해석(주석에 명시). Hoffmann 원전 재확인 후 필요 시 가산 방식으로 교체. `grindFor` 함수만 수정.

**C3. Kalita sweet/strong rounding 비대칭** — `[3,5,5,3]` 패턴 + drift-to-last-pulse가 `[53, 88, 88, 51]` 생성. 대칭 유지하는 정수 재분배 알고리즘(cumulative-target rounding) 검토.

**C4. E2E 테스트 (Playwright)** — 전 플로우 회귀 방지. Wall → Recipe → Brewing → Complete → Wall 사이클, URL 공유 링크 진입, 중단 경로, View Transitions 실제 동작 스냅샷 등.

**C5. Followups 일괄 처리** — `docs/superpowers/followups.md`의 11개 minor 이슈 (P1-M1~M4, P2-M1~M6, P3-M1) 중 "파일을 터치할 때 자연스럽게" 처리. 예: DripperPopover Escape 핸들러, BrewingScreen 섹션 분해, scrim 토큰 도입, aria-label 중복 정리 등.

**C6. 디스플레이 mono 폰트 도입 (선택)** — 큰 숫자(Brewing Hero 96px, Complete 총 시간 72px, 타이머 26px)에만 `font-mono` 적용. 후보: **IBM Plex Mono** (warm modern 결) 또는 **JetBrains Mono** (더 기하학적). brand.md가 "한 끗만" 허용한 범위. 작업량 적음.

### D. 도메인 확장

**D2. Approach B (파라미터 직접 조절)** — 고수용 toggle. RecipeScreen에 `PourEditor` 추가 + 도메인에 직접 빌드 경로 추가. 핸드오프의 `고급 ›` 링크가 진입점.

**D3. 프리셋 저장 / 원두 라이브러리 / 레시피 히스토리** — 서버 필요 또는 최소 localStorage 기반 로컬 히스토리. 현재 `bloom-coffee:session:v1`이 마지막 세션 1개만 저장하므로 확장 훅은 준비됨.

**D4. 새 메서드 추가** — `src/domain/methods/` 플러그인 패턴 그대로. 예: April V60, Tetsu 6-pour 등. UI 변경 없음.

_(D1 실시간 타이머는 Phase 2에서 완성 — `BrewingScreen`)_

---

## 추천 조합

- **실사용 겨냥**: B2 (배포) → B1 (README) → B3 (PWA)
- **마감 감 주기**: A2 (Share 카드) → B2 → B1
- **품질 다지기**: C4 (E2E) → C5 (followups) → C1 (dark mode)
- **시각 완성도**: C6 (mono 폰트) → C1 (dark mode)
- **도메인 확장 겨냥**: D4 (새 메서드) → D2 (Approach B)

---

## 다음 세션 시작 시

1. **이 문서 (`docs/TODO.md`) 읽기** — 현재 지점 · 보류 결정 · 옵션 메뉴 한 번에 복원.
2. **`CLAUDE.md` 재확인** — 프로젝트 규약.
3. **필요 시 깊은 맥락**:
   - 리추얼 플로우 아키텍처: `docs/superpowers/specs/2026-04-19-brewing-flow-design.md`
   - 특정 Phase 구현 상세: `docs/superpowers/plans/2026-04-19-brewing-flow-phase-{0-1|2|3|4}.md` 또는 `...view-transitions.md`
   - 브랜드 원칙(보이스·비주얼): `docs/brand.md` (★ "뜸" 네이밍만 드롭됐고 나머지는 여전히 유효)
   - 이월 minor 이슈: `docs/superpowers/followups.md`
4. `git log --oneline -20`으로 최근 커밋 확인 → 중단 지점 파악.
5. **옵션 선택 후 시작**. 큰 작업은 `superpowers:brainstorming` → `writing-plans` → `subagent-driven-development` 플로우가 확립되어 있음 (기존 Phase 구현 참고).

## 빠른 실행 명령

```bash
bun install          # 의존성
bun run dev          # 개발 서버
bun run typecheck    # 타입체크
bun run test:run     # 테스트 1회
bun run build        # 프로덕션 빌드
```
