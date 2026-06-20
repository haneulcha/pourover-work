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
