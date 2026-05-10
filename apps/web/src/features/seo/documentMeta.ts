import { drippers } from "@pourover/domain/drippers";
import { brewMethods } from "@pourover/domain/methods";
import type {
  Recipe,
  RoastLevel,
  StrengthProfile,
  SweetnessProfile,
} from "@pourover/domain/types";
import type { AppState } from "@/features/app/state";
import { encodeState } from "@/features/share/urlCodec";

export const BASE_URL = "https://pourover.work";

const APP_NAME = "핸드드립 계산기";
const APP_SUBTITLE = "V60 · Kalita · Kasuya 4:6 · Hoffmann";
const DEFAULT_DESCRIPTION =
  "V60, Kalita, Kasuya 4:6 등 9가지 핸드드립 레시피를 원두량·로스팅·취향에 맞춰 자동 계산합니다.";

export type DocumentMeta = {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
};

export const DEFAULT_META: DocumentMeta = {
  title: `${APP_NAME} | ${APP_SUBTITLE}`,
  description: DEFAULT_DESCRIPTION,
  canonical: `${BASE_URL}/`,
};

const ROAST_LABEL: Record<RoastLevel, string> = {
  light: "약배전",
  medium: "중배전",
  dark: "강배전",
};

const SWEETNESS_LABEL: Record<SweetnessProfile, string> = {
  sweet: "단맛",
  balanced: "밸런스",
  bright: "산미",
};

const STRENGTH_LABEL: Record<StrengthProfile, string> = {
  light: "라이트",
  medium: "미디엄",
  strong: "스트롱",
};

const truncate = (s: string, max = 160): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

export function buildMeta(state: AppState, recipe: Recipe): DocumentMeta {
  if (state.screen === "wall") return DEFAULT_META;

  const dripperName = drippers[state.dripper].name;
  const methodName = brewMethods[state.method].name;
  const coffee = Math.round(recipe.coffee as number);
  const water = Math.round(recipe.totalWater as number);
  const ratioValue = Math.round(recipe.ratio as number);

  const title = `${dripperName} · ${methodName} (${coffee}g · 1:${ratioValue}) | ${APP_NAME}`;

  const description = truncate(
    `${ROAST_LABEL[state.roast]} ${coffee}g · 물 ${water}g · ${recipe.pours.length}차 푸어. ${SWEETNESS_LABEL[state.taste.sweetness]} / ${STRENGTH_LABEL[state.taste.strength]}.`,
  );

  const canonical = `${BASE_URL}/?${encodeState(state).toString()}`;

  return { title, description, canonical };
}

type Selector =
  | { kind: "meta-name"; value: string }
  | { kind: "meta-property"; value: string }
  | { kind: "link-rel"; value: string };

function upsert(sel: Selector, attr: "content" | "href", value: string): void {
  if (typeof document === "undefined") return;
  const selectorStr =
    sel.kind === "meta-name"
      ? `meta[name="${sel.value}"]`
      : sel.kind === "meta-property"
        ? `meta[property="${sel.value}"]`
        : `link[rel="${sel.value}"]`;
  let el = document.head.querySelector<HTMLElement>(selectorStr);
  if (!el) {
    if (sel.kind === "link-rel") {
      const link = document.createElement("link");
      link.setAttribute("rel", sel.value);
      el = link;
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute(
        sel.kind === "meta-name" ? "name" : "property",
        sel.value,
      );
      el = meta;
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function applyMeta(meta: DocumentMeta): void {
  if (typeof document === "undefined") return;
  document.title = meta.title;
  upsert({ kind: "meta-name", value: "description" }, "content", meta.description);
  upsert({ kind: "link-rel", value: "canonical" }, "href", meta.canonical);
  upsert({ kind: "meta-property", value: "og:title" }, "content", meta.title);
  upsert({ kind: "meta-property", value: "og:description" }, "content", meta.description);
  upsert({ kind: "meta-property", value: "og:url" }, "content", meta.canonical);
  upsert({ kind: "meta-name", value: "twitter:title" }, "content", meta.title);
  upsert({ kind: "meta-name", value: "twitter:description" }, "content", meta.description);
}
