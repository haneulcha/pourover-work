# Button 리디자인 — 공유 Button 컴포넌트 + 솔리드 프라이머리

- 날짜: 2026-07-09
- 상태: 승인됨 (구현 전)

## 목적

현재 12개 파일에 흩어진 인라인 `<button>` 스타일을 하나의 공유 Button 컴포넌트로 통합하면서, 시각 방향을 아웃라인 위주에서 **솔리드 프라이머리**로 전환한다. 주요 CTA는 청먹(심수 청록) 채움으로 무게감을 주고, 보조 액션은 아웃라인/고스트로 위계를 명확히 한다.

## 접근 (확정: 컴포넌트 토큰 레이어 방식)

CLAUDE.md 원칙 4("UI 리디자인 = 토큰만 수정")에 맞춰, 버튼 전용 컴포넌트 토큰을 semantic 토큰에 매핑하는 레이어를 둔다. 기존 `tokens/components/brewing.css`, `timeline.css` 선례와 일관.

기각한 대안: semantic 토큰 클래스를 Button.tsx에 직결하는 방식 — 파일 수는 적지만, 이후 버튼만의 시각 조정 시 컴포넌트를 다시 열어야 해서 원칙 4에 어긋남.

## 파일 구성

| 파일 | 내용 |
| --- | --- |
| `apps/web/src/ui/tokens/components/button.css` (신규) | `--btn-primary-bg/fg/hover/active`, `--btn-secondary-border`, `--btn-ghost-fg`, `--btn-radius`(→ `--radius-button`) 등을 semantic 토큰에 매핑. 라이트/다크는 semantic 레이어가 처리하므로 다크 블록 불필요. |
| `apps/web/src/ui/Button.tsx` (신규) | variant/size → 클래스 문자열 맵 + `cx()` 병합. 나머지 props는 `<button>`에 스프레드. `type="button"` 기본값. |
| `apps/web/src/ui/Button.test.tsx` (신규) | variant별 클래스 적용, className 병합, disabled 렌더 확인. |

## API

```tsx
<Button variant="primary" | "secondary" | "ghost" size="md" | "sm" {...nativeButtonProps} />
```

- 기본값: `variant="primary"`, `size="md"`, `type="button"`.
- 전체 폭은 `className="w-full"` 전달로 처리 (`cx()` 병합). 전용 prop을 만들지 않는다.

## Variants

| variant | 모양 | 용도 |
| --- | --- | --- |
| `primary` | 청먹 솔리드 채움 + `text-on-primary`, hover→`accent-hover`, active→`accent-active` | 시작 CTA, 다이얼로그 확인 |
| `secondary` | 투명 배경 + hairline 테두리, hover→`surface-strong` | customize, 보조 액션 |
| `ghost` | 테두리·배경 없음, `text-secondary`, hover→`surface-strong` | 취소, 위험 액션(경고색 텍스트는 className으로) |

## Sizes

- `md`: `py-3`, 본문 크기 — CTA용. 기본값.
- `sm`: `py-2`, `text-body-sm` — 보조 액션용.

## 공통 상태

- focus-visible: `--color-focus-ring` 링.
- disabled: opacity 감소 + pointer 차단.
- transition: 기존 `transition-colors` 유지.

## 마이그레이션 (이번 PR 범위)

핵심 화면의 주요 버튼만 교체. 아이콘 버튼·Segmented성 버튼은 범위 제외(다음 PR).

- `RecipeScreen`: 시작 CTA → `primary`, customize → `secondary`
- `BrewingScreen`: 중단/완료 버튼
- `CompleteScreen`
- `StopConfirmDialog`: 확인/취소

## 테스트

- `Button.test.tsx`: variant별 클래스, className 병합, disabled.
- 기존 화면 테스트(예: Footer.test.tsx 스타일)는 렌더 결과가 바뀌는 부분만 갱신.
