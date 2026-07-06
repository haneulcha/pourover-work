import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      transitionDuration: {
        DEFAULT: "var(--motion-duration-base)",
        long: "var(--motion-duration-long)",
        leadin: "var(--motion-duration-leadin)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--motion-easing)",
      },
      borderRadius: {
        none: "0",
        subtle: "var(--radius-subtle)",
        DEFAULT: "var(--radius-button)",
        button: "var(--radius-button)",
        input: "var(--radius-input)",
        card: "var(--radius-card)",
        large: "var(--radius-large)",
        pill: "var(--radius-pill)",
      },
      // Named text styles — heading / body / caption 3 계열만.
      // 다른 named style(code/button/card/nav/link/badge/hero/brewing-hero)은 폐지 →
      // 위 3계열 + font-* / tracking-* / font-mono 등 utility 조합으로 표현.
      // raw size utility(text-2xs..2xl)도 폐지. 모든 텍스트는 named style 사용.
      // [size, { lineHeight, letterSpacing?, fontWeight? }]
      fontSize: {
        // 글랜서블 디스플레이 — 브루잉 큰 숫자 전용. 뷰포트 반응, tabular-nums 전제.
        "display-xl": ["clamp(88px, 26vw, 150px)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "500" }],
        "heading-xl": ["64px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "500" }],
        "heading-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "500" }],
        "heading-md": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "heading-sm": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-xs": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "heading-xxs": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["20px", { lineHeight: "1.5" }],
        "body-md": ["16px", { lineHeight: "1.5" }],
        "body-sm": ["14px", { lineHeight: "1.5" }],
        "caption-md": ["14px", { lineHeight: "1.4" }],
        "caption-sm": ["12px", { lineHeight: "1.4" }],
        "caption-xs": ["11px", { lineHeight: "1.3" }],
        "caption-xxs": ["10px", { lineHeight: "1.3" }],
      },
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      letterSpacing: {
        tight: "var(--letter-spacing-tight)",
        wide: "var(--letter-spacing-wide)",
        wider: "var(--letter-spacing-wider)",
        widest: "var(--letter-spacing-widest)",
      },
      spacing: {
        xxs: "var(--space-xxs)",
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        xxl: "var(--space-xxl)",
        section: "var(--space-section)",
      },
      boxShadow: {
        hairline: "var(--shadow-hairline)",
        raised: "var(--shadow-raised)",
        floating: "var(--shadow-floating)",
        overlay: "var(--shadow-overlay)",
      },
      keyframes: {
        "popover-in": {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "overlay-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "popover-in": "popover-in var(--motion-duration-base) var(--motion-easing) both",
        "overlay-in": "overlay-in var(--motion-duration-base) var(--motion-easing) both",
      },
      zIndex: {
        popover: "var(--z-popover)",
        dialog: "var(--z-dialog)",
      },
      opacity: {
        disabled: "var(--opacity-disabled)",
        dim: "var(--opacity-dim)",
        muted: "var(--opacity-muted)",
      },
      minWidth: {
        popover: "var(--size-popover-min)",
      },
      height: {
        "progress-rail": "var(--size-progress-rail)",
      },
      colors: {
        // Surface (spec bg/* 슬롯)
        surface: {
          DEFAULT: "var(--color-bg-canvas)",
          soft: "var(--color-bg-soft)",
          strong: "var(--color-bg-strong)",
          card: "var(--color-bg-card)",
          hairline: "var(--color-bg-hairline)",
        },
        // Text — Tailwind class는 친숙한 이름 유지, 내부 CSS var는 spec(text/*) 정합
        text: {
          primary: "var(--color-text-ink)",
          secondary: "var(--color-text-body)",
          muted: "var(--color-text-muted)",
          "on-accent": "var(--color-text-on-primary)",
        },
        // Accent
        accent: {
          DEFAULT: "var(--color-accent-primary)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
        },
        focus: "var(--color-focus-ring)",
        // Status — 친숙한 단일 키 유지 (각각 status text 색상에 매핑)
        danger: "var(--color-status-error-text)",
        warning: "var(--color-status-warning-text)",
        success: "var(--color-status-success-text)",
        overlay: { scrim: "var(--color-overlay-scrim)" },
        // Brewing domain
        brewing: {
          "pour-bg": "var(--color-brewing-state-pour-bg)",
          "pour-fg": "var(--color-brewing-state-pour-fg)",
          "pour-fg-muted": "var(--color-brewing-state-pour-fg-muted)",
          "wait-bg": "var(--color-brewing-state-wait-bg)",
          "wait-fg": "var(--color-brewing-state-wait-fg)",
          "wait-fg-muted": "var(--color-brewing-state-wait-fg-muted)",
        },
        pour: {
          bloom: "var(--color-pour-bloom)",
          main: "var(--color-pour-main)",
        },
        timeline: {
          axis: "var(--color-timeline-axis)",
          grid: "var(--color-timeline-grid)",
        },
      },
    },
  },
} satisfies Config;
