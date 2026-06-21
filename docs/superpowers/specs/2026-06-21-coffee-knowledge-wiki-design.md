# 커피 지식 위키 — 설계 문서

**날짜**: 2026-06-21
**상태**: 설계 합의 완료, 구현 계획 대기
**한 줄 요약**: 출처·검증·신선도 갱신을 갖춘 atomic 노트 지식 그래프를 `docs/wiki/`에 구축한다. 내부 위키로 시작하되 앱 노출/Obsidian으로 가는 문을 열어둔다.

---

## 1. 동기 & 목표

이 프로젝트(핸드드립 레시피 계산기)를 장기적으로 이끌려면 기능·컨셉을 뒷받침하는 **원천 지식**이 필요하다. 단순 문서 모음이 아니라:

1. **그래프 구조** — 시작/끝 없는 atomic 노트가 `[[위키링크]]`로 거미줄처럼 연결되고, 확장·심화될 수 있음.
2. **검증** (*최우선*) — 각 지식 조각의 정확성·진실성·관련성·최신성을 보증. "정답"을 위조하지 않고 "누가 무엇을 왜 주장하는가"를 보존.
3. **주기적 수집** — outdated 방지. 정기적으로 새 지식을 수집하고 오래된 노트를 재검증.

### 비목표 (현 단계)
- 앱(엔드유저)에 위키를 렌더링하는 것 — 구조만 열어두고 지금은 안 함.
- 자동 스케줄(크론) 수집 — 수동 스킬로 먼저 검증한 뒤 나중에.
- CI 강제 스키마 lint — v1.1로 미룸.

## 2. 핵심 결정 (합의됨)

| 결정 | 선택 | 근거 |
| --- | --- | --- |
| 1차 독자 | 내부(개발자) 우선, 앱 노출은 단계적 | 장기 자산은 "원천 지식". 내부부터 단단히. |
| 저장 형식 | repo 안 마크다운 (`docs/wiki/`) | git 버전/diff/리뷰, 코드·메모리 `[[name]]` 멘탈모델 일치, Obsidian 네이티브 호환 |
| 조직 | 폴더(큰 갈래) + 태그(가로지르는 주제) 병행 | 네비게이션은 폴더, 거미줄은 `[[링크]]` |
| 검증 모델 | C — 다중 출처 교차검증 + confidence 등급 + 논쟁 추적 | 커피 도메인은 논쟁이 많아 합의/논쟁 구분이 더 정확한 진실 |
| 검증 실행자 | Collector / Verifier 역할 분리, Verifier는 커스텀 서브에이전트 | 자기 글 자기 채점 방지, 재사용·일관 기준 |
| 수집 운영 | 하이브리드 — 수동 스킬부터, 자동화는 나중 | 검증 품질을 수동으로 먼저 입증 (`feedback_pre_prod_validation_gap` 결) |
| 성장/점검 | `/wiki-grow`(성장) + `/wiki-audit`(점검) 두 스킬 분리 | 관심사 분리 |
| 시딩 | `brewing-research.md`도 Verifier 거침 | 시딩 ≠ 사실 보증 |

미래 옵션(지금 결합 안 함): 앱 노출(frontmatter 파싱), Obsidian vault, cowork류 도구 연동.

## 3. 구조 & 레이아웃

```
docs/wiki/
  _index.md              # 루트 MOC(Map of Content) — 진입점/카테고리 허브
  method/                # 메서드/레시피 (코드 methods/와 1:1 대응 지향)
  equipment/             # 드리퍼, 필터, 그라인더, 물
  theory/                # 추출 이론 (확산/부식, TDS, 수율, 비율)
  bean/                  # 산지, 가공, 로스팅, 품종, 향미
  glossary/              # 용어 (블룸, 스월, 채널링)
  _meta/
    schema.md            # frontmatter 규약 — 사람+에이전트 공용 단일 출처
    queue.md             # 수집 대기 백로그 (성장 엔진 입력 + audit 출력)
    sources/             # 원출처 아카이브 (예: brewing-research-2026.md)
```

- **거미줄은 폴더가 아니라 `[[링크]]`가 만든다.** 폴더는 정리용. 네비게이션은 노트 간 링크 + 카테고리 MOC.
- **stub 노트**: 아직 안 쓴 개념도 `[[water-hardness]]`로 링크만 걸면 frontmatter만 있는 얇은 stub 파일을 생성 → 확장 가능 구조. Obsidian 미해결 링크와 정합.
- **코드 연결은 단방향**: `method/hoffmann-v60.md`가 `packages/domain/src/methods/hoffmann-v60.ts`를 본문에서 참조. 코드는 위키를 모름(도메인 순수성 유지).
- **Obsidian 호환**: `docs/wiki/`를 그대로 vault로 열면 그래프 뷰 동작 (`[[링크]]` + YAML frontmatter 네이티브).

## 4. 노트 포맷 (frontmatter 스키마)

평면 YAML frontmatter + 본문. 단일 출처는 `docs/wiki/_meta/schema.md`.

```markdown
---
title: 호프만 얼티밋 V60
slug: hoffmann-v60
category: method            # method | equipment | theory | bean | glossary
tags: [v60, pour-over, light-roast, percolation]
status: established         # established | contested | anecdotal | stub
last_verified: 2026-06-21
review_after: 2026-12-21    # 신선도 만료 → 재검증 트리거
sources:
  - title: "James Hoffmann — The Ultimate V60 Technique"
    url: https://youtu.be/...
    kind: authority          # peer-reviewed | authority | practitioner | anecdote
    date: 2020-10
    stance: supports         # supports | disputes | mixed
related: ["[[v60-dripper]]", "[[bloom]]", "[[pour-kettle-technique]]"]
code: packages/domain/src/methods/hoffmann-v60.ts
---

## 핵심 (한 문단)
...

## 파라미터
| 항목 | 값 |
| --- | --- |

## 왜 이렇게 하는가
[[percolation]]에서 접촉 시간을 균일하게 유지하기 위해...

## 출처 노트
```

### 규칙
- **Atomic**: 한 파일 = 한 개념. 길어지면 쪼개서 링크.
- **status = confidence 등급** (Verifier 판정이 박힘):
  - `established` — 독립 출처 ≥2 동의 + 신뢰할 반론 없음. `sources` 비면 모순(에러).
  - `contested` — 신뢰할 출처끼리 불일치 → **쟁점 블록 필수**.
  - `anecdotal` — 단일 출처/실무 구전.
  - `stub` — 링크 타깃용 미작성 노트(`sources` 비어도 됨).
- **contested 노트의 쟁점 블록** (논쟁 추적, prose):
  ```markdown
  ## 쟁점: 블룸 시간
  - **입장 A — 30~45초** ([[james-hoffmann]], authority): CO2 배출 충분
  - **입장 B — 더 길게/짧게** (Barista Hustle, practitioner): 로스팅 신선도 의존
  - **현재 합의**: 없음. 로스팅 후 경과일 의존이라는 점만 공통.
  ```
- **sources[].stance/kind**: 출처마다 주장 지지/반박 입장 + 등급. Verifier가 등급 산정에 사용.
- 출처는 구조화(frontmatter), 쟁점은 prose.

## 5. 검증 프로토콜 & Verifier 서브에이전트

**역할 분리가 핵심.** 수집과 검증을 한 에이전트가 하면 자기 글 자기 채점.

- **Collector(수집자)**: 주제 → 노트 *초안*. 낙관적.
- **Verifier(검증자, `.claude/agents/wiki-verifier.md` 커스텀 서브에이전트)**: 초안을 받아 **독립 재조사**하고 각 주장을 *반증 시도*한 뒤 등급 판정. 적대적. 시스템 프롬프트에 규약을 박아 호출처(스킬/수동/스케줄)와 무관하게 동일 기준.

### Verifier 규약 (노트 1개당)
1. **주장 분해** — 검증 가능한 개별 주장으로 쪼갬.
2. **독립 재조사** — 초안 출처를 *신뢰하지 않고* 주장마다 새 출처 검색(WebSearch/WebFetch). 등급화: `peer-reviewed > authority > practitioner > anecdote`.
3. **반증 시도** — "틀렸다는 신뢰할 출처가 있나?"를 적극 검색 (적대적 단계).
4. **등급 판정** (주장별 → 노트 전체):
   - 독립 출처 ≥2 지지 + 신뢰할 반론 없음 → `established`
   - 신뢰할 출처 충돌 → `contested` + 쟁점 블록 작성 지시
   - 단일/구전만 → `anecdotal`
   - 검증 불가/출처 못 찾음 → 반려(reject) 또는 `anecdotal` 강등
5. **신선도 체크** — 출처가 낡았거나 더 최신 합의가 있으면 플래그.
6. **판정 반환**(구조화): 노트별 status, 주장별 근거/출처, 쟁점 여부, 신선도 경고, 수정 요구.

- **다중 출처 = 독립 출처**여야 한다. 같은 주장을 인용한 블로그 3개 = 출처 1개. Verifier가 독립성도 본다.
- **비용 관리**: 노트당 Verifier 1회 기본. 핵심/contested 후보는 서로 다른 렌즈(정확성/최신성/반증) Verifier 다중 — 성장 엔진이 중요도로 조절.
- **설계 의도**: Verifier는 "통과시키는" 게 아니라 "떨어뜨리려 시도"한다. 통과해야 status가 박힌다.

## 6. 성장 엔진 — `/wiki-grow`

`.claude/skills/wiki-grow/` 스킬이 수집→검증→편입→리뷰를 오케스트레이션.

**입력:**
- `/wiki-grow <주제>` — 특정 주제
- `/wiki-grow` — `_meta/queue.md` 백로그에서 다음 주제

**흐름:**
1. **계획** — 주제를 atomic 노트로 분해. 기존 위키를 읽어 "있는 노트 / 새 노트 / 링크 stub" 구분(중복 방지).
2. **수집(Collector)** — 노트별 초안 작성(리서치).
3. **검증(Verifier)** — 노트마다 §5 규약. 핵심/contested는 다중 렌즈. 반려 주장은 드롭/강등.
4. **편입** — 통과 노트를 그래프에 연결: `related` 양방향 링크(상대 노트에 backlink 추가), 새 참조 개념은 stub 생성, 카테고리 MOC(`_index.md`) 갱신.
5. **리뷰 게이트** — 요약 제시(새 노트 수, 등급 분포, contested 쟁점, 반려 주장, stub 목록). **승인 후에만 commit.**

기존 `deep-research` 스킬 / `Workflow`(fan-out 검증) 패턴을 차용하되 결과물은 위키 노트 + 검증 판정으로 고정.

## 7. 신선도 관리 — `/wiki-audit`

`.claude/skills/wiki-audit/` 가벼운 점검 스킬.
- 스캔: `review_after` 지난 노트, `status: stub` 노트, 깨진 `[[링크]]`, 출처 없는 `established`(모순).
- 재검증 필요 노트를 `_meta/queue.md`에 도로 넣음 → 다음 `/wiki-grow`가 처리.
- "outdated 방지 + 주기적 수집"의 수동 버전.
- **미래**: 이 스킬을 주 1회 `/schedule` 클라우드 루틴에 걸면 자동화(하이브리드 2단계). 지금은 안 검.

## 8. 시딩 (기존 문서 이전)

`brewing-research.md`(196줄)가 첫 씨앗. 일괄 자동 변환하지 않고 **`/wiki-grow`의 첫 실행 대상**으로 삼아 Verifier를 거친다 (시딩 ≠ 사실 보증).

쪼개질 노트 예(초안 매핑):
- `theory/percolation.md`, `theory/extraction-yield.md`, `theory/contact-time.md`
- `equipment/v60-dripper.md`, `equipment/kalita-wave.md`, `equipment/flat-bottom-vs-conical.md`
- `method/hoffmann-v60.md`, `method/kasuya-4-6.md`, `method/april.md`
- `glossary/bloom.md`, `glossary/swirl.md`, `glossary/channeling.md`

원본 `brewing-research.md` → `docs/wiki/_meta/sources/brewing-research-2026.md`로 **보존**(원출처 아카이브, 추적성).

## 9. 스키마 검증 (v1.1로 연기)

위키가 커질 때 frontmatter 무결성을 위한 lint(`scripts/wiki-lint.ts` 등):
- 필수 필드(`title/slug/category/status/last_verified`).
- `established`인데 `sources` 비면 에러.
- `[[링크]]`가 실제 파일/stub을 가리키는지(깨진 링크).
- `related` 양방향성.

v1은 Verifier/audit 스킬이 같은 규칙을 사람이 돌리는 형태로 커버. CI 강제는 불필요(콘텐츠라서).

## 10. 컴포넌트 요약 (단위/경계)

| 컴포넌트 | 위치 | 책임 | 의존 |
| --- | --- | --- | --- |
| 노트 스키마 | `docs/wiki/_meta/schema.md` | frontmatter 규약 단일 출처 | — |
| 지식 그래프 | `docs/wiki/**/*.md` | atomic 노트 + `[[링크]]` | 스키마 |
| Verifier 에이전트 | `.claude/agents/wiki-verifier.md` | 적대적 검증·등급 판정 | WebSearch/WebFetch |
| `/wiki-grow` | `.claude/skills/wiki-grow/` | 수집→검증→편입→리뷰 | Verifier, 그래프, queue |
| `/wiki-audit` | `.claude/skills/wiki-audit/` | 신선도·무결성 점검 → queue | 그래프, queue |
| queue | `docs/wiki/_meta/queue.md` | 수집 백로그 + audit 출력 | — |
| 시드 아카이브 | `docs/wiki/_meta/sources/` | 원출처 보존 | — |

## 11. 구현 순서 (다음 단계: writing-plans에서 상세화)

1. 골격: `docs/wiki/` 폴더 + `_index.md` MOC + `_meta/schema.md` + 빈 `_meta/queue.md`.
2. Verifier 서브에이전트(`.claude/agents/wiki-verifier.md`).
3. `/wiki-grow` 스킬.
4. `/wiki-audit` 스킬.
5. 시딩: `brewing-research.md`를 queue에 넣고 `/wiki-grow`로 첫 노트 묶음 생성(Verifier 통과), 원본 아카이브.
6. (v1.1) `wiki-lint` 스크립트.
