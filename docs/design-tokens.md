# Design Tokens

`design.md` § Architecture의 보조 문서. 색/타이포/모션의 의미·선택 근거는 `brand.md`, 실제 값과 레이어 구조는 이 문서.

토큰 명명·구조는 `figma-system.json` + `DESIGN.md` (Untitled archetype) 정합. 단, 색·반경 등 **값은 brand 정체성("뜸" — warm modern, 카페 정취) 유지**. Figma 파일은 spec 값 그대로, 코드는 brand 값 — 명명 규칙만 1:1 매칭.

## Principles

1. **3-layer 분리**. primitive → semantic → component-domain. 각 레이어는 한 단계 위만 참조.
2. **컴포넌트는 semantic 또는 component-domain 토큰만 참조**. primitive 직접 사용 금지.
3. **Tailwind 클래스 우선**. 인라인 `var(--*)`는 SVG fill·stroke 등 Tailwind로 표현 불가한 곳에 한해.
4. **Raw size 클래스 금지**. 모든 텍스트는 named text style (`text-heading-md`, `text-body-sm` 등) 사용. Tailwind 기본 `text-xs/sm/md/lg/xl/2xl`·`text-[Npx]` 차단.
5. **UI 리디자인 = 토큰 값만 수정**. 컴포넌트 마크업은 건드리지 않는 수준이 목표.

## Layer Structure

```
primitives                semantic (role)              component (Tailwind)
─────────────────         ─────────────────────        ─────────────────────
--neutral-0          →    --color-bg-canvas      →    bg-surface
--neutral-900        →    --color-text-ink       →    text-text-ink
--accent-500         →    --color-accent-primary →    bg-accent
--red-500            →    --color-status-error-text →  text-status-error-text

primitives                component-domain             component (Tailwind)
─────────────────         ─────────────────────        ─────────────────────
--accent-500         →    --color-pour-main      →    bg-pour-main
                          --color-brewing-liquid-top →  bg-brewing-liquid-top
```

## File Layout

```
src/ui/tokens/
├── primitives.css         # raw color scales (neutral, accent, status)
├── typography.css         # font families, raw font-size/lh/ls
├── motion.css             # duration, easing
├── layout.css             # spacing, z-index, opacity, sizes
├── elevation.css          # radius role aliases + shadow tier
├── semantic.css           # role-only color tokens (bg/text/accent/status/overlay)
└── components/
    ├── brewing.css        # liquid stops, meniscus, ring-on-liquid, rim/cup shadow
    └── timeline.css       # pour-bloom/main, timeline-axis/grid
```

`globals.css` import 순서: `primitives → typography → motion → layout → elevation → semantic → components/*`. semantic이 elevation/typography/layout을 참조하는 경우 없음(별도 namespace), 단 import 순서로 cascade 안전 확보.

## Primitive Tokens

### Neutral scale (ivory → espresso)

```css
--neutral-0: #fbf7ef;   /* brand bg 밝은 한계 — bg/canvas 앵커 */
--neutral-50: #f5efe4;
--neutral-100: #ebe3d2;
--neutral-200: #d8cab3;
--neutral-300: #bfae92;
--neutral-400: #9e8e74;
--neutral-500: #7a6c56;
--neutral-600: #5b503e;
--neutral-700: #4a4133;
--neutral-800: #3a2f26;
--neutral-900: #2a241e;  /* brand ink 어두운 한계 */
--neutral-950: #1c1813;
```

### Accent scale (muted ochre)

```css
--accent-50:  #faf1e0;
--accent-100: #f2deb8;
--accent-200: #e5c289;
--accent-300: #d4a25c;
--accent-400: #c48f46;
--accent-500: #b8843f;  /* 주 accent */
--accent-600: #a86832;  /* hover */
--accent-700: #8a5528;  /* active */
--accent-800: #6e4420;
--accent-900: #543319;
```

### Status scales (50 / 500 pair, warm-adjusted)

spec 4 status × 2 variants (50 = bg, 500 = text):

```css
--red-50: #fbeae6;     --red-500: #c45a4d;
--green-50: #eef5ea;   --green-500: #6b9360;
--amber-50: #faf0d9;   --amber-500: #d49a3c;
--blue-50: #eaf1f8;    --blue-500: #4a78a3;
```

### Typography primitives (`typography.css`)

```css
--font-sans: "Pretendard Variable", "Pretendard", "Inter", ..., sans-serif;
--font-mono: "Geist Mono", "IBM Plex Mono", "D2Coding", ..., monospace;

/* Raw font-size scale — named text style 정의에서만 사용 */
--font-size-{10,11,12,14,16,18,20,24,32,48,64}: …px;

/* Brand-domain hero (spec 외) */
--font-size-hero-sm: 72px;        /* Complete 히어로 */
--font-size-hero-lg: 96px;        /* Brewing 타이머 */
--font-size-brewing-hero: clamp(32px, 6.5vh, 48px);

/* Line-height / letter-spacing */
--line-height-{tight,snug,base}: {1, 1.2, 1.5};
--letter-spacing-{tight,wide,wider,widest}: {-0.02em, 0.05em, 0.08em, 0.12em};
```

### Spacing primitives (`layout.css`)

spec 정합 8단계:

```css
--space-xxs: 4px;   --space-xs:  8px;
--space-sm:  12px;  --space-md:  16px;
--space-lg:  24px;  --space-xl:  32px;
--space-xxl: 48px;  --space-section: 80px;
```

Tailwind `spacing` extend로 노출: `gap-md`, `p-lg`, `mt-section` 등.

### Motion primitives (`motion.css`)

```css
--motion-duration-base: 320ms;
--motion-duration-long: 450ms;
--motion-easing: cubic-bezier(0.2, 0.8, 0.2, 1);

/* Screen transitions */
--motion-duration-screen: 600ms;
--motion-easing-screen: cubic-bezier(0.34, 1.12, 0.36, 1);
```

## Elevation (`elevation.css`)

### Radius role aliases (spec 명명)

| 별칭 | 값 | 용도 |
|---|---|---|
| `--radius-subtle` | 6px | badge, tag 등 미세 |
| `--radius-button` | 10px | CTA 버튼 |
| `--radius-input`  | 6px  | 폼 입력, 셀렉트 |
| `--radius-card`   | 10px | 카드, 팝오버 |
| `--radius-large`  | 20px | 다이얼로그, 시트 |
| `--radius-pill`   | 9999px | 진행 바, 둥근 칩 |

Tailwind: `rounded-subtle`, `rounded-button` (DEFAULT), `rounded-input`, `rounded-card`, `rounded-large`, `rounded-pill`.

**금지**: 컴포넌트에서 Tailwind 기본 `rounded-{sm|md|lg|xl|2xl|3xl|full}`, `rounded-[Npx]` arbitrary.

### Shadow tier (4 levels)

부상 레이어에 한해 **매우 옅은** 그림자. 일반 UI는 톤 차이로 경계.

| Tier | 토큰 | 용도 |
|---|---|---|
| Hairline | `--shadow-hairline` | 1px ring, 세그먼트 선택 등 미세 부상 |
| Raised | `--shadow-raised` | 머무는 카드, 작은 부상 |
| Floating | `--shadow-floating` | 드롭다운, 팝오버 |
| Overlay | `--shadow-overlay` | 모달 다이얼로그 |

Tailwind: `shadow-hairline`, `shadow-raised`, `shadow-floating`, `shadow-overlay`. Brewing inset 그림자(`shadow-rim-inset`, `shadow-cup-inset`)는 `components/brewing.css`에서 별도.

**금지**: Tailwind 기본 `shadow-{sm|md|lg|xl|2xl|inner}`, `shadow-[...]` arbitrary.

## Semantic Tokens (`semantic.css`)

role-only. 도메인 토큰 절대 금지.

### Light (default, `:root`)

```css
/* Background — spec bg/* 슬롯 */
--color-bg-canvas:   var(--neutral-0);
--color-bg-soft:     var(--neutral-50);
--color-bg-strong:   var(--neutral-100);
--color-bg-card:     var(--neutral-0);
--color-bg-hairline: var(--neutral-200);

/* Text — spec text/* 슬롯 */
--color-text-ink:         var(--neutral-900);
--color-text-body:        var(--neutral-700);
--color-text-body-strong: var(--neutral-900);
--color-text-muted:       var(--neutral-500);
--color-text-on-primary:  var(--neutral-0);

/* Accent */
--color-accent-primary: var(--accent-500);
--color-accent-hover:   var(--accent-600);
--color-accent-active:  var(--accent-700);
--color-focus-ring:     var(--accent-400);

/* Status — bg + text 쌍 */
--color-status-error-bg:     var(--red-50);
--color-status-error-text:   var(--red-500);
--color-status-success-bg:   var(--green-50);
--color-status-success-text: var(--green-500);
--color-status-warning-bg:   var(--amber-50);
--color-status-warning-text: var(--amber-500);
--color-status-info-bg:      var(--blue-50);
--color-status-info-text:    var(--blue-500);

/* Overlay */
--color-overlay-scrim: rgba(44, 40, 35, 0.45);
```

### Dark (`[data-theme="dark"]`)

위 색상만 재지정. typography / spacing / z-index / opacity / size는 light/dark 공용.

```css
[data-theme="dark"] {
  --color-bg-canvas:   var(--neutral-900);
  --color-bg-soft:     var(--neutral-800);
  --color-bg-strong:   var(--neutral-700);
  --color-bg-card:     var(--neutral-900);
  --color-bg-hairline: var(--neutral-700);

  --color-text-ink:         var(--neutral-50);
  --color-text-body:        var(--neutral-200);
  --color-text-body-strong: var(--neutral-0);
  --color-text-muted:       var(--neutral-400);
  --color-text-on-primary:  var(--neutral-900);

  --color-accent-primary: var(--accent-400);
  --color-accent-hover:   var(--accent-300);
  --color-accent-active:  var(--accent-200);
  --color-focus-ring:     var(--accent-300);

  /* Status bg는 dark에서 alpha tint로 재지정 */
  --color-status-error-bg:   rgba(196, 90, 77, 0.15);
  --color-status-success-bg: rgba(107, 147, 96, 0.15);
  /* … */

  --color-overlay-scrim: rgba(0, 0, 0, 0.6);
}
```

## Component-Domain Tokens

semantic으로 표현하기 부적절한 도메인 전용 값. 한 파일 = 한 도메인.

### Brewing (`components/brewing.css`)

```css
--color-brewing-liquid-{top,mid,deep,bottom}: …;  /* 4-stop liquid gradient */
--color-meniscus-highlight: …;                    /* 액체 표면 하이라이트 */
--color-ring-future, --color-ring-on-liquid, --color-ring-on-liquid-label: …;
--color-text-on-liquid: …;                        /* drawdown hero 위 텍스트 */
--shadow-rim-inset, --shadow-cup-inset: …;        /* 컵 내부 inset 그림자 */
--brewing-rim-height: 92px;
--brewing-hero-gap: 12px;
```

Tailwind: `bg-brewing-liquid-top` 등, `text-text-on-liquid`, `shadow-rim-inset`, `h-brewing-rim`, `text-brewing-hero`.

### Timeline / Pour (`components/timeline.css`)

```css
--color-pour-bloom: var(--accent-300);
--color-pour-main:  var(--accent-500);
--color-timeline-axis: var(--neutral-300);
--color-timeline-grid: var(--neutral-100);
```

Tailwind: `bg-pour-bloom`, `bg-pour-main`, `bg-timeline-axis`, `bg-timeline-grid`.

## Typography — Named Text Styles (Tailwind utility)

`tailwind.config.ts`의 `fontSize` extend로 **heading / body / caption 3 계열만** 정의. 각 utility는 size + line-height + (있으면) letter-spacing + font-weight를 한꺼번에 적용. 다른 의미적 변형(button, badge, code, hero 등)은 위 3계열 + `font-*` / `tracking-*` / `font-mono` utility 조합으로 표현.

| Category | Utility | size / weight / lh / ls |
|---|---|---|
| Heading | `text-heading-xl` | 64 / 500 / 1.1 / -0.02em |
| | `text-heading-lg` | 48 / 500 / 1.1 / -0.02em |
| | `text-heading-md` | 32 / 600 / 1.2 / 0 |
| | `text-heading-sm` | 24 / 600 / 1.3 / 0 |
| | `text-heading-xs` | 18 / 600 / 1.4 / 0 |
| | `text-heading-xxs` | 16 / 600 / 1.4 / 0 |
| Body | `text-body-lg` | 20 / 400 / 1.5 / 0 |
| | `text-body-md` | 16 / 400 / 1.5 / 0 |
| | `text-body-sm` | 14 / 400 / 1.5 / 0 |
| Caption | `text-caption-md` | 14 / 400 / 1.4 / 0 |
| | `text-caption-sm` | 12 / 400 / 1.4 / 0 |
| | `text-caption-xs` | 11 / 400 / 1.3 / 0 |
| | `text-caption-xxs` | 10 / 400 / 1.3 / 0 |

조합 예시:
- 코드 텍스트: `text-body-sm font-mono`
- 버튼 라벨: `text-body-md font-medium`
- 배지: `text-caption-sm font-semibold uppercase tracking-wide`
- 네비 링크: `text-body-sm font-medium`

named style이 weight를 포함하더라도, 마크업에서 `font-medium` 등을 추가하면 Tailwind utility 순서상 fontWeight가 fontSize보다 후순위 → override 됨. 의식적 override OK.

**금지**: `text-{base|2xs|xs|sm|md|lg|xl|2xl|3xl..9xl}` raw size, `text-[Npx]` arbitrary. ESLint로 자동 차단.

## Other Utilities

### Z-index

```css
--z-popover: 20;
--z-dialog: 30;
```

Tailwind: `z-popover`, `z-dialog`. **금지**: 기본 `z-{0..50|auto}`, `z-[...]` arbitrary.

### Opacity

```css
--opacity-disabled: 0.4;
--opacity-dim: 0.6;
--opacity-muted: 0.88;
```

Tailwind: `opacity-disabled`, `opacity-dim`, `opacity-muted`. semantic이 있는 값은 alias 우선.

### Size

```css
--size-popover-min: 11rem;
--size-progress-rail: 2px;
```

Tailwind: `min-w-popover`, `h-progress-rail`.

## Tailwind Mapping (요약)

`tailwind.config.ts` extend:

| 영역 | 키 | 출처 |
|---|---|---|
| `colors.surface.{DEFAULT,soft,strong,card,hairline}` | bg/* | semantic |
| `colors.text.{primary,secondary,muted,on-accent,on-liquid}` | text/* | semantic + brewing |
| `colors.accent.{DEFAULT,hover,active}` | accent/* | semantic |
| `colors.{danger,warning,success}` | status/*-text | semantic |
| `colors.overlay.scrim`, `colors.focus` | overlay, focus | semantic |
| `colors.brewing.*`, `colors.pour.*`, `colors.ring.*`, `colors.timeline.*` | domain | components/* |
| `borderRadius.{subtle,button,input,card,large,pill}` | radius role | elevation |
| `boxShadow.{hairline,raised,floating,overlay}` | shadow tier | elevation |
| `boxShadow.{rim-inset,cup-inset}` | brewing | components/brewing |
| `fontSize.{heading,body,caption}-*` | named styles (3 계열) | tailwind extend |
| `fontFamily.{sans,mono}` | family chain | typography |
| `spacing.{xxs..section}` | 8 step scale | layout |

사용 예: `<div className="bg-surface text-text-primary rounded-card shadow-raised p-md gap-sm" />`.

> Tailwind 색상 클래스명(`text-text-primary`, `bg-danger` 등)은 친숙성을 위해 기존 명명 유지. 그 아래 CSS 변수(`--color-text-ink`, `--color-status-error-text` 등)만 spec 정합. Figma 토큰 슬롯명과 코드 CSS 변수명이 1:1 매칭되되, 컴포넌트 작성자는 클래스명 변경 없이 사용.

## Rules (enforcement)

- 컴포넌트 스타일 값은 Tailwind 토큰 클래스 또는 `var(--*)` (semantic / component-domain) 참조로만 표현.
- Primitive 스케일은 `semantic.css` / `elevation.css` / `components/*.css` / `tailwind.config.ts`에서만 참조. 컴포넌트에서 `var(--neutral-*)` / `var(--accent-*)` / `var(--red-*)` 등 직접 참조 금지.
- 새 디자인 값이 필요하면 먼저 semantic 또는 component-domain 토큰을 추가 후 컴포넌트에서 참조.
- 텍스트는 반드시 named text style 사용. raw size 클래스 / arbitrary px 금지.

### Lint 자동 차단

ESLint `no-restricted-syntax`가 JSX `className`에서 차단:

- `text-(base|2xs|xs|sm|md|lg|xl|2xl|[Npx])`, `leading-[...]`, `tracking-[...]`
- `bg-[#...]` / `bg-[rgb...]` / `bg-[hsl...]`
- `rounded-(sm|md|lg|xl|2xl|3xl|full|[...])`
- `shadow-(sm|md|lg|xl|2xl|inner|[...])`
- `z-(0|10|20|30|40|50|auto|[...])`
- `opacity-[...]`
- 픽셀 layout arbitrary: `(h|w|min-w|max-w|top|left|right|bottom)-[Npx]`, `grid-cols-[...Npx...]`

rem 단위 arbitrary는 허용. Stylelint가 CSS raw hex를 금지 — `primitives.css`만 예외.

실행: `bun run lint` (ESLint + Stylelint 동시).

## Migration Notes (이전 명명 → 현재)

| 이전 | 현재 |
|---|---|
| `bg-surface-subtle` | `bg-surface-soft` |
| `bg-surface-inset`, `bg-wall` | `bg-surface-strong` |
| `border-border`, `border-border-strong` | `border-surface-hairline` |
| `rounded-control-compact` | `rounded-subtle` |
| `rounded-control` | `rounded-button` |
| `rounded-control-group` | `rounded-card` |
| `rounded-surface` | `rounded-large` |
| `shadow-control-raised`, `shadow-raised` (구) | `shadow-hairline` |
| `shadow-soft` | `shadow-raised` |
| `shadow-popover`, `shadow-lift` | `shadow-floating` |
| `shadow-dialog` | `shadow-overlay` |
| `text-{2xs..2xl}` raw | `text-{caption,body,heading}-{xxs..xl}` named |
| `text-hero-{sm,lg}` | `text-heading-xl` (sizes consolidated) |
| `text-brewing-hero` | `text-heading-md` (clamp 폐지) |
| `text-code-*` | `text-{body,caption}-* font-mono` |
| `text-button-*` | `text-body-* font-medium` |
| `text-{card,nav,link,badge}` | 위 3계열 + utility 조합 |
