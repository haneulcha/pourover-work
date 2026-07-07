# Handoff: tteum (뜸) — Pour-Over Wall Flow

> **Historical (2026-04).** 4-스크린 리추얼 플로우의 원본 핸드오프. 이후 실제 화면은 계속 진화했다 — 특히 §3 Brewing은 2026-07 v2 리디자인(`docs/superpowers/specs/2026-07-06-brewing-timer-redesign-design.md`)으로 대체됨. "뜸" 네이밍도 드롭됨 (`docs/decisions.md`). 현재 상태의 근거로 인용하지 말 것.

## Overview

**뜸**은 이미 존재하는 pour-over 앱 위에 얹을 **새 UI 껍데기**입니다. 이 핸드오프는 "집에서 한 잔"이라는 리추얼을 강조하는 조용한 vibe의 4-스크린 플로우를 정의합니다.

전제: 타이머 / 레시피 / 기록 기능은 이미 앱에 존재합니다. 이 문서는 **화면 구조, 정보 위계, 인터랙션, 톤**만 명세합니다.

---

## About the Design Files

`reference/` 폴더의 파일들은 **HTML/JSX로 그려진 디자인 레퍼런스**입니다 — 프로덕션 코드가 아니라 레이아웃과 의도를 보여주는 와이어프레임입니다.

실제 구현은 **기존 앱의 스택, 디자인 시스템, 컴포넌트 규약**을 따르세요. 손그림 스타일(wobbly 외곽선, Caveat 필기체, 종이 배경)은 **프로덕션에 그대로 옮기지 마세요** — 레이아웃과 위계 전달을 위한 도구일 뿐입니다.

---

## Fidelity

**Low-fidelity wireframe.**

- 레이아웃, 위계, 카피, 플로우: **그대로 구현**.
- 비주얼 스타일: 기존 앱의 디자인 시스템 사용.
- 스케치 글리프(드리퍼 SVG, feeling glyph 등)는 최종 아트웍이 아닌 **위치/크기 표시용 플레이스홀더**입니다.

---

## Screens / Views

플로우는 **4개의 핵심 화면** + 보조 요소 (popover, dialog, share card)로 구성됩니다. 모든 화면은 390×812 iOS viewport 기준입니다.

---

### 1. Wall — 홈 / 진입

파일: `reference/wall-flow.jsx` → `WallScreen`

**Purpose:** 앱을 열었을 때 첫 화면. "선반에서 도구를 집어든다"는 은유.

**Layout:**

- 배경: 벽 텍스처 (`#ede5d5`, 가로 banding 약간).
- **상단 (~40pt 아래):** 브랜드 마크 `뜸` 큼직하게 (44pt weight 500), 그 아래 필기체 `저만 믿고 따라오세요` (16pt, soft).
- **중앙 빈 공간** (breathing room).
- **하단 선반 (shelf):**
  - 드리퍼 2개가 선반 위에 나란히 — V60 (선택됨, 진한 stroke), Kalita (비선택, soft stroke).
  - 각 드리퍼 아래 이름 라벨: `V60`, `Kalita`.
  - 드리퍼 아래로 얇은 수평 선반 선 (plank).
  - 선반 아래 필기체 힌트: `커피 내릴 드리퍼를 들어볼까요?` (very faint).
- **최하단 (40pt 위):** 텍스트 링크 `레시피 먼저 보기 ›` — 작고 희미한 escape hatch.

**Interaction:**

- 드리퍼 탭 → Recipe 화면으로 전이 (morph 애니메이션: 드리퍼가 상단 앵커로 날아감, 벽이 페이드, 종이 캔버스가 아래에서 올라옴).
- 비선택 드리퍼 탭 시 그 드리퍼가 선택된 상태로 Recipe 진입.
- `레시피 먼저 보기 ›` 탭 → 기존 앱의 recipe 목록 화면 (이 핸드오프 범위 밖).

**Morph transition (optional):** `MorphTransitionScreen` 참고. 드리퍼가 선반 위치 → 상단 중앙 앵커로 이동하며 축소 (96 → 72pt), 벽이 40% 페이드, 종이 캔버스가 아래에서 radius 20 둥근 모서리로 올라옴. 총 ~350ms. 구현 난이도가 높으면 간단한 slide-up 전환으로 대체 가능.

---

### 2. Recipe — 레시피 (풀스크린)

파일: `reference/wall-flow.jsx` → `RecipeScreen`

**Purpose:** 레시피 조정 + 푸어 스케줄 미리보기 + 시작. 한 화면 안에 모두.

**Layout (위 → 아래):**

1. **Top bar** (padding 52pt top, 0 20 좌우):
   - Back chevron (18×14, soft ink).
   - 선택된 드리퍼 미니 SVG (56pt).
   - 제목 블록: `V60` (18pt, weight 500) / 하위 `Kasuya 4:6` (11pt, soft).
   - 우측 끝: `바꾸기 ›` (11pt, faint ink) — **드리퍼 변경 popover 트리거**.

2. **구분선** (sketch hairline).

3. **컨트롤 섹션** (padding 20 20, gap 12):
   - 각 행: `44pt label 칼럼` + `1fr 컨트롤` 그리드.
   - `커피`: Stepper (−/값/+), 기본 `20g`, 38pt tall.
   - `맛`: 3-segment control — `달게` / `균형`(선택) / `산뜻하게`, 34pt tall.
   - `강도`: 3-segment — `연하게` / `보통`(선택) / `진하게`.
   - `분쇄`: 3-segment — `가늘게` / `중간`(선택) / `굵게`.

4. **권장값 읽기 전용 줄** (10pt, 가운데 중점 구분):
   - `권장  90° · 1:15 · 3:30           고급 ›`
   - 좌측 `권장` 라벨 + 세 개의 값 (온도/비율/시간) + 우측 `고급 ›` escape (고급 설정 — 범위 밖).

5. **구분선.**

6. **푸어 스케줄 섹션** (남은 공간 flex-1):
   - 헤더: 좌 `푸어 스케줄` (11pt, faint, letter-spacing 0.5), 우 `300g · 3:30 · 4 pours` (12pt, soft).
   - **세로 푸어 프리뷰** — `PourVerticalPreview`: 시간이 위→아래로 흐름. 각 step은 `시간 | ● 노드 | 가로 막대(길이 ∝ Δg) | +Δg 라벨`. Bloom step은 ochre 강조 + 우측에 `뜸` 마커.

7. **시작 버튼** (하단 padding 12 20):
   - 56pt tall, radius 12, stroke 진한 ink (weight 1.6), 연한 fill.
   - 내용: play 삼각형 아이콘 + `시작` (18pt weight 500).

**Interaction:**

- `바꾸기 ›` 탭 → 드리퍼 변경 popover (아래 참고).
- Stepper +/−: `커피`는 ±1g.
- Segmented control: 탭으로 선택 변경, 변경 시 **푸어 스케줄이 실시간으로 재계산**되어야 함 (기존 앱 로직 그대로 사용).
- `고급 ›` → 고급 설정 화면 (범위 밖).
- `시작` → Brewing 화면.
- Back chevron → Wall.

---

### 2b. Dripper change popover

파일: `reference/wall-flow.jsx` → `RecipeScreenWithPopover`

**Purpose:** Recipe 화면을 벗어나지 않고 V60 / Kalita 전환.

**Layout:**

- Recipe 화면 전체를 **opacity 0.45로 dim** (상호작용 차단).
- Popover 앵커: top bar의 `바꾸기 ›` 위치 (top ~82, right 16).
- Popover box: `min-width 150pt`, radius 12, paper 배경, 1px faint ink 테두리, shadow `0 8 24 rgba(42,36,30,0.18)`.
- 우상단에 작은 삼각 pointer (10×10, 45° 회전).
- 2개 행 (각 8pt 패딩, radius 8):
  - V60 — 미니 SVG 32pt, `V60` 13pt (선택 시 weight 600) / `Kasuya 4:6` 9pt faint. 선택 시 배경 `rgba(42,36,30,0.05)` + 우측 체크마크.
  - Kalita — 동일 구조, `Wave` 부제.
- 행 탭 → 선택 + popover 닫힘 + Recipe 본 화면 값 업데이트.
- 배경(dim 영역) 탭 → 변경 없이 닫힘.

---

### 3. Brewing — 내리는 중

파일: `reference/wall-flow.jsx` → `BrewingScreen`

**Purpose:** 실제 브루잉 중. 한 눈에 보이는 **목표 무게** + **경과 시간**.

**Layout (위 → 아래):**

1. **상단 행** (padding 66 top, 20 좌우):
   - 좌: `경과` (10pt, faint) + `0:52` (26pt weight 500) 타이머.
   - 우: `중단` (11pt, faint) 텍스트 버튼.

2. **진행 레일** (gap 6, 각 step 1fr flex):
   - 각 step: 3pt 얇은 bar (완료 ink / 현재 ochre / 예정 faint ink) + 아래 9pt 라벨 (`뜸` / `1차` / `2차` / `3차` ...). 현재 step은 weight 600.

3. **Hero 블록** (margin-top 24, 중앙 정렬):
   - 상단 라벨 `지금` (11pt, ochre, weight 600, letter-spacing 1).
   - 작은 라벨 `저울 목표` (11pt, faint).
   - **거대한 숫자**: 현재 step의 목표 cumulative weight, e.g. `120` (96pt weight 500) + `g` (32pt faint).
   - 아래 필기체 힌트: `+60g 붓기` (18pt, soft).

4. **시점** (margin-top 8, 중앙):
   - `시점` 10pt faint + `0:45` 22pt soft — 이 step이 도달해야 하는 시간 마커.

5. **다음 미리보기** (margin-top auto — 하단 고정):
   - Sketch hairline 위.
   - 한 줄: `다음` (10pt, faint, weight 600) + `1:30` 시간 (13pt, soft) + flex spacer + `180` `g` 무게 (18pt).

**Interaction:**

- 타이머는 기존 앱 로직 그대로 (`requestAnimationFrame`, 위 snapshot-to-state 패턴 권장).
- Step 자동 진행: 현재 step의 duration이 끝나면 다음 step으로.
- `중단` 탭 → Stop confirm dialog.
- 모든 step 완료 → Complete 화면으로 자동 전환.

---

### 3b. Stop confirm dialog

파일: `reference/wall-flow.jsx` → `StopConfirmScreen`

**Purpose:** 브루잉 중단 확인.

**Layout:**

- Brewing 화면 뒤에 opacity 0.4로 보임, 그 위 `rgba(42,36,30,0.45)` scrim.
- 중앙 다이얼로그 (width − 56, radius 14, padding 26 22 18):
  - `브루잉을 중단할까요?` (18pt weight 500).
  - 필기체 부가: `기록은 남지 않습니다.` (13pt, soft).
  - 하단 버튼 2개 (gap 10, 각 44pt tall):
    - 좌 (보조): `중단` 13pt soft — faint stroke.
    - 우 (강조): `처음으로` 14pt weight 500 — 진한 stroke, 연한 fill. _(주의: label 배치가 살짝 반직관적 — 실제 구현에선 "중단하기" = 확정 행동, "계속하기" = 취소로 label 재검토 권장. 디자이너와 확인 필요.)_
- 배경 scrim 탭 → dialog 닫힘 (계속 브루잉).

---

### 4. Complete — 완료

파일: `reference/wall-flow.jsx` → `CompleteScreen`

**Purpose:** 마치고 난 잔잔한 마무리. 요약 + 감정 기록.

**Layout (위 → 아래, padding 66 24 34):**

1. **조용한 헤더** (중앙):
   - 작은 `완료` ochre 라벨 (11pt, weight 600, letter-spacing 1).
   - 날짜/시간 `2026 · 03 · 14 · 오전 7:42` (11pt, faint).

2. **Hero — 총 시간** (margin-top 20, 중앙):
   - `오늘의 한 잔` (11pt, faint).
   - 거대 시간: `3:28` (72pt, weight 500).
   - 필기체 힌트: `잘 내렸습니다.` (14pt, soft).

3. **레시피 요약 카드** (margin-top 28):
   - 위/아래 sketch hairline.
   - 2×2 그리드 (gap 14):
     - `드리퍼` / `V60` (16pt)
     - `레시피` / `Kasuya 4:6` (13pt, soft)
     - `원두 · 물` / `20 · 300 g`
     - `온도 · 분쇄` / `90° · 중간`

4. **감정 기록** (margin-top 28):
   - 헤더 필기체: `오늘의 시간은 어땠나요?` (13pt, soft, 중앙).
   - 3개 버튼 가로 배열 (gap 8, 각 1fr, 78pt tall, radius 10):
     - `만족스러워요` — calm glyph (정지한 원).
     - `글쎄요` — neutral glyph (수평선 + tick).
     - `아쉬워요` — wave glyph (두 개의 물결).
   - 선택된 것만 진한 stroke + 연한 fill + 라벨 weight 600.

5. **하단 버튼 행** (flex-1로 상단과 분리):
   - 좌 (1fr): `처음으로` — 52pt tall, 진한 stroke, 연한 fill. Wall 화면으로.
   - 우 (60pt, 52pt tall): 공유 아이콘 버튼 — faint stroke. **공유 카드 시트** 열기.

**Interaction:**

- 감정 버튼: 단일 선택. 한 번 더 탭하면 해제.
- `처음으로` → Wall 화면.
- 공유 아이콘 → 공유 카드 시트 (아래 참고).

---

### 4b. Share cards (공유)

파일: `reference/wall-flow.jsx` → `ShareCardSquare`, `ShareCardStory`

두 가지 포맷:

**Square (1:1, 피드용, 기본 1080×1080):**

- 상단: `뜸` 워드마크 (좌) + 날짜 (우).
- 중앙: 드리퍼 글리프 + `V60 · Kasuya 4:6` + 거대 시간 (`3:28`) + 필기체 부제.
- 하단: 4열 레시피 스트립 (원두 / 물 / 온도 / 분쇄), 위아래 hairline.

**Story (9:16, 스토리용, 기본 1080×1920):**

- 동일 정보, 세로 breathing room 많이.
- 중앙에 드리퍼 + 시간. 그 아래 **세로 푸어 스케줄** 포함 (square에는 없음).
- 벽 banding 배경 faint.

**Interaction:**

- Complete 화면 공유 아이콘 탭 → 네이티브 공유 시트 (플랫폼 공유 API). 카드 이미지는 미리 렌더링된 PNG로 전달.
- 정확한 export 치수: Instagram 피드 1080×1080, 스토리 1080×1920.

---

## Design Tokens (reference only)

스케치 레퍼런스가 사용하는 값 — **기존 앱의 토큰으로 치환하세요**.

| Token        | Value                 | Role                                                 |
| ------------ | --------------------- | ---------------------------------------------------- |
| INK          | `#2a241e`             | primary text / strokes                               |
| INK_SOFT     | `rgba(42,36,30,0.55)` | secondary text                                       |
| INK_FAINT    | `rgba(42,36,30,0.18)` | hairlines / faint labels                             |
| PAPER        | `#fbf7ef`             | Recipe/Brewing/Complete 배경                         |
| PAPER_SUBTLE | `#f5efe4`             | 카드 / inactive fill                                 |
| WALL         | `#ede5d5`             | Wall 화면 배경                                       |
| OCHRE        | `#b8843f`             | 유일한 accent — 현재 step, bloom marker, `완료` 라벨 |

**원칙:** two-tone (ink on paper) + single ochre accent. 다색 사용 금지.

**Typography (reference):**

- UI 바디: `Pretendard Variable` (이미 앱에서 사용 중이면 그대로).
- 숫자 (타이머, 무게): 같은 패밀리의 **tabular lining** 또는 display weight. 자릿수가 움직이지 않아야 함.
- 필기체 힌트 (Caveat 등): **프로덕션에는 넣지 마세요.** 대신 작은 italic 또는 soft eyebrow로 대체.

**Spacing:** 4 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 28 / 40.
**Radius:** 버튼 11–12, 카드 10–14, dialog 14, pill 999.
**Hit targets:** 최소 44pt (iOS HIG).

---

## Interactions & Behavior — 공통

- **네비게이션:** 선형. Wall → Recipe → Brewing → Complete → Wall. 뒤로가기는 top-left chevron.
- **상태 보존:** Brewing 중 앱이 백그라운드로 가도 타이머는 epoch timestamp 기준으로 복구되어야 함 (기존 앱 로직에 있을 것).
- **Orientation:** Portrait only.
- **Haptics:** step 전환 시 light tap, 완료 시 strong tap (이미 있다면 재사용).
- **접근성:** Brewing 화면의 step 전환은 aria-live로 announce. 큰 숫자들은 `font-variant-numeric: tabular-nums`.

---

## Files

`reference/` 내:

- **`wall-flow.jsx`** — 모든 화면 컴포넌트 (`WallScreen`, `RecipeScreen`, `RecipeScreenWithPopover`, `BrewingScreen`, `StopConfirmScreen`, `CompleteScreen`, `ShareCardSquare`, `ShareCardStory`, `MorphTransitionScreen`). **여기부터 시작.**
- **`sketch-primitives.jsx`** — 스케치 스타일 primitives (wobbly box/line, 필기체 라벨, Stepper, Segmented 등). **포팅하지 말고** 의도만 참고 후 기존 디자인 시스템 컴포넌트로 구현.
- **`ios-frame.jsx`** — 390×844 iOS 프레임 (상태바 포함). 실제 구현은 플랫폼의 SafeArea 사용.
- **`mobile-variations.jsx`** — 최종 wall flow 이전에 탐색한 3개 변형 (timeline-centric, compact-form, glanceable-gauge). 왜 최종 화면이 이런 결정을 했는지 맥락 참고용.

프로젝트 루트의 `Wireframes.html`은 모든 화면을 한 캔버스에서 볼 수 있는 라이브 와이어프레임입니다.

---

## Out of Scope

- 레시피 커스터마이징 / 고급 설정 화면 (`고급 ›` 링크 뒤).
- 레시피 목록 / 히스토리 화면 (Wall의 `레시피 먼저 보기 ›` 링크 뒤).
- 설정 / 온보딩.
- 저울 BT 연동 (별도 프로젝트).
- 상세 push 알림, 위젯 등 플랫폼 확장.
