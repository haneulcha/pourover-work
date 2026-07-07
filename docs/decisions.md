# 결정 기록 (non-ADR)

ADR(`docs/adr/`)로 만들 만큼 무겁지 않은 제품·디자인 결정들. 나중에 "왜 이렇게 돼 있지?"가 나올 결정만 기록. 최신이 위.

## 2026-07-06 — `docs/TODO.md` 폐기

작업 메뉴·상태 추적 역할이 GitHub Issues(+ 텔레그램 `/idea`·`/bug` 봇, `apps/webhook`)로 완전히 이관되어 문서가 화석화됨. 문서에만 있던 "보류 결정" 기록은 이 파일로 이전. 제품 방향·로드맵은 `docs/product.md`가 담당.

## 2026-04 — 리추얼 플로우 시기의 보류·설계 결정

(구 `docs/TODO.md`에서 이전. 원문은 git history의 `docs/TODO.md` 참조.)

- **"뜸" 브랜드 네이밍 드롭** (2026-04-19) — 네이밍 자체가 어색. Wall 타이틀은 `핸드드립 계산기`, Brewing 레이블은 `bloom`으로 일반화. **브랜드 보이스·톤·비주얼 원칙 자체는 여전히 유효** (`brand.md`의 3색 원칙, 느린 모션, 침묵 기본 등). 네이밍이 남아 있는 문서(brand.md 헤더, spec/plan/handoff)는 작업 히스토리라 유지.
- **브랜드 3차 마감 스킵** — 타이틀 교체 / Segmented shadow 제거 / 초기화 버튼 숨김. 불필요로 판단.
- **메서드 설명/노트는 기존(더 정확함) 유지** — brand.md 카피 라이브러리의 짧은 버전으로 교체하지 않음.
- **bloom 배지·고유명사(Kasuya/Hoffmann/Kalita Wave)는 원어 유지** — 브랜드 과잉 푸시 회피.
- **servings 모드(by-coffee/by-servings 토글) 제거** (Phase 1 시작 전) — 핸드오프에 없고 침묵 원칙과 맞음.
- **완료/중단 destination** — Phase 2→Recipe, Phase 3→Wall, Phase 4→Complete가 완료 경로를 가로채고 최종 Wall로 복귀.
