# 진행 레일 v4 "스텝 필" — 디자인 스펙

날짜: 2026-07-08 · 상태: 승인됨 (시각 목업 검토 완료)

## 목적

Brewing 화면 진행 레일 v3 "이음"을 단순화한다. 물방울·다리·흡수 전환 등 장식 요소를 전부 제거하고, 붓기별 분리 구간(스텝 필) 구조만 남긴다.

브레인스토밍에서 3개 시안(헤어라인/바우하우스/스텝 필)을 시각 목업으로 비교했고, **스텝 필 구조 × 바우하우스 두께** 하이브리드로 확정. 목업: `.superpowers/brainstorm/19722-1783468266/content/rail-hybrid-v2.html`.

## 확정 디자인

- **구조**: 붓기마다 독립된 구간(segment). 구간 사이 6px 틈이 곧 붓기 경계 — 별도 마커 없음. 구간 폭은 시간 비례 (기존과 동일).
- **기하**: 구간 높이 8px (기존 2.5px 선 → 면), 라운드 pill (`--radius-pill`), 틈 6px.
- **색**: 트랙 = 라이트 `--neutral-100` / 다크 `--neutral-700`, 채움 = 라이트 `--accent-500` / 다크 `--accent-400`. (트랙이 기존 `neutral-200`보다 한 단계 연해짐 — 8px 면적이라 기존 값은 과함.)
- **모션**: 채움 폭 250ms linear 보간만. `useElapsed` 250ms 틱 사이를 CSS transition이 메운다 (기존 물방울 성장 보간과 같은 기법). 붓기 순간의 choreography 없음 — 이전 구간 완충 + 다음 구간 차오름 시작 자체가 전환.
- **리드인**: 레일 자체의 리드인 신호(quiver) 삭제. 리드인은 화면 배경 물듦 + 소리 큐가 이미 담당.

## 구현 범위

**`BrewRail.tsx`**
- 유지: 세그먼트 계산·렌더 (`brew-rail-seg` / `brew-rail-seg-fill`), `aria-hidden` 장식 역할, `toPct`/`clamp01`.
- 삭제: `DROP_PATH`, 경계 anchor 렌더 블록 전체 (`brew-rail-boundary`/`bridge`/`drop`/`drop-sink`), `LEAD_IN_SEC` import, `soon`/`passed`/`level` 계산.

**`BrewRail.css`**
- 유지: `.brew-rail`, `.brew-rail-seg`, `.brew-rail-seg-fill` (+ fill에 `transition: width 250ms linear` 추가).
- 삭제: boundary/bridge/drop/sink/quiver 전부, reduced-motion 블록은 fill transition 해제만 남김.

**`brewing.css` 토큰**
- `--color-brewing-rail-track`: `--neutral-200` → `--neutral-100` (다크: `--neutral-700` 유지).
- `--color-brewing-rail-drop` 삭제.
- `--size-brewing-rail-h`: 26px → 8px (방울 부양 공간 불필요). 선 두께와 전체 높이가 같아지므로 `--size-brewing-rail-line`은 삭제하고 h 하나만 남긴다.
- `--size-brewing-rail-gap`: 4px → 6px.
- `--size-brewing-rail-drop-w`, `--size-brewing-rail-air` 삭제.

**테스트**
- `BrewRail.test.tsx`: drop 관련 단언 삭제, 세그먼트 채움·경계 위치 단언 유지.
- `BrewingScreen.test.tsx`: rail 관련 참조 확인 후 갱신.

## 하지 않는 것

- BrewingScreen 레이아웃·정보 구조 변경 없음 (레일 교체만).
- 도메인 로직 변경 없음.
- 리드인 시각 신호를 레일에 다시 넣지 않음.

## 검증

- 기존 rail 테스트 그린 (drop 단언 제거 후).
- 라이트/다크 두 테마에서 육안 확인 (목업 대비).
- `prefers-reduced-motion`에서 transition 제거 확인.
