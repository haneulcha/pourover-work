import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const noRestrictedClassName = [
  "error",
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\btext-\\[/]",
    message:
      "Use a named text style (text-heading-{xl,lg,md,sm,xs,xxs} | text-body-{lg,md,sm} | text-caption-{md,sm,xs,xxs}). Arbitrary text-[Npx] is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\btext-(base|2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b/]",
    message:
      "Raw size text-* is banned. Use only text-heading-*, text-body-*, or text-caption-* named styles.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\b(leading|tracking)-\\[/]",
    message:
      "Use semantic leading-tight/snug/base or tracking-wide/wider/widest; arbitrary values are banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|fill|stroke|ring)-\\[(#|rgb|hsl)/]",
    message:
      "Use a semantic color token. Raw hex/rgb/hsl in arbitrary classes is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\brounded-(xs|sm|md|lg|xl|2xl|3xl|full)\\b/]",
    message:
      "Use semantic rounded-* alias (rounded-subtle/button/input/card/large/pill). Size-named rounded-* is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\brounded-\\[/]",
    message: "Use a semantic rounded-* alias. Arbitrary rounded-[...] is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\bshadow-(sm|md|lg|xl|2xl|inner)\\b/]",
    message:
      "Use semantic shadow tier (shadow-hairline/raised/floating/overlay) or domain shadow (shadow-rim-inset/cup-inset). Size-named shadow-* is banned.",
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\bshadow-\\[/]",
    message:
      "Use semantic shadow tier or domain shadow. Arbitrary shadow-[...] is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\bz-(0|10|20|30|40|50|auto)\\b/]",
    message: "Use semantic z-popover or z-dialog. Tailwind default z-* is banned.",
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\bz-\\[/]",
    message: "Use semantic z-popover or z-dialog. Arbitrary z-[...] is banned.",
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\bopacity-\\[/]",
    message:
      "Use opacity-disabled / opacity-dim / opacity-muted. Arbitrary opacity-[...] is banned.",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\b(h|w|min-w|max-w|min-h|max-h|top|left|right|bottom)-\\[[0-9.]+px\\]/]",
    message:
      "Use spacing scale or a semantic size token. Arbitrary px layout values are banned (rem arbitrary values are allowed).",
  },
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\\bgrid-cols-\\[[^\\]]*[0-9]+px/]",
    message: "Use rem units in grid-cols-[...] arbitrary values.",
  },
];

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.ts",
      "*.config.js",
      "eslint.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLButtonElement: "readonly",
        SVGSVGElement: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        location: "readonly",
        history: "readonly",
        performance: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        CustomEvent: "readonly",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-restricted-syntax": noRestrictedClassName,
    },
  },
];
