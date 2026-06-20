# 커피 지식 위키 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출처·검증·신선도를 갖춘 atomic 노트 지식 그래프(`docs/wiki/`)와, 그것을 키우는 도구(Verifier 서브에이전트 + `/wiki-grow` + `/wiki-audit`)를 만든다.

**Architecture:** 지식은 `docs/wiki/`의 마크다운 atomic 노트(YAML frontmatter + `[[위키링크]]`, Obsidian 네이티브 호환). 수집(Collector)과 검증(Verifier)을 분리해 Verifier는 적대적 검증을 하는 커스텀 서브에이전트로 둔다. 사용자 진입점은 repo 관례대로 `.claude/commands/*.md` 슬래시 커맨드 두 개.

**Tech Stack:** Markdown + YAML frontmatter, Claude Code 커스텀 서브에이전트(`.claude/agents/`)와 슬래시 커맨드(`.claude/commands/`), WebSearch/WebFetch(검증 리서치). 앱/도메인 코드 변경 없음(`packages/**`, `apps/**` 불변).

## Global Constraints

- 도메인 순수성: 위키→코드 참조는 단방향. `packages/domain/**`는 위키를 import/참조하지 않는다.
- frontmatter 단일 출처는 `docs/wiki/_meta/schema.md`. 모든 노트·도구가 이 규약을 따른다.
- `status` 값은 `established | contested | anecdotal | stub` 4종으로 고정.
- 출처 `kind` 등급은 `peer-reviewed > authority > practitioner > anecdote`.
- `established`는 독립 출처 ≥2 + 신뢰할 반론 없음. `established`인데 `sources` 비면 무결성 오류.
- 다중 출처 = **독립** 출처(같은 주장 재인용은 1개로 셈).
- 시딩 ≠ 사실 보증: 기존 `brewing-research.md` 내용도 Verifier를 거친다.
- 자동 스케줄/CI lint는 이 계획 범위 밖(v1.1).
- 날짜는 ISO `YYYY-MM-DD`. 이 계획 실행 기준일을 `last_verified`로 사용.
- repo 관례: 슬래시 커맨드는 `.claude/commands/<name>.md`, frontmatter는 `description`(+필요시 `argument-hint`), 본문에서 `$ARGUMENTS` 치환.

---

## File Structure

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `docs/wiki/_meta/schema.md` | frontmatter 규약 단일 출처 (사람+에이전트 공용) | 1 |
| `docs/wiki/_index.md` | 루트 MOC, 카테고리 허브/진입점 | 1 |
| `docs/wiki/_meta/queue.md` | 수집 백로그 + audit 출력 큐 | 1 |
| `docs/wiki/{method,equipment,theory,bean,glossary}/.gitkeep` | 카테고리 폴더 골격 | 1 |
| `.claude/agents/wiki-verifier.md` | 적대적 검증·등급 판정 서브에이전트 | 2 |
| `.claude/commands/wiki-grow.md` | 수집→검증→편입→리뷰 오케스트레이션 | 3 |
| `.claude/commands/wiki-audit.md` | 신선도·무결성 점검 → queue | 4 |
| `docs/wiki/**/*.md` (시드 노트) | brewing-research 유래 첫 노트 묶음 | 5 |
| `docs/wiki/_meta/sources/brewing-research-2026.md` | 원출처 아카이브 | 5 |

각 태스크는 독립적으로 검토·머지 가능한 산출물로 끝난다. 이 프로젝트의 산출물은 마크다운 규약·서브에이전트·커맨드이므로, "테스트"는 픽스처를 만들어 **실제로 도구를 돌려 기대 동작을 관찰**하는 것이다(코드 유닛테스트의 대응물).

---

### Task 1: 위키 골격 — 스키마 · MOC · queue · 폴더

**Files:**
- Create: `docs/wiki/_meta/schema.md`
- Create: `docs/wiki/_index.md`
- Create: `docs/wiki/_meta/queue.md`
- Create: `docs/wiki/method/.gitkeep`, `docs/wiki/equipment/.gitkeep`, `docs/wiki/theory/.gitkeep`, `docs/wiki/bean/.gitkeep`, `docs/wiki/glossary/.gitkeep`

**Interfaces:**
- Produces: `schema.md`의 frontmatter 규약(필드명·허용값) — Task 2~5가 모두 이 규약을 참조한다. queue.md 포맷(체크박스 주제 리스트) — Task 3이 소비, Task 4가 추가.

- [ ] **Step 1: 기대 동작(픽스처) 정의 — 검증용 샘플 노트를 머릿속에 고정**

이 태스크의 "테스트"는 다음 질문에 schema.md가 명확히 답하는지다:
- 필수 필드는? (`title, slug, category, status, last_verified`)
- `status: established`인데 `sources`가 비면 위반인가? (예)
- `stub` 노트는 `sources` 없이 허용되나? (예)
- 쟁점 블록은 어디에(prose) 두나?

- [ ] **Step 2: `docs/wiki/_meta/schema.md` 작성**

```markdown
# 위키 노트 스키마 (단일 출처)

모든 노트는 YAML frontmatter + 마크다운 본문. Obsidian 네이티브 호환(`[[링크]]`, YAML properties).

## frontmatter 필드

| 필드 | 필수 | 타입 | 설명 |
| --- | --- | --- | --- |
| `title` | ✅ | string | 사람이 읽는 제목 |
| `slug` | ✅ | string(kebab) | 파일명과 일치, `[[slug]]` 링크 대상 |
| `category` | ✅ | enum | `method \| equipment \| theory \| bean \| glossary` |
| `tags` | — | string[] | 폴더를 가로지르는 주제 |
| `status` | ✅ | enum | `established \| contested \| anecdotal \| stub` |
| `last_verified` | ✅ | date(YYYY-MM-DD) | 마지막 검증일 |
| `review_after` | — | date | 신선도 만료일(재검증 트리거). 보통 +6개월 |
| `sources` | 조건부 | object[] | `status != stub`이면 필수. 항목: `{title, url?, kind, date?, stance}` |
| `related` | — | string[] | `"[[slug]]"` 링크 배열(양방향 유지) |
| `code` | — | string | 연결된 코드 경로(단방향 참조) |

`sources[].kind`: `peer-reviewed \| authority \| practitioner \| anecdote`
`sources[].stance`: `supports \| disputes \| mixed`

## status 규칙 (Verifier 판정 결과)

- `established` — 독립 출처 ≥2 지지 + 신뢰할 반론 없음. **`sources` 비면 무결성 오류.**
- `contested` — 신뢰할 출처끼리 불일치. **본문에 `## 쟁점:` prose 블록 필수.**
- `anecdotal` — 단일 출처/실무 구전.
- `stub` — 링크 타깃용 미작성 노트. `sources` 없어도 됨.

## 본문 권장 섹션

`## 핵심`(한 문단) · `## 파라미터`(표, 해당 시) · `## 왜 이렇게 하는가` · `## 출처 노트` · (contested 시) `## 쟁점: <주제>`

## 쟁점 블록 예
\`\`\`markdown
## 쟁점: 블룸 시간
- **입장 A — 30~45초** ([[james-hoffmann]], authority): CO2 배출 충분
- **입장 B — 더 길게/짧게** (Barista Hustle, practitioner): 로스팅 신선도 의존
- **현재 합의**: 없음. 로스팅 후 경과일 의존이라는 점만 공통.
\`\`\`

## 원자성·링크 원칙
- 한 파일 = 한 개념. 길어지면 쪼개서 `[[링크]]`.
- 미작성 개념을 참조하면 `status: stub` 노트를 만들어 둔다(깨진 링크 금지).
- `related`는 양방향: A가 B를 가리키면 B도 A를 가리킨다.
```

- [ ] **Step 3: `docs/wiki/_index.md`(루트 MOC) 작성**

```markdown
---
title: 커피 지식 위키
slug: _index
category: glossary
status: stub
last_verified: 2026-06-21
---

# 커피 지식 위키

시작도 끝도 없는 지식 그래프. 폴더는 정리용, 진짜 길은 `[[링크]]`다.
규약은 [[schema]] 참조. 다음에 채울 주제는 `_meta/queue.md`.

## 카테고리 (MOC)
- **method/** — 메서드/레시피 (코드 `packages/domain/src/methods/`와 대응)
- **equipment/** — 드리퍼·필터·그라인더·물
- **theory/** — 추출 이론 (확산/부식, TDS, 수율, 비율)
- **bean/** — 산지·가공·로스팅·품종·향미
- **glossary/** — 용어 (블룸, 스월, 채널링)

> 노트가 쌓이면 각 카테고리 대표 노트를 여기서 링크한다.
```

- [ ] **Step 4: `docs/wiki/_meta/queue.md`(수집 백로그) 작성**

```markdown
# 수집 큐

`/wiki-grow`의 입력. `/wiki-audit`가 재검증 필요 노트를 여기에 추가한다.
처리되면 체크하거나 줄을 지운다.

## 대기
- [ ] (시딩) brewing-research.md → theory/equipment/method/glossary 노트로 분해 — Task 5에서 처리

## 재검증 (audit 출력)
<!-- /wiki-audit가 review_after 지난 노트를 여기에 채운다 -->
```

- [ ] **Step 5: 카테고리 폴더 .gitkeep 생성**

Run:
```bash
for d in method equipment theory bean glossary; do mkdir -p docs/wiki/$d && touch docs/wiki/$d/.gitkeep; done
mkdir -p docs/wiki/_meta/sources
```

- [ ] **Step 6: 검증 — 골격 무결성 확인**

Run: `find docs/wiki -type f | sort`
Expected (정확히 이 파일들):
```
docs/wiki/_index.md
docs/wiki/_meta/queue.md
docs/wiki/_meta/schema.md
docs/wiki/equipment/.gitkeep
docs/wiki/glossary/.gitkeep
docs/wiki/method/.gitkeep
docs/wiki/bean/.gitkeep
docs/wiki/theory/.gitkeep
```
그리고 schema.md를 다시 읽어 Step 1의 4개 질문에 모두 답이 있는지 눈으로 확인.

- [ ] **Step 7: Commit**

```bash
git add docs/wiki
git commit -m "feat(wiki): 위키 골격 — 스키마/MOC/queue/카테고리 폴더"
```

---

### Task 2: Verifier 서브에이전트

**Files:**
- Create: `.claude/agents/wiki-verifier.md`

**Interfaces:**
- Consumes: `docs/wiki/_meta/schema.md`의 status 규칙·출처 등급.
- Produces: 노트 초안(또는 초안 경로/내용)을 입력받아 **구조화된 판정**을 반환하는 서브에이전트 `wiki-verifier`. 반환 필드(Task 3이 소비): 노트별 `status`, 주장별 `{claim, verdict, independent_sources[]}`, `contested`(bool)와 쟁점 요약, `freshness_warnings[]`, `revision_requests[]`, `rejected_claims[]`.

- [ ] **Step 1: 기대 동작(픽스처) 정의**

두 픽스처 주장으로 검증한다:
- **참 주장**: "하리오 V60는 원추형이고 추출구가 하나다." → 기대: `established` (독립 authority 출처 ≥2).
- **거짓 주장**: "하리오 V60는 바닥이 평평한 평저형 드리퍼다." → 기대: **반려(reject)** 또는 강등, `rejected_claims`에 포함, 반증 출처 제시.

- [ ] **Step 2: `.claude/agents/wiki-verifier.md` 작성**

````markdown
---
name: wiki-verifier
description: 커피 지식 노트 초안을 적대적으로 검증한다. 각 주장을 독립 재조사·반증 시도한 뒤 established/contested/anecdotal 등급을 매기거나 반려한다. wiki-grow가 노트마다 호출한다.
tools: WebSearch, WebFetch, Read
---

너는 커피 지식 위키의 **검증 전담** 에이전트다. 너의 임무는 노트를 통과시키는 것이 아니라 **떨어뜨리려 시도**하는 것이다. 통과는 적대적 검증을 견뎠을 때만 주어진다.

입력: 검증할 노트 초안(제목 + 주장들 + 초안이 단 출처). 초안의 출처를 **신뢰하지 마라**.

규약은 `docs/wiki/_meta/schema.md`의 status 규칙과 출처 등급을 따른다.

## 절차 (노트 1개당)

1. **주장 분해** — 노트를 검증 가능한 개별 주장으로 쪼갠다(수치·인과·정의 각각).
2. **독립 재조사** — 주장마다 WebSearch/WebFetch로 **새 출처**를 찾는다. 초안 출처 재사용 금지. 출처를 등급화: `peer-reviewed > authority > practitioner > anecdote`. **독립성 확인**: 같은 원주장을 재인용한 글들은 1개 출처로 센다.
3. **반증 시도** — 각 주장에 대해 "이게 틀렸다는 신뢰할 출처가 있나?"를 적극 검색한다.
4. **등급 판정** (주장별 → 노트 전체, 가장 약한 핵심 주장이 노트 등급을 끌어내린다):
   - 독립 출처 ≥2 지지 + 신뢰할 반론 없음 → `established`
   - 신뢰할 출처끼리 충돌 → `contested` (+ 쟁점 블록 내용 제시: 입장/출처/현재 합의)
   - 단일/구전만 → `anecdotal`
   - 출처 못 찾음/반증됨 → 해당 주장 `rejected`
5. **신선도 체크** — 출처가 낡았거나 더 최신 합의가 있으면 `freshness_warnings`에 기록.

## 출력 형식 (반드시 이 구조의 마크다운으로 반환)

```
## 판정: <노트 제목>
- 노트 status: <established|contested|anecdotal>  (또는 NOTE_REJECTED)
- 주장별:
  - "<주장>": <established|contested|anecdotal|rejected> — 근거: <독립 출처들 title+kind+url>
- contested 쟁점: <없음 | 입장 A/B/현재합의 요약>
- 신선도 경고: <없음 | ...>
- 수정 요구(revision_requests): <없음 | 초안에서 고쳐야 할 점>
- 반려 주장(rejected_claims): <없음 | 목록 + 반증 출처>
```

확신이 없으면 등급을 **낮춰** 잡아라(established보다 anecdotal, 통과보다 반려). 위양성(틀린 걸 established로)이 위음성보다 훨씬 나쁘다.
````

- [ ] **Step 3: 참 주장 픽스처로 실행 → established 확인**

Agent 도구로 `wiki-verifier`를 dispatch. 입력 초안:
> 노트 "V60 드리퍼" — 주장: "하리오 V60는 원추형이며 바닥에 단일 대형 추출구가 있다." (초안 출처: 임의 블로그 1개)

Expected: 출력의 `노트 status: established`, 독립 출처 ≥2(Hario 공식/Hoffmann 등 authority) 제시, `rejected_claims: 없음`.

- [ ] **Step 4: 거짓 주장 픽스처로 실행 → 반려 확인**

같은 에이전트에 입력 초안:
> 노트 "V60 드리퍼" — 주장: "하리오 V60는 바닥이 평평한 평저형 드리퍼다."

Expected: `NOTE_REJECTED` 또는 해당 주장이 `rejected_claims`에 포함 + 반증 출처(V60는 원추형) 제시.

둘 중 하나라도 기대와 다르면 Step 2의 프롬프트(특히 "떨어뜨리려 시도"·"확신 없으면 낮춰")를 강화하고 Step 3~4 재실행.

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/wiki-verifier.md
git commit -m "feat(wiki): Verifier 서브에이전트 — 적대적 검증·등급 판정"
```

---

### Task 3: `/wiki-grow` 커맨드

**Files:**
- Create: `.claude/commands/wiki-grow.md`

**Interfaces:**
- Consumes: `wiki-verifier` 서브에이전트(Task 2)의 판정 출력, `schema.md` 규약, `queue.md`(인자 없을 때 입력).
- Produces: 통과 노트들을 `docs/wiki/<category>/<slug>.md`로 생성/갱신, stub 생성, `related` 양방향 링크, `_index.md`·`queue.md` 갱신. **사용자 승인 전 commit 금지.**

- [ ] **Step 1: 기대 동작(픽스처) 정의**

작은 단일 주제로 dry-run했을 때 다음이 보장돼야 한다:
- 기존 위키를 먼저 읽어 중복 노트를 새로 만들지 않는다.
- 각 새 노트가 `wiki-verifier`를 거친다(자기 검증 아님).
- 반려된 주장은 노트에 `established`로 남지 않는다.
- 새로 참조된 미작성 개념마다 `stub`이 생긴다.
- 마지막에 **요약을 제시하고 멈춘다**(승인 전 commit 없음).

- [ ] **Step 2: `.claude/commands/wiki-grow.md` 작성**

````markdown
---
description: 주제를 리서치(Collector)하고 Verifier 서브에이전트로 검증해 위키 노트를 만든다. 수집→검증→그래프 편입→사용자 리뷰. 승인 전 commit 안 함.
argument-hint: [주제] (생략 시 queue.md에서 다음 주제)
---

커피 지식 위키를 키운다. 규약: `docs/wiki/_meta/schema.md`.

## 입력 결정
- `$ARGUMENTS`가 있으면 그 주제.
- 없으면 `docs/wiki/_meta/queue.md`의 `## 대기` 첫 항목을 꺼낸다.

## 1. 계획
- 주제를 atomic 노트 단위로 분해한다.
- `docs/wiki/` 전체를 훑어 **이미 있는 노트 / 새로 만들 노트 / 링크만 걸 stub**을 구분한다(중복 생성 금지).

## 2. 수집 (Collector)
- 새 노트마다 초안을 쓴다. WebSearch/WebFetch로 리서치하되 **낙관적 draft**여도 된다 — 검증은 다음 단계.
- 초안에 찾은 출처를 frontmatter `sources`에 잠정 기록.

## 3. 검증 (Verifier 서브에이전트)
- 노트마다 `wiki-verifier` 서브에이전트를 Agent 도구로 dispatch한다. **절대 직접 자기 검증하지 마라.**
- 핵심 노트나 contested 후보는 서로 다른 렌즈(정확성/최신성/반증)로 `wiki-verifier`를 여러 번 dispatch한다.
- 판정 반영:
  - `established/contested/anecdotal` → frontmatter `status`에 박고 `last_verified`=오늘, `review_after`=+6개월.
  - `contested` → 본문에 `## 쟁점:` 블록 작성.
  - `rejected_claims` → 그 주장은 노트에서 빼거나 `anecdotal`로 분리. established로 남기지 않는다.
  - `revision_requests` → 본문 수정.

## 4. 그래프 편입
- 통과 노트를 `docs/wiki/<category>/<slug>.md`로 쓴다.
- `related` 링크를 **양방향**으로: 상대 노트에도 backlink를 추가한다.
- 본문이 새로 참조한 미작성 개념마다 `status: stub` 노트를 만든다(깨진 링크 금지).
- 해당 카테고리 대표가 생겼으면 `docs/wiki/_index.md` MOC를 갱신한다.
- 처리한 주제를 `queue.md`에서 체크/제거한다.

## 5. 리뷰 게이트 (필수)
사용자에게 요약을 제시하고 **멈춘다**:
- 새 노트 N개 (경로 + status 분포)
- contested 쟁점 요약
- 반려된 주장 목록
- 생성된 stub 목록
- 신선도 경고

사용자가 승인하면 그때 commit한다:
```bash
git add docs/wiki
git commit -m "wiki: <주제> 노트 추가 (검증 완료)"
```
승인 전에는 commit하지 않는다.
````

- [ ] **Step 3: 작은 주제로 dry-run 검증**

Run: `/wiki-grow 물의 경도(water hardness)와 추출` (또는 비슷한 작은 단일 주제)
관찰 체크리스트(모두 충족해야 통과):
- [ ] 시작 시 기존 `docs/wiki/`를 읽었다.
- [ ] 노트별로 `wiki-verifier`를 dispatch했다(자기 검증 아님).
- [ ] 새 참조 개념에 stub이 생겼다.
- [ ] `related`가 양쪽 노트에 들어갔다.
- [ ] **요약을 내고 commit 없이 멈췄다.**

하나라도 누락이면 Step 2 본문을 보강하고 재실행.

- [ ] **Step 4: 승인 → commit (dry-run 산출물 채택)**

dry-run 결과가 적절하면 승인하고 커맨드가 안내한 대로 commit. 부적절하면 생성물을 버리고(`git checkout -- docs/wiki` 또는 파일 삭제) Step 2 수정 후 재실행.

```bash
git add .claude/commands/wiki-grow.md
git commit -m "feat(wiki): /wiki-grow 커맨드 — 수집·검증·편입·리뷰"
```
(주: 커맨드 파일 자체 commit. dry-run으로 만들어진 노트는 Task 5 시딩과 합치거나 별도 commit.)

---

### Task 4: `/wiki-audit` 커맨드

**Files:**
- Create: `.claude/commands/wiki-audit.md`

**Interfaces:**
- Consumes: `docs/wiki/**` 노트들의 frontmatter, `schema.md` 규약.
- Produces: 터미널 리포트 + `queue.md`의 `## 재검증` 섹션 갱신. 위키 노트 내용은 변경하지 않는다(점검만).

- [ ] **Step 1: 기대 동작(픽스처) 정의**

audit이 잡아야 할 4종:
- `review_after`가 오늘보다 과거인 노트.
- `status: stub` 노트(미작성).
- 깨진 `[[링크]]`(가리키는 파일/stub 없음).
- `status: established`인데 `sources`가 빈 노트(무결성 위반).

검증용으로 일부러 깨진 노트를 임시 생성해 audit이 잡는지 본다.

- [ ] **Step 2: `.claude/commands/wiki-audit.md` 작성**

````markdown
---
description: 위키 신선도·무결성을 점검한다. review_after 지난 노트/stub/깨진 링크/출처 없는 established를 리포트하고 재검증 큐에 넣는다. 노트 내용은 안 고친다.
---

위키를 점검한다(읽기 전용 + queue 갱신만). 규약: `docs/wiki/_meta/schema.md`.

## 1. 수집
`docs/wiki/**/*.md`를 모두 읽어 frontmatter를 파싱한다(`_meta/` 제외).

## 2. 점검 항목
- **신선도 만료**: `review_after < 오늘`인 노트.
- **stub**: `status: stub`인 노트.
- **깨진 링크**: 본문/`related`의 `[[slug]]`가 실제 파일이나 stub을 가리키지 않음.
- **무결성**: `status: established`인데 `sources`가 비었거나, `contested`인데 `## 쟁점:` 블록이 없음.
- **단방향 링크**: A의 `related`에 B가 있는데 B에는 A가 없음.

## 3. 출력
터미널에 표로 리포트(카테고리별 건수 + 항목별 파일 목록).

## 4. 큐 갱신
신선도 만료·무결성 위반 노트를 `docs/wiki/_meta/queue.md`의 `## 재검증` 섹션에 `- [ ] <slug> — <사유>`로 추가한다(중복 방지). 다음 `/wiki-grow`가 처리한다.
**노트 본문은 고치지 않는다.**
````

- [ ] **Step 3: 깨진 픽스처로 검증**

임시로 무결성 위반 노트를 만든다:
```bash
mkdir -p docs/wiki/theory
cat > docs/wiki/theory/_audit-fixture.md <<'EOF'
---
title: 픽스처
slug: _audit-fixture
category: theory
status: established
last_verified: 2020-01-01
review_after: 2020-07-01
related: ["[[does-not-exist]]"]
---
출처 없는 established + 만료 + 깨진 링크.
EOF
```
Run: `/wiki-audit`
Expected: 리포트에 `_audit-fixture`가 **신선도 만료 + 무결성(출처 없는 established) + 깨진 링크** 세 항목 모두로 잡히고, `queue.md` `## 재검증`에 추가됨.

- [ ] **Step 4: 픽스처 제거 + 재확인**

```bash
rm docs/wiki/theory/_audit-fixture.md
```
queue.md에 들어간 픽스처 줄도 손으로 제거. Run: `/wiki-audit` → `_audit-fixture` 관련 항목이 더 이상 안 나오는지 확인.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/wiki-audit.md docs/wiki/_meta/queue.md
git commit -m "feat(wiki): /wiki-audit 커맨드 — 신선도·무결성 점검"
```

---

### Task 5: 시딩 — `brewing-research.md` → 검증된 노트

**Files:**
- Create: `docs/wiki/_meta/sources/brewing-research-2026.md` (원본 아카이브)
- Create: 시드 노트 다수 (`theory/`, `equipment/`, `method/`, `glossary/`)
- Modify: `docs/wiki/_index.md`(MOC), `docs/wiki/_meta/queue.md`
- Delete: `docs/brewing-research.md`(아카이브로 이동)

**Interfaces:**
- Consumes: `/wiki-grow`(Task 3), `wiki-verifier`(Task 2), 원본 `docs/brewing-research.md`.
- Produces: 위키의 첫 노트 묶음. 이후 모든 작업의 그래프 기반.

- [ ] **Step 1: 원본 아카이브**

```bash
git mv docs/brewing-research.md docs/wiki/_meta/sources/brewing-research-2026.md
```
이 파일은 **원출처**로 보존(추적성). 위키 노트가 아니라 시드 재료.

- [ ] **Step 2: 시딩 주제를 queue에 등록**

`docs/wiki/_meta/queue.md`의 `## 대기`에 분해 대상을 적는다(초안 매핑, 실제 분해는 wiki-grow가):
```markdown
- [ ] theory: percolation, extraction-yield, contact-time, brew-ratio
- [ ] equipment: v60-dripper, kalita-wave, flat-bottom-vs-conical
- [ ] method: hoffmann-v60, kasuya-4-6, april
- [ ] glossary: bloom, swirl, channeling
```

- [ ] **Step 3: `/wiki-grow`로 첫 묶음 생성(Verifier 통과)**

Run: `/wiki-grow` (인자 없음 → queue에서 꺼냄). 한 번에 한 주제 묶음씩, 여러 번 실행.
- 아카이브(`_meta/sources/brewing-research-2026.md`)를 1차 자료로 쓰되, **수치(예: 호프만 1:16.7, 온도 범위)는 Verifier가 실제 출처로 재확인**한다.
- 통과 못 한 수치는 `anecdotal` 강등 또는 쟁점으로 남긴다. **시딩이라고 무검증 통과 금지.**
- `method/hoffmann-v60.md` 등은 frontmatter `code:`에 대응 코드 경로를 적는다(예: `packages/domain/src/methods/hoffmann-v60.ts`).

- [ ] **Step 4: 검증 — 그래프 무결성**

각 `/wiki-grow` 묶음 후 리뷰 게이트에서 확인하고, 마지막에:
Run: `/wiki-audit`
Expected: 깨진 링크 0, 출처 없는 `established` 0. 남은 stub은 허용(의도된 확장 지점). `method/` 노트의 `code:` 경로가 실제 파일을 가리키는지 확인:
Run: `ls packages/domain/src/methods/`

- [ ] **Step 5: MOC 갱신 확인 + Commit**

`docs/wiki/_index.md`의 각 카테고리에 대표 노트 링크가 채워졌는지 확인(wiki-grow가 했어야 함; 누락 시 보강).
각 주제 묶음은 리뷰 승인 시 `/wiki-grow`가 안내한 메시지로 commit됨. 시딩 종료 후 정리 커밋이 필요하면:
```bash
git add docs/wiki
git commit -m "feat(wiki): brewing-research 시딩 — 첫 노트 묶음(검증 완료) + 원본 아카이브"
```

---

## Self-Review

**1. Spec coverage** (스펙 §별 → 태스크 매핑):
- §3 구조/레이아웃 → Task 1 ✅
- §4 노트 포맷/스키마 → Task 1(schema.md) ✅
- §5 검증 프로토콜/Verifier → Task 2 ✅
- §6 `/wiki-grow` → Task 3 ✅
- §7 `/wiki-audit` → Task 4 ✅
- §8 시딩 → Task 5 ✅
- §9 lint(v1.1) → 의도적으로 범위 밖(Global Constraints에 명시) ✅
- 폴더+태그 병행 → Task 1 폴더 + schema `tags` ✅
- Collector/Verifier 분리 → Task 2(agent) + Task 3(grow가 dispatch) ✅
- 양방향 링크/stub → Task 3 Step 2, Task 1 schema ✅
- Obsidian 호환 → Task 1 schema(YAML+`[[]]`) ✅

**2. Placeholder scan:** 각 산출물(schema.md, wiki-verifier.md, wiki-grow.md, wiki-audit.md)의 전체 내용을 본문에 포함함. "TBD/적절히 처리" 없음. ✅

**3. Type/이름 일관성:**
- `status` 4값(`established|contested|anecdotal|stub`) — schema/agent/grow/audit 전반 동일 ✅
- 출처 `kind`/`stance` 값 — schema와 agent 동일 ✅
- 서브에이전트 이름 `wiki-verifier` — Task 2 정의, Task 3에서 동일 이름 dispatch ✅
- Verifier 출력 필드(`rejected_claims`, `revision_requests`, `freshness_warnings`, `contested`) — Task 2 정의, Task 3에서 동일 명칭 소비 ✅
- queue.md 섹션(`## 대기`, `## 재검증`) — Task 1 생성, Task 3/4/5에서 동일 참조 ✅
