---
description: 열린 이슈를 "refining 필요" / "우선순위 가능"으로 분류하고, 후자에만 P0/P1/P2 부여
---

전체 열린 이슈를 분류한다. **GitHub에 라벨이나 코멘트를 쓰지 않는다 — 터미널 출력만.**

## 절차

### 1. 이슈 가져오기

```bash
gh issue list --state open --limit 100 --json number,title,labels,body
```

비어 있으면 "열린 이슈 없음" 출력 후 종료.

### 2. 두 버킷으로 분류

- **Ready for priority**: 라벨 중 `refined`가 있는 이슈
- **Needs refining**: 그 외 모든 열린 이슈

### 3. Ready 버킷에 우선순위 부여

각 이슈에 P0/P1/P2 + 한 줄 근거. 기준:

- **P0** — 사용자가 매일 부딪치는 정확성/안전 이슈. 계산 오류, 데이터 손실/유실, 빌드/배포 중단, 보안. **희소**.
- **P1** — 자주 쓰는 흐름의 마찰. 반복 요청되는 기능. 명확한 사용자 가치.
- **P2** — nice-to-have, 폴리시, 백로그성, 단발성 요청.

카테고리 라벨(`bug`/`idea`/`research`)이 있으면 참고:
- `bug` + 영향 큼 → 보통 P0~P1
- `idea` → 사용 빈도/영향 추정으로 P1~P2
- `research` → 답이 나와야 다음 행동이 결정되는지로 판단. 보통 P2

### 4. 출력 형식

```markdown
## Ready for priority (N개)

| Pri | # | 제목 | 근거 |
|-----|---|------|------|
| P0  | 12 | <제목> | <한 줄 근거> |
| P1  | 7  | <제목> | <한 줄 근거> |
| P2  | 5  | <제목> | <한 줄 근거> |

## Needs refining (M개)

`/refine <#>`로 구체화 필요:

- #N: <제목>
- #M: <제목>

## 제안

(선택) 가장 먼저 손대길 권하는 1~2개와 이유. 우선순위 결과를 그냥 나열만 하지 말고, "이번 주는 X부터" 식의 작은 행동 제안 1개.
```

### 5. 액션 제안

라벨/우선순위를 GitHub에 적용하고 싶으면 `gh issue edit <#> --add-label P0` 등을 본인이 직접 실행하거나, 명시적으로 "P0 라벨 적용해줘" 같은 후속 지시를 내릴 것.

P0/P1/P2 라벨이 레포에 없을 수 있음 — 처음 적용할 때 다음 명령 안내:

```bash
gh label create P0 --color B60205 --description "긴급/정확성/안전"
gh label create P1 --color D93F0B --description "흐름 마찰, 자주 요청"
gh label create P2 --color FBCA04 --description "nice-to-have, 백로그"
```
