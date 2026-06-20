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
- 노트마다 `wiki-verifier` 서브에이전트를 Agent 도구로 dispatch한다(`subagent_type: wiki-verifier`). **절대 직접 자기 검증하지 마라.**
  - 만약 `wiki-verifier` 에이전트 타입을 찾지 못하면(세션에 아직 등록 안 됨), 사용자에게 "세션 재시작 후 다시 실행" 또는 "이번에는 `.claude/agents/wiki-verifier.md` 지침을 general-purpose 에이전트에 임베드해 검증"을 제안하고 멈춘다.
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
