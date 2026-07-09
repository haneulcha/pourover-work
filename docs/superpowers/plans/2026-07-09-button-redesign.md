# Button 리디자인 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유 `Button` 컴포넌트(primary/secondary/ghost × md/sm)를 컴포넌트 토큰 레이어와 함께 만들고, 핵심 화면(Recipe/Complete/StopConfirmDialog)의 인라인 버튼을 교체한다. 주요 CTA는 청먹 솔리드 채움으로 전환.

**Architecture:** `tokens/components/button.css`에 `--btn-*` 토큰을 semantic 토큰에 매핑(라이트/다크는 semantic이 처리, 다크 블록 불필요) → `tailwind.config.ts`에 `btn` 색/radius 유틸리티 등록(brewing 색 선례와 동일 패턴) → `src/ui/Button.tsx`는 variant/size → 클래스 맵 + `cx()` 병합만 하는 얇은 컴포넌트.

**Tech Stack:** React 19 + TypeScript strict, Tailwind 3 + CSS 변수 토큰, Vitest 2 + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-09-button-redesign-design.md`

## Global Constraints

- 하드코딩 색/스페이싱 금지 — 모든 값은 토큰 CSS 변수 경유 (CLAUDE.md 원칙 4).
- focus ring은 `globals.css`의 전역 `*:focus-visible`이 처리 — Button에 별도 focus 스타일 넣지 않는다.
- 새 prop 최소화: `variant`, `size`만. 전체 폭·높이는 `className` 전달.
- 커밋은 태스크마다 1회, `feat/button-redesign` 브랜치.

## 스펙 대비 조정 (플랜 단계에서 발견)

1. **BrewingScreen 제외**: 스펙은 BrewingScreen 버튼을 교체 대상에 넣었지만, 실제 코드의 버튼 2개(소리 토글, "길게 눌러 중단")는 brewing 도메인 테마 색(`fgMuted` — 리드인 시 화면 전체 색 반전에 연동)을 쓰는 caption 텍스트 버튼이다. 표준 Button ghost로 바꾸면 `text-btn-ghost-fg`와 동적 `fgMuted` 클래스가 충돌한다. **이번 PR에서 제외**하고 스펙의 마이그레이션 목록에서 삭제.
2. **radius**: `--btn-radius: var(--radius-button)` + Tailwind `rounded-btn` 유틸리티로 노출 — 버튼만의 radius 조정도 button.css에서 가능하게.

## File Structure

| 파일 | 역할 |
| --- | --- |
| `apps/web/src/ui/tokens/components/button.css` (신규) | `--btn-*` → semantic 매핑. 버튼 시각 리디자인의 단일 출처. |
| `apps/web/src/ui/globals.css` (수정) | button.css import 1줄 추가. |
| `apps/web/tailwind.config.ts` (수정) | `colors.btn.*`, `borderRadius.btn` 등록. |
| `apps/web/src/ui/Button.tsx` (신규) | variant/size 클래스 맵. 로직 없음. |
| `apps/web/src/ui/Button.test.tsx` (신규) | 기본값·variant·className 병합·disabled. |
| `apps/web/src/features/recipe/RecipeScreen.tsx` (수정) | 시작 CTA → primary, customize → secondary. |
| `apps/web/src/features/brewing/StopConfirmDialog.tsx` (수정) | 계속하기 → ghost, 처음으로 → primary. |
| `apps/web/src/features/complete/CompleteScreen.tsx` (수정) | 공유 → secondary, 처음으로 → primary. |
| `docs/superpowers/specs/2026-07-09-button-redesign-design.md` (수정) | BrewingScreen 제외 반영. |

---

### Task 1: Button 컴포넌트 + 컴포넌트 토큰

**Files:**
- Create: `apps/web/src/ui/tokens/components/button.css`
- Modify: `apps/web/src/ui/globals.css` (import 블록)
- Modify: `apps/web/tailwind.config.ts` (`colors`, `borderRadius`)
- Create: `apps/web/src/ui/Button.tsx`
- Test: `apps/web/src/ui/Button.test.tsx`

**Interfaces:**
- Consumes: `cx` (`apps/web/src/ui/cx.ts`), semantic 토큰 CSS 변수.
- Produces: `Button` 컴포넌트 — `type Props = ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: "primary" | "secondary" | "ghost"; readonly size?: "md" | "sm" }`. 기본값 `variant="primary"`, `size="md"`, `type="button"`. Task 2~4가 `import { Button } from "@/ui/Button"`으로 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/ui/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("기본값: primary variant, md size, type=button", () => {
    render(<Button>시작</Button>);
    const btn = screen.getByRole("button", { name: "시작" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.className).toContain("bg-btn-primary-bg");
  });

  it("variant별 클래스 적용", () => {
    render(
      <>
        <Button variant="secondary">보조</Button>
        <Button variant="ghost">취소</Button>
      </>,
    );
    expect(
      screen.getByRole("button", { name: "보조" }).className,
    ).toContain("border-btn-secondary-border");
    expect(screen.getByRole("button", { name: "취소" }).className).toContain(
      "text-btn-ghost-fg",
    );
  });

  it("size=sm 클래스 적용", () => {
    render(<Button size="sm">작게</Button>);
    expect(screen.getByRole("button", { name: "작게" }).className).toContain(
      "text-body-sm",
    );
  });

  it("className 병합", () => {
    render(<Button className="w-full">시작</Button>);
    expect(screen.getByRole("button").className).toContain("w-full");
  });

  it("native props 전달 (disabled, onClick)", async () => {
    render(<Button disabled>시작</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun run --filter @pourover/web test:run -- src/ui/Button.test.tsx`
Expected: FAIL — "Cannot find module './Button'" 류의 import 에러.

- [ ] **Step 3: 토큰 파일 작성**

`apps/web/src/ui/tokens/components/button.css`:

```css
/* Button 컴포넌트 토큰 — 버튼 시각 리디자인의 단일 출처.
   semantic 토큰만 참조하므로 라이트/다크 분기는 semantic 레이어가 처리 (다크 블록 불필요). */

:root {
  --btn-primary-bg: var(--color-accent-primary);
  --btn-primary-bg-hover: var(--color-accent-hover);
  --btn-primary-bg-active: var(--color-accent-active);
  --btn-primary-fg: var(--color-text-on-primary);

  --btn-secondary-border: var(--color-bg-hairline);
  --btn-secondary-fg: var(--color-text-body);

  --btn-ghost-fg: var(--color-text-body);

  /* secondary/ghost 공용 hover 배경 */
  --btn-hover-bg: var(--color-bg-strong);

  --btn-radius: var(--radius-button);
}
```

- [ ] **Step 4: globals.css에 import 추가**

`apps/web/src/ui/globals.css`의 import 블록 마지막 줄 뒤에:

```css
@import "./tokens/components/button.css";
```

(`@import "./tokens/components/timeline.css";` 바로 다음 줄, `@tailwind base;` 이전.)

- [ ] **Step 5: tailwind.config.ts에 btn 유틸리티 등록**

`borderRadius`에 추가:

```ts
btn: "var(--btn-radius)",
```

`colors`에 추가 (`timeline` 엔트리 뒤):

```ts
btn: {
  "primary-bg": "var(--btn-primary-bg)",
  "primary-hover": "var(--btn-primary-bg-hover)",
  "primary-active": "var(--btn-primary-bg-active)",
  "primary-fg": "var(--btn-primary-fg)",
  "secondary-border": "var(--btn-secondary-border)",
  "secondary-fg": "var(--btn-secondary-fg)",
  "ghost-fg": "var(--btn-ghost-fg)",
  "hover-bg": "var(--btn-hover-bg)",
},
```

- [ ] **Step 6: Button 컴포넌트 구현**

`apps/web/src/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: Variant;
  readonly size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-btn-primary-bg font-medium text-btn-primary-fg hover:bg-btn-primary-hover active:bg-btn-primary-active",
  secondary:
    "border border-btn-secondary-border text-btn-secondary-fg hover:bg-btn-hover-bg",
  ghost: "text-btn-ghost-fg hover:bg-btn-hover-bg",
};

const sizeClasses: Record<Size, string> = {
  md: "px-4 py-3",
  sm: "px-3 py-2 text-body-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-3 rounded-btn transition-colors disabled:pointer-events-none disabled:opacity-disabled",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    />
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `bun run --filter @pourover/web test:run -- src/ui/Button.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 8: lint + typecheck**

Run: `bun run --filter @pourover/web lint && bun run --filter @pourover/web typecheck`
Expected: 에러 없음 (stylelint가 button.css 토큰 규약 검사).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/ui/tokens/components/button.css apps/web/src/ui/globals.css apps/web/tailwind.config.ts apps/web/src/ui/Button.tsx apps/web/src/ui/Button.test.tsx
git commit -m "feat(ui): 공유 Button 컴포넌트 + 컴포넌트 토큰 레이어 (primary/secondary/ghost)"
```

---

### Task 2: RecipeScreen 버튼 교체

**Files:**
- Modify: `apps/web/src/features/recipe/RecipeScreen.tsx:271-284` (start button 블록)

**Interfaces:**
- Consumes: `Button` (Task 1) — `import { Button } from "@/ui/Button"`.
- Produces: 없음 (말단 화면 수정).

- [ ] **Step 1: 시작 CTA → primary, customize → secondary 교체**

기존 (271행 근처, `{/* start button */}` 블록):

```tsx
<button
  type="button"
  onClick={onStart}
  className="w-full flex items-center justify-center gap-3 rounded-button border border-text-primary bg-surface-soft py-3 transition-colors hover:bg-surface-strong"
>
  시작
</button>
<button
  type="button"
  onClick={onCustomize}
  className="w-full flex items-center justify-center gap-3 rounded-button border border-surface-hairline py-2 text-body-sm text-text-secondary transition-colors hover:bg-surface-strong"
>
  {isCustom ? "Edit custom recipe" : "Customize this recipe"}
</button>
```

교체 후:

```tsx
<Button onClick={onStart} className="w-full">
  시작
</Button>
<Button variant="secondary" size="sm" onClick={onCustomize} className="w-full">
  {isCustom ? "Edit custom recipe" : "Customize this recipe"}
</Button>
```

파일 상단에 import 추가: `import { Button } from "@/ui/Button";`

- [ ] **Step 2: 테스트 + lint**

Run: `bun run --filter @pourover/web test:run && bun run --filter @pourover/web lint`
Expected: PASS. (RecipeScreen 전용 테스트는 없음 — 전체 web 스위트 그린 확인.)

- [ ] **Step 3: 브라우저 확인**

dev 서버(http://localhost:5174)에서 레시피 화면의 시작 버튼이 청먹 솔리드 + 밝은 글자인지, 라이트/다크 모두 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/recipe/RecipeScreen.tsx
git commit -m "feat(recipe): 시작 CTA를 솔리드 primary Button으로 전환"
```

---

### Task 3: StopConfirmDialog 버튼 교체

**Files:**
- Modify: `apps/web/src/features/brewing/StopConfirmDialog.tsx:26-39`

**Interfaces:**
- Consumes: `Button` (Task 1).
- Produces: 없음.

- [ ] **Step 1: 계속하기 → ghost, 처음으로 → primary 교체**

기존:

```tsx
<button
  type="button"
  onClick={onCancel}
  className="h-11 flex-1 rounded-button border border-surface-hairline text-body-sm text-text-secondary transition-colors hover:bg-surface-strong"
>
  계속하기
</button>
<button
  type="button"
  onClick={onConfirm}
  className="h-11 flex-1 rounded-button border border-text-primary bg-surface-soft text-body-sm font-medium transition-colors hover:bg-surface-strong"
>
  처음으로
</button>
```

교체 후:

```tsx
<Button variant="ghost" size="sm" onClick={onCancel} className="h-11 flex-1">
  계속하기
</Button>
<Button size="sm" onClick={onConfirm} className="h-11 flex-1">
  처음으로
</Button>
```

파일 상단에 import 추가: `import { Button } from "@/ui/Button";`

주의: 오버레이 scrim `<button>`(9행)은 시각 버튼이 아니므로 교체하지 않는다.

- [ ] **Step 2: 테스트 실행**

Run: `bun run --filter @pourover/web test:run -- src/features/brewing/StopConfirmDialog.test.tsx`
Expected: PASS (기존 테스트는 role/텍스트 기반 — 클래스 무관).

- [ ] **Step 3: 브라우저 확인**

브루잉 시작 → "길게 눌러 중단" 탭 → 다이얼로그에서 "처음으로"가 청먹 솔리드, "계속하기"가 고스트인지 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/brewing/StopConfirmDialog.tsx
git commit -m "feat(brewing): 중단 다이얼로그 버튼을 공유 Button으로 교체 (확인=primary, 취소=ghost)"
```

---

### Task 4: CompleteScreen 버튼 교체

**Files:**
- Modify: `apps/web/src/features/complete/CompleteScreen.tsx:106-120`

**Interfaces:**
- Consumes: `Button` (Task 1).
- Produces: 없음.

- [ ] **Step 1: 공유 → secondary, 처음으로 → primary 교체**

기존:

```tsx
<button
  type="button"
  onClick={() => setShareOpen(true)}
  aria-label="공유"
  className="w-16 rounded-button border border-text-primary bg-surface-soft py-3 text-text-primary transition-colors hover:bg-surface-strong"
>
  공유
</button>
<button
  type="button"
  onClick={onExit}
  className="flex-1 rounded-button border border-text-primary bg-surface-soft py-3 transition-colors hover:bg-surface-strong"
>
  처음으로
</button>
```

교체 후:

```tsx
<Button
  variant="secondary"
  onClick={() => setShareOpen(true)}
  aria-label="공유"
  className="w-16"
>
  공유
</Button>
<Button onClick={onExit} className="flex-1">
  처음으로
</Button>
```

파일 상단에 import 추가: `import { Button } from "@/ui/Button";`

주의: 느낌 선택 버튼들(83행, `aria-pressed` 토글 카드)은 selection 컨트롤이므로 교체하지 않는다.

- [ ] **Step 2: 테스트 실행**

Run: `bun run --filter @pourover/web test:run -- src/features/complete/CompleteScreen.test.tsx`
Expected: PASS.

- [ ] **Step 3: 브라우저 확인**

완료 화면에서 "처음으로"=솔리드 primary, "공유"=아웃라인 secondary 위계 확인.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/complete/CompleteScreen.tsx
git commit -m "feat(complete): 완료 화면 버튼을 공유 Button으로 교체 (처음으로=primary, 공유=secondary)"
```

---

### Task 5: 스펙 문서 갱신 + 전체 검증

**Files:**
- Modify: `docs/superpowers/specs/2026-07-09-button-redesign-design.md` (마이그레이션 섹션)

**Interfaces:**
- Consumes: Task 1~4 완료 상태.
- Produces: 최종 그린 브랜치.

- [ ] **Step 1: 스펙의 마이그레이션 목록에서 BrewingScreen 제거**

`## 마이그레이션 (이번 PR 범위)` 섹션의 `- \`BrewingScreen\`: 중단/완료 버튼` 줄을 다음으로 교체:

```markdown
- ~~`BrewingScreen`~~ — 제외: 소리 토글·"길게 눌러 중단"은 brewing 도메인 테마 색(`fgMuted`, 리드인 연동)에 묶인 caption 버튼이라 표준 Button과 색 체계가 충돌. brewing 컴포넌트 토큰 영역으로 남긴다.
```

- [ ] **Step 2: 전체 검증**

Run: `bun run typecheck && bun run lint && bun run test:run`
Expected: 모든 워크스페이스 그린.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-09-button-redesign-design.md
git commit -m "docs: Button 스펙 — BrewingScreen 제외 사유 반영"
```
