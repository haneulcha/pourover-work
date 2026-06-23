# 수집 큐

`/wiki-grow`의 입력. `/wiki-audit`가 재검증 필요 노트를 여기에 추가한다.
처리되면 체크하거나 줄을 지운다.

## 대기

시딩 원본: `_meta/sources/brewing-research-2026.md` (아카이브됨). 남은 분해:
- [x] theory 토대: percolation, contact-time, extraction-yield, brew-ratio (2026-06-21 완료)
- [x] equipment: v60-dripper, kalita-wave, flat-bottom-vs-conical (2026-06-21 완료)
- [x] method: hoffmann-v60, kasuya-4-6, april (완료 2026-06-21)
- [ ] glossary: swirl (bloom·channeling 완료)
- [x] theory stub: degassing, immersion, tds, grind-size (완료 2026-06-21)
- [x] stub 채우기: pre-infusion, scott-rao, swirl, channeling (완료 2026-06-21)

남은 것: bean 카테고리(산지·가공·로스팅·품종·향미)는 원본 보고서 범위 밖 — 새 리서치 필요. 멜리타/칼리타102/블루보틀/오리가미 등 추가 드리퍼는 선택.

## 재검증 (audit 출력)

<!-- /wiki-audit가 review_after 지난 노트를 여기에 채운다 -->

### 2026-06-23 audit
신선도 만료 0 · 무결성 위반 0 · 깨진 링크 0 · stub은 `_index`(MOC)만. 전반적으로 green.
유일한 발견 — **단방향 `related` 링크 6건**(A→B인데 B에 역링크 없음). **즉시 청산 완료**(2026-06-23, 같은 날 link-symmetry 수정):
- [x] `extraction-yield` ← water-chemistry
- [x] `acidity` ← water-chemistry
- [x] `tds` ← water-hardness
- [x] `grind-size` ← filter
- [x] `channeling` ← filter
- [x] `v60-dripper` ← grinder
