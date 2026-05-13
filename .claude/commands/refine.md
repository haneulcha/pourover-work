---
description: 키워드만 있는 이슈를 구체적 사양으로 풀어냄. 필요한 보충 정보만 사용자에게 물어보고, 본문 작성·적용은 자동.
argument-hint: <issue-number>
---

GitHub 이슈 #$ARGUMENTS를 구체화한다. 사용자에게는 **구체화에 필요한 보충 정보만** 묻는다. 본문 작성과 GitHub 적용은 별도 검토 없이 자동으로 수행한다.

## 절차

### 1. 현재 상태 읽기

```bash
gh issue view $ARGUMENTS --json number,title,body,labels,comments
```

이미 `refined` 라벨이 있으면 사용자에게 "이미 refined 상태인데 다시 다듬을까요?"라고 묻고 답을 기다린다.

### 2. 관련 코드/문서 탐색

제목·본문의 키워드를 추출해서 다음 위치를 우선 탐색:

- `packages/domain/src/` — 도메인 로직 (units, types, methods, session)
- `apps/web/src/features/` — 화면/기능
- `apps/web/src/ui/` — 공용 컴포넌트
- `apps/webhook/src/` — 텔레그램 봇/이슈 파이프라인
- `docs/` — 디자인 토큰/스펙

키워드와 매칭되는 파일·심볼·관련 메서드를 1~3개 찾는다. 무리해서 다 찾을 필요 없음.

### 3. 보충 질문 (필요할 때만)

이슈가 본문 없이 키워드만 있거나, 핵심 결정이 불명확해서 spec을 못 쓰는 경우에만 사용자에게 보충 질문을 던지고 답을 기다린다. 질문은 가능한 한 적게(최대 4개), 단답형으로.

추측해서 채울 수 있을 만큼 정보가 충분하면 질문하지 않는다.

### 4. 본문 작성 + 자동 적용

받은 답(또는 충분한 기존 정보)을 바탕으로 다음 형식의 본문을 작성하고, **사용자 검토 없이 바로 GitHub에 적용**한다.

```markdown
## Problem
<한 줄로 문제 진술>

## Scope
- **In**: <포함하는 것 1~3개>
- **Out**: <명시적으로 빼는 것>

## Acceptance criteria
- [ ] <체크 가능하고 검증 가능한 항목>
- [ ] <관찰 가능한 결과>

## Suggested approach
<고수준 1~3문장. 구현 디테일은 안 들어감>

## File pointers
- `path/to/file.ts:Lxx` — <왜 손대야 하는지>
- ...

---
_Original:_ <원본 본문 (있다면)>
```

작성 원칙:
- Acceptance criteria는 최소 2개, 최대 5개. 관찰/검증 가능한 항목 위주.
- File pointers는 실제로 존재하는 파일에 한정. 추측 금지.
- 보충 답이 부족해 spec이 부실해질 것 같으면 4번을 건너뛰고 추가 질문을 한 번 더 던진다.

### 5. 적용

`refined` 라벨이 레포에 없으면 먼저 만든다:

```bash
gh label list --json name --jq '.[].name' | grep -qx refined || \
  gh label create refined --color 0052cc --description "구체화 완료, 우선순위 부여 가능"
```

본문을 임시 파일에 쓰고 적용 + 라벨 부여:

```bash
TMPFILE=$(mktemp)
# 위에서 작성한 본문을 $TMPFILE에 저장
gh issue edit $ARGUMENTS -F "$TMPFILE"
gh issue edit $ARGUMENTS --add-label refined
rm "$TMPFILE"
```

완료 후 이슈 URL을 한 줄로 보고하고 종료. (적용한 본문을 다시 출력할 필요 없음 — 적용됐다는 사실과 링크만.)

### 6. 사용자가 사후 수정을 요청하면

적용 후에 사용자가 "수정: ..." 식으로 후속 지시를 내리면, 그에 따라 본문을 갱신해 다시 `gh issue edit -F`로 덮어쓴다. 라벨은 그대로 유지.
