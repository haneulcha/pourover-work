# Design System: Untitled

> **명명 레퍼런스 전용.** 이 문서는 `figma-system.json`과 짝을 이루는 토큰 **명명·구조** 스펙이다. 여기 적힌 색·수치·무드는 이 프로젝트의 브랜드 값이 아니다 — 무드·원칙은 `docs/brand.md`, 코드의 실제 값은 `docs/design-tokens.md`가 단일 출처. brand와 정면 충돌하던 무드 서술(§ Theme & Atmosphere)과 Dos/Don'ts 섹션은 오염 방지를 위해 삭제됨 (git history 참조).

## 2. Color System

Palette anchored on the **warm-friendly** archetype. 15 slots total: 3 surface, 3 text, 1 accent, 8 status (4 roles × bg/text). Status slots are universal across archetypes.

**Overrides applied:** 2 slot(s) deviate from the archetype baseline.

### Surface

| Slot | Hex | Source |
|------|-----|--------|
| `canvas` | `#faf9f5` | override |
| `soft` | `#f5f3ec` | override |
| `hairline` | `#e3dfd3` | override |

### Text

| Slot | Hex | Source |
|------|-----|--------|
| `ink` | `#141413` | override |
| `body` | `#2c2b28` | override |
| `muted` | `#6b6960` | override |

### Accent

| Slot | Hex | Source |
|------|-----|--------|
| `accent` | `#702600` | override |

### Status

| Slot | Hex | Source |
|------|-----|--------|
| `error-bg` | `#fef0ee` | override |
| `error-text` | `#d4380d` | override |
| `success-bg` | `#f1fbef` | override |
| `success-text` | `#3b8132` | override |
| `warning-bg` | `#fff5e6` | override |
| `warning-text` | `#c0791d` | override |
| `info-bg` | `#eff6ff` | override |
| `info-text` | `#1f5582` | override |

## 3. Typography

### Font Family Chains

- **Sans:** Inter, Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
- **Mono:** "Geist Mono", "IBM Plex Mono", D2Coding, "Noto Sans Mono CJK KR", "SF Mono", Consolas, monospace
- **Serif:** Georgia, "Noto Serif KR", "Nanum Myeongjo", "Times New Roman", serif

### Scales

**Size scale (px):** 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64
**Weight scale:** 400, 500, 600, 700
**Line-height scale:** 1, 1.1, 1.2, 1.3, 1.4, 1.5
**Letter-spacing values:** -0.02em, 0, 0.05em

### Category profiles

#### Heading

| variant | size | weight | line-height | letter-spacing |
| --- | ---: | ---: | ---: | --- |
| xl | 64 | 500 | 1.1 | -0.02em |
| lg | 48 | 500 | 1.1 | -0.02em |
| md | 32 | 600 | 1.2 | 0 |
| sm | 24 | 600 | 1.3 | 0 |
| xs | 18 | 600 | 1.4 | 0 |

#### Body

| variant | size | weight | line-height | letter-spacing |
| --- | ---: | ---: | ---: | --- |
| lg | 20 | 400 | 1.5 | 0 |
| md | 16 | 400 | 1.5 | 0 |
| sm | 14 | 400 | 1.5 | 0 |

#### Caption

| variant | size | weight | line-height | letter-spacing |
| --- | ---: | ---: | ---: | --- |
| md | 14 | 400 | 1.4 | 0 |
| sm | 12 | 400 | 1.4 | 0 |
| xs | 11 | 400 | 1.3 | 0 |

#### Code (mono family)

| variant | size | weight | line-height | letter-spacing |
| --- | ---: | ---: | ---: | --- |
| md | 14 | 400 | 1.5 | 0 |
| sm | 12 | 400 | 1.4 | 0 |
| xs | 10 | 400 | 1.5 | 0 |

#### Button

| variant | size | weight | line-height | letter-spacing |
| --- | ---: | ---: | ---: | --- |
| md | 16 | 500 | 1.2 | 0 |
| sm | 14 | 500 | 1.3 | 0 |

#### Single-variant categories

| category | family | size | weight | line-height | letter-spacing |
| --- | --- | ---: | ---: | ---: | --- |
| card | sans | 24 | 600 | 1.3 | 0 |
| nav | sans | 14 | 500 | 1.4 | 0 |
| link | sans | 14 | 400 | 1.5 | 0 |
| badge | sans | 12 | 600 | 1.4 | 0.05em |

## 4. Components

_Knobs: `cardSurface=filled`, `buttonShape=rect`. Filled cards on rectangular buttons._

### Button

**Sizes:**

| | sm | md | lg |
|---|---|---|---|
| height | spacing.xl | spacing.xxl | spacing.xxl |
| paddingX | spacing.sm | spacing.md | spacing.lg |
| gap | spacing.xxs | spacing.xs | spacing.xs |
| fontSize | typography.caption-md | typography.button-md | typography.body-md |
| iconSize | spacing.md | spacing.md | spacing.lg |
| radius | radius.button | radius.button | radius.button |

**Variants:** primary, secondary, ghost, outline, text, icon
**States:** default, hover, active, disabled, focus

**Colors:** component.button.{variant}.{state} tokens

**Structure:**
```
[Button] horizontal auto-layout, center aligned
  ├── [IconLeading?] instance swap
  ├── [Label] text property
  └── [IconTrailing?] instance swap
```

### Input

**Sizes:**

| | sm | md | lg |
|---|---|---|---|
| height | spacing.xl | spacing.xxl | spacing.xxl |
| paddingX | spacing.sm | spacing.sm | spacing.md |
| radius | radius.input | radius.input | radius.input |
| labelFont | typography.caption-md | typography.caption-md | typography.caption-md |
| valueFont | typography.body-sm | typography.body-md | typography.body-md |
| helperFont | typography.caption-sm | typography.caption-sm | typography.caption-sm |

**Variants:** text, search, textarea
**States:** default, hover, focus, disabled, error

**Structure:**
```
[Input] vertical auto-layout
  ├── [Label] text property
  ├── [Field] horizontal auto-layout
  │   ├── [IconLeading?] instance swap
  │   ├── [Value] text property
  │   └── [IconTrailing?] instance swap
  └── [HelperText?] text property
```

### Card

**Sizes:**

| | sm | md | lg |
|---|---|---|---|
| radius | radius.card | radius.card | radius.card |
| contentPadding | spacing.md | spacing.lg | spacing.xl |
| contentGap | spacing.xs | spacing.sm | spacing.md |
| elevatedShadow | elevation.raised | elevation.raised | elevation.floating |
| headerFont | typography.card-md | typography.card-md | typography.heading-md |
| bodyFont | typography.body-sm | typography.body-md | typography.body-md |

**Variants:** default, outlined, elevated, filled _(default: filled)_

**Structure:**
```
[Card] vertical auto-layout
  ├── [Header?] text property
  ├── [Body] text property
  └── [Footer?] horizontal auto-layout
```

### Badge

**Sizes:**

| | sm | md |
|---|---|---|
| height | spacing.lg | spacing.xl |
| paddingX | spacing.xs | spacing.sm |
| radius | radius.subtle | radius.subtle |
| font | typography.badge-md | typography.caption-md |

**Variants:** subtle, solid

### Tab

**Sizes:**

| | sm | md |
|---|---|---|
| height | spacing.lg | spacing.xl |
| paddingX | spacing.sm | spacing.md |
| gap | spacing.xs | spacing.sm |
| font | typography.caption-md | typography.button-md |

**Variants:** underline, pill
**States:** default, active, disabled

### Avatar

**Sizes:**

| | xs | sm | md | lg | xl |
|---|---|---|---|---|---|
| dimension | spacing.md | spacing.lg | spacing.xl | spacing.xxl | spacing.section |

**Variants:** circle
**Radius:** radius.circle

## 5. Layout & Spacing

### Spacing System

4-multiple scale. Density: `compact` (section = 80px). Aliases:
- **xxs:** 4px
- **xs:** 8px
- **sm:** 12px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **xxl:** 48px
- **section:** 80px

### Grid & Container

- Max Width: 1200px
- Columns: 12
- Gutter: 16px

### Whitespace Philosophy

Structured, purposeful spacing. Every margin serves information hierarchy. Dense enough to convey seriousness, open enough to breathe.

### Border Radius Scale

- **None** (0px): Sharp-edged elements
- **Subtle** (4px): Small interactive elements
- **Button** (12px): Buttons, form actions
- **Input** (8px): Form inputs, selects
- **Card** (16px): Cards, containers
- **Large** (24px): Large containers, hero/feature
- **Pill** (9999px): Badges, tags, pill CTAs
- **Circle** (50%): Avatars, icon buttons

## 6. Elevation & Shadows

| Level | Treatment | Use |
| --- | --- | --- |
| None (0) | `none` | Page background, inline text, sections |
| Ring (1) | `#e3dfd3 0px 0px 0px 1px` | Borders, card outlines, dividers |
| Raised (2) | `rgba(0,0,0,0.08) 0px 1px 2px, rgba(0,0,0,0.056) 0px 1px 3px` | Resting cards, button-on-hover |
| Floating (3) | `rgba(0,0,0,0.12) 0px 4px 8px, rgba(0,0,0,0.084) 0px 2px 4px` | Dropdowns, popovers, tooltips |
| Overlay (4) | `rgba(0,0,0,0.18) 0px 8px 24px, rgba(0,0,0,0.126) 0px 4px 8px` | Modals, dialogs, command palettes |

**Shadow Philosophy:** Drop shadows render every elevation tier — depth is a primary design tool. Multi-layer shadows give surfaces tactile, physical presence. Balanced shadow system providing clear depth hierarchy.

## 8. Responsive Design

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | 0px – 639px | Single column, stacked layout, condensed spacing |
| Tablet | 640px – 1023px | 2-column grids, expanded padding, side navigation may appear |
| Desktop | 1024px – 1399px | Full layout, 3-column grids, horizontal navigation |
| Large Desktop | 1400px – --- | Centered content, generous margins, max content width |

### Touch Targets

44px minimum height and width for all interactive elements

### Collapsing Strategy

- Hero: display text scales down proportionally, maintains letter-spacing ratio
- Navigation: horizontal links collapse to hamburger menu at tablet breakpoint
- Feature cards: 3-column to 2-column to single column stacked
- Section spacing: desktop values multiplied by 0.6 on mobile
- Footer: multi-column grid collapses to single stacked column

### Image Behavior

- Maintain aspect ratio at all breakpoints
- Full-width on mobile, contained with max-width on desktop
- Lazy loading for images below the fold

## 9. Agent Guide

### Quick Color Reference

- **Primary CTA:** `#702600`
- **Surface Canvas:** `#faf9f5`
- **Text Ink:** `#141413`
- **Text Body:** `#2c2b28`
- **Hairline / Border:** `#e3dfd3`

### Example Component Prompts

- Create a hero section with a heading in Inter, background #faf9f5, and a CTA button using #702600.
- Build a card component with a subtle border using #e3dfd3, body text in #2c2b28, and 24px padding.
- Design a navigation bar with background #faf9f5, link color #141413, and an active indicator using #702600.
- Create a form input with border #e3dfd3 and focus ring using #70260033.

### Iteration Guide

1. Pick a different archetype to swap the entire palette (current: warm-friendly).
2. Override individual slots via paletteOverrides (e.g. { accent: "#ff0066" }) to drift from the archetype baseline.
3. The 8 status slots (error/success/warning/info × bg/text) are universal across archetypes — override per-slot for brand-specific status hues.