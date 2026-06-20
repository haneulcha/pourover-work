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

`sources[].kind`: `peer-reviewed | authority | practitioner | anecdote`
`sources[].stance`: `supports | disputes | mixed`

## status 규칙 (Verifier 판정 결과)

- `established` — 독립 출처 ≥2 지지 + 신뢰할 반론 없음. **`sources` 비면 무결성 오류.**
- `contested` — 신뢰할 출처끼리 불일치. **본문에 `## 쟁점:` prose 블록 필수.**
- `anecdotal` — 단일 출처/실무 구전.
- `stub` — 링크 타깃용 미작성 노트. `sources` 없어도 됨.

## 본문 권장 섹션

`## 핵심`(한 문단) · `## 파라미터`(표, 해당 시) · `## 왜 이렇게 하는가` · `## 출처 노트` · (contested 시) `## 쟁점: <주제>`

## 쟁점 블록 예

```markdown
## 쟁점: 블룸 시간
- **입장 A — 30~45초** ([[james-hoffmann]], authority): CO2 배출 충분
- **입장 B — 더 길게/짧게** (Barista Hustle, practitioner): 로스팅 신선도 의존
- **현재 합의**: 없음. 로스팅 후 경과일 의존이라는 점만 공통.
```

## 원자성·링크 원칙

- 한 파일 = 한 개념. 길어지면 쪼개서 `[[링크]]`.
- 미작성 개념을 참조하면 `status: stub` 노트를 만들어 둔다(깨진 링크 금지).
- `related`는 양방향: A가 B를 가리키면 B도 A를 가리킨다.
