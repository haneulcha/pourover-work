# Design Tokens

색/타이포/모션의 의미·선택 근거는 `brand.md`, 실제 값과 레이어 구조는 이 문서.

토큰 **명명·구조**는 `figma-system.json` + `DESIGN.md`(명명 레퍼런스 전용 — 무드·값 서술은 따르지 않음) 정합. 색·반경 등 **값은 brand 정체성("자기와 물" — 본화이트 자기, 청먹, 심수 청록. 2026-07 개정) 유지**. Figma 파일은 spec 값 그대로, 코드는 brand 값 — 명명 규칙만 1:1 매칭.

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
--accent-200         →    --color-brewing-leadin-bg →  bg-brewing-leadin-bg
```

## File Layout

```
apps/web/src/ui/tokens/
├── primitives.css         # raw color scales (neutral, accent, status)
├── typography.css         # font families, raw font-size/lh/ls
├── motion.css             # duration, easing (screen/lead-in 포함)
├── layout.css             # spacing, z-index, opacity, sizes
├── elevation.css          # radius role aliases + shadow tier
├── semantic.css           # role-only color tokens (bg/text/accent/status/overlay)
└── components/
    ├── brewing.css        # 브루잉 화면 base/lead-in 배경·전경 + 진행 레일
    └── timeline.css       # pour-bloom/main, timeline-axis/grid
```

`globals.css` import 순서: `primitives → typography → motion → layout → elevation → semantic → components/*`. semantic이 elevation/typography/layout을 참조하는 경우 없음(별도 namespace), 단 import 순서로 cascade 안전 확보.

## Primitive Tokens

### Neutral scale (porcelain → 청먹)

본화이트 자기(약한 그린-그레이 언더톤)에서 블루 언더톤 먹색으로. 언더톤 없는 순수 무채색 그레이 금지 (`docs/brand.md`).

```css
--neutral-0: #fbfbf9;   /* brand bg 밝은 한계 — bg/canvas 앵커. 본화이트 */
--neutral-50: #f4f4f0;
--neutral-100: #e9e9e3;
--neutral-200: #d3d5d0;
--neutral-300: #aeb4b1;
--neutral-400: #8b9698;
--neutral-500: #79827f;
--neutral-600: #5d6668;
--neutral-700: #414a4f;
--neutral-800: #2a3238;
--neutral-900: #232a2e;  /* brand ink 어두운 한계 — 청먹 */
--neutral-950: #1f262a;  /* dark 테마 canvas */
```

### Accent scale (심수 — 깊은 물의 청록)

```css
--accent-50:  #edf4f4;
--accent-100: #deeced;
--accent-200: #cee3e5;  /* lead-in bg (light) */
--accent-300: #91bec4;  /* dark hover / focus */
--accent-400: #7caeb7;  /* dark 주 accent / light focus ring */
--accent-500: #3b727b;  /* 주 accent */
--accent-600: #315f66;  /* hover — 액센트 텍스트 최소 단계 */
--accent-700: #284f56;  /* active */
--accent-800: #254d52;  /* lead-in bg (dark) */
--accent-900: #1b3a3f;
```

**접근성 규칙**: 액센트를 **텍스트**로 쓸 때는 `accent-600/700`(semantic으로는 `--color-accent-hover/active` 계열)을 쓴다. `accent-500`은 fill·아이콘·레일 등 비텍스트 용도 기준. (500은 canvas 대비 ≈5:1로 경계선상 — 작은 글자에 쓰지 않는다.)

### Status scales (50 / 500 pair, 쿨 뉴트럴 위 재조율)

spec 4 status × 2 variants (50 = bg, 500 = text). info 블루는 액센트 청록(≈190°)과 색상 간격을 벌린 인디고 쪽(≈220°):

```css
--red-50: #f9e9e7;     --red-500: #bc544b;
--green-50: #eaf3eb;   --green-500: #58915f;
--amber-50: #f8f0dc;   --amber-500: #c1912e;
--blue-50: #e9eef7;    --blue-500: #4a67ad;
```

### Typography primitives (`typography.css`)

```css
--font-sans: "Pretendard Variable", "Pretendard", "Inter", ..., sans-serif;
--font-mono: "Geist Mono", "IBM Plex Mono", "D2Coding", ..., monospace;

/* Raw font-size scale — named text style 정의에서만 사용 */
--font-size-{10,11,12,14,16,18,20,24,32,48,64}: …px;

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

/* Brewing lead-in — 다음 푸어 5초 전 배경 물듦. 소리 리드인 큐와 함께 서서히 */
--motion-duration-leadin: 1500ms;
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
--color-overlay-scrim: rgba(35, 42, 46, 0.45);
```

> 액센트 텍스트 접근성: 본문 크기 텍스트에 액센트 색을 쓸 때는 `--color-accent-hover/active`(= accent-600/700)를 참조. `--color-accent-primary`(500)는 fill·아이콘 전용.

### Dark (`[data-theme="dark"]`)

위 색상만 재지정. typography / spacing / z-index / opacity / size는 light/dark 공용.

```css
[data-theme="dark"] {
  --color-bg-canvas:   var(--neutral-950);
  --color-bg-soft:     var(--neutral-800);
  --color-bg-strong:   var(--neutral-700);
  --color-bg-card:     var(--neutral-950);
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
  --color-status-error-bg:   rgba(188, 84, 75, 0.15);
  --color-status-success-bg: rgba(88, 145, 95, 0.15);
  /* … */

  --color-overlay-scrim: rgba(0, 0, 0, 0.6);
}
```

## Component-Domain Tokens

semantic으로 표현하기 부적절한 도메인 전용 값. 한 파일 = 한 도메인.

### Brewing (`components/brewing.css`)

표시 전용 브루잉 화면 (base 캔버스 / lead-in 물듦 / 진행 레일). semantic을 참조하지 않는 자체 값 — light↔dark가 단순 swap이 아니기 때문.

```css
/* base — 차분한 캔버스. 큰 숫자는 fg, 보조 줄은 fg-muted */
--color-brewing-base-{bg,fg,fg-muted}: …;

/* lead-in — 다음 푸어 5초 전 화면 전체가 액센트로 물듦 (주변시야 신호) */
--color-brewing-leadin-{bg,fg,fg-muted}: …;

/* 진행 레일 — 트랙 위 경과 채움 + 푸어 경계 눈금 */
--color-brewing-rail-{track,fill,tick}: …;
```

Tailwind: `bg-brewing-base-bg`, `text-brewing-base-fg`, `bg-brewing-leadin-bg`, `bg-brewing-rail-fill` 등.

> 구 컵 메타포 토큰(liquid 4-stop, meniscus, ring-on-liquid, rim/cup inset shadow, `--brewing-rim-height`)은 2026-07 브루잉 v2 리디자인에서 삭제됨.

### Timeline / Pour (`components/timeline.css`)

```css
--color-pour-bloom: var(--accent-300);
--color-pour-main:  var(--accent-500);
--color-timeline-axis: var(--neutral-300);
--color-timeline-grid: var(--neutral-100);
```

Tailwind: `bg-pour-bloom`, `bg-pour-main`, `bg-timeline-axis`, `bg-timeline-grid`.

## Typography — Named Text Styles (Tailwind utility)

`tailwind.config.ts`의 `fontSize` extend로 **display / heading / body / caption 계열만** 정의. 각 utility는 size + line-height + (있으면) letter-spacing + font-weight를 한꺼번에 적용. 다른 의미적 변형(button, badge, code 등)은 이 계열 + `font-*` / `tracking-*` / `font-mono` utility 조합으로 표현.

| Category | Utility | size / weight / lh / ls |
|---|---|---|
| Display | `text-display-xl` | clamp(88px, 26vw, 150px) / 500 / 1 / -0.03em — 브루잉 카운트다운 전용 |
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
| `colors.text.{primary,secondary,muted,on-accent}` | text/* | semantic |
| `colors.accent.{DEFAULT,hover,active}` | accent/* | semantic |
| `colors.{danger,warning,success}` | status/*-text | semantic |
| `colors.overlay.scrim`, `colors.focus` | overlay, focus | semantic |
| `colors.brewing.*`, `colors.pour.*`, `colors.timeline.*` | domain | components/* |
| `borderRadius.{subtle,button,input,card,large,pill}` | radius role | elevation |
| `boxShadow.{hairline,raised,floating,overlay}` | shadow tier | elevation |
| `fontSize.{display,heading,body,caption}-*` | named styles | tailwind extend |
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

## Token Sufficiency Heuristics

새 컴포넌트/화면을 만들다 보면 **"이 값은 토큰으로 빼야 하나, 그냥 마크업에 둬야 하나"** 가 늘 애매. 다음 신호를 기준으로 판단.

### 추가 신호 (= 토큰으로 빼야 함)

1. **같은 hex/spacing/radius/shadow가 컴포넌트 두 곳 이상에서 반복** → semantic 또는 component-domain 토큰 후보. 한 곳에서만 쓰이면 아직 토큰 아님 (premature abstraction).
2. **light↔dark에서 단순 swap이 아닌 색** → component-domain 레이어 후보. semantic은 단순 swap 가능한 색만 (현재 brewing/timeline이 이 패턴).
3. **arbitrary `[Npx]` / hex 작성 욕구가 같은 의도로 두 번 이상 발생** → primitive 또는 semantic 토큰 부족 신호. 첫 번째는 그냥 적되 다음 요청 때 토큰화.
4. **새 디자인 의도가 기존 semantic 슬롯 어느 것과도 안 맞음** → 디자이너와 의도 재확인 후, 정말 새 역할이면 semantic 추가. **Tailwind 클래스만 추가하지 말고 CSS 변수부터.**
5. **scope·z-index·opacity 등 Tailwind 기본을 비활성화한 영역에서 새 값 필요** → primitive 추가 (예: `--z-*`에 `--z-toast` 추가).

### 비추가 신호 (= 토큰으로 빼지 말 것)

1. **레이아웃 순간값** (`mt-1.5`, `gap-3` 등 Tailwind 기본 spacing): 그대로. spec spacing scale(`xxs..section`)은 반복되는 의미적 간격에만.
2. **컴포넌트 내부 미세 조정** (`-translate-y-1/2`, `inset-x-0` 등): 토큰 X.
3. **브랜드 의도 없는 일회성 그라데이션·rgba**: 한 번뿐이면 마크업에 둠. 두 번째 등장 시 component-domain 토큰화.
4. **Named text style 새 변형이 필요한 듯한 느낌**: 거의 항상 잘못된 신호. 3계열(heading/body/caption) + `font-*`/`tracking-*`/`font-mono` 조합으로 풀어볼 것. 진짜 안 풀리면 디자인 의도 자체가 어긋난 것 — 디자이너에 회신.

### 어디 레이어에 둘지 (결정 트리)

```
새 토큰이 필요하다 →
  ├─ raw 색상 스케일이 부족? → primitives.css에 새 값 추가
  ├─ 역할 기반 (bg/text/accent/status/border)? → semantic.css
  ├─ 깊이/모양 (shadow/radius)? → elevation.css
  ├─ 폰트/모션/간격/사이즈? → typography/motion/layout.css
  └─ 한 도메인(brewing, timeline 등)에서만 의미? → components/{domain}.css 신설 또는 추가
```

규칙: **semantic은 도메인 토큰 절대 안 받음.** brewing-only 색을 `--color-brewing-*`로 semantic.css에 두면 안 되고, `components/brewing.css`로 분리.

### 추가 절차

1. 위 신호 확인 → "추가 가치 있음" 판단
2. CSS 변수부터 정의 (semantic 또는 component-domain)
3. Tailwind config의 해당 키 추가 (필요시)
4. `docs/design-tokens.md` 표에 1줄 반영
5. Figma 토큰과 명명·역할 일치 확인 (figma-system.json 갱신은 별도 작업)
6. 신규 토큰 사용처가 1개뿐이면 **commit 메시지에 "다음 사용처에서 회수 예정"** 명시 — 두 번째 사용처 등장 안 하면 reverse 후보.

### Anti-pattern 체크리스트

- [ ] semantic.css에 `--color-{도메인}-*` 추가하려 함 → STOP, components/{domain}.css로
- [ ] `text-{새이름}` named style 추가하려 함 → 거의 항상 STOP, 조합으로 표현
- [ ] arbitrary `[Npx]`를 막으려고 spacing scale 외 정수 spacing(`spacing.13` 등) 추가 → STOP, 진짜 의미적 spacing이면 `xxs..section` 안에서 재사용, 아니면 마크업 그대로
- [ ] Light/Dark가 단순 swap 아닌 색을 semantic에 두려 함 → STOP, component-domain
- [ ] 토큰 한 번 쓰일 거면서 미리 추가 → STOP, 사용처 두 번 될 때까지 기다림
- [ ] 기존 토큰과 의미 거의 같은 토큰 추가 → STOP, 기존 토큰 재사용 또는 기존 토큰 의미 확장

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
| `text-brewing-hero` | `text-heading-md` (clamp 폐지) → v2에서 `text-display-xl` 신설 (카운트다운) |
| `bg-brewing-liquid-*`, meniscus, ring-on-liquid, `shadow-{rim,cup}-inset`, `text-text-on-liquid` | 삭제 (2026-07 브루잉 v2 — 컵 메타포 제거). 대체: `brewing-{base,leadin}-{bg,fg,fg-muted}`, `brewing-rail-{track,fill,tick}` |
| `text-code-*` | `text-{body,caption}-* font-mono` |
| `text-button-*` | `text-body-* font-medium` |
| `text-{card,nav,link,badge}` | 위 3계열 + utility 조합 |
