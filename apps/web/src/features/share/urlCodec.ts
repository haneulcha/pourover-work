import type {
  BrewMethodId,
  DripperId,
  RoastLevel,
  StrengthProfile,
  SweetnessProfile,
} from "@pourover/domain/types";
import { g } from "@pourover/domain/units";
import type { AppState } from "@/features/app/state";

const METHOD_IDS: readonly BrewMethodId[] = [
  "kasuya_4_6",
  "hoffmann_v60",
  "scott_rao",
  "april",
  "kurasu_kyoto",
  "frothy_monkey",
  "standard_3_stage",
  "caffe_luxxe",
  "fuglen_tokyo",
];
const DRIPPER_IDS: readonly DripperId[] = ["v60", "kalita_wave", "kalita_102"];
const ROAST_LEVELS: readonly RoastLevel[] = ["light", "medium", "dark"];
const SWEETNESS: readonly SweetnessProfile[] = ["sweet", "balanced", "bright"];
const STRENGTHS: readonly StrengthProfile[] = ["light", "medium", "strong"];

const MIN_COFFEE = 5;
const MAX_COFFEE = 50;

const oneOf = <T extends string>(
  v: string | null,
  arr: readonly T[],
): T | null =>
  v !== null && (arr as readonly string[]).includes(v) ? (v as T) : null;

const intInRange = (
  v: string | null,
  min: number,
  max: number,
): number | null => {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
};

export const encodeState = (state: AppState): URLSearchParams => {
  const p = new URLSearchParams();
  p.set("c", String(state.coffee));
  p.set("d", state.dripper);
  p.set("m", state.method);
  p.set("r", state.roast);
  p.set("sw", state.taste.sweetness);
  p.set("st", state.taste.strength);
  return p;
};

export const decodeState = (params: URLSearchParams): Partial<AppState> => {
  const patch: { -readonly [K in keyof AppState]?: AppState[K] } = {};

  const coffee = intInRange(params.get("c"), MIN_COFFEE, MAX_COFFEE);
  if (coffee !== null) patch.coffee = g(coffee);

  const d = oneOf(params.get("d"), DRIPPER_IDS);
  if (d) patch.dripper = d;

  const m = oneOf(params.get("m"), METHOD_IDS);
  if (m) patch.method = m;

  const r = oneOf(params.get("r"), ROAST_LEVELS);
  if (r) patch.roast = r;

  const sw = oneOf(params.get("sw"), SWEETNESS);
  const st = oneOf(params.get("st"), STRENGTHS);
  if (sw && st) patch.taste = { sweetness: sw, strength: st };

  return patch;
};
