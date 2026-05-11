import type {
  Celsius, DripperId, Grams, GrindHint, Recipe, Seconds,
} from "@pourover/domain/types";
import { c, g, s } from "@pourover/domain/units";
import type {
  CustomPourInput, CustomRecipeInput,
} from "@pourover/domain/methods/custom";

export type CustomFormPour = {
  readonly atSec: Seconds;
  readonly pourAmount: Grams;
  readonly label?: "bloom";
};

export type CustomFormState = {
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly temperature: Celsius;
  readonly grindHint: GrindHint;
  readonly totalTimeSec: Seconds;
  readonly pours: readonly CustomFormPour[];
  readonly lockLastPour: boolean;
  readonly selectedPourIndex: number | null;
};

export const initialBlankState = (): CustomFormState => ({
  dripper: "v60",
  coffee: g(15),
  totalWater: g(225),
  temperature: c(92),
  grindHint: "medium",
  totalTimeSec: s(170),
  pours: [
    { atSec: s(0), pourAmount: g(45), label: "bloom" },
    { atSec: s(45), pourAmount: g(45) },
    { atSec: s(90), pourAmount: g(45) },
    { atSec: s(120), pourAmount: g(45) },
    { atSec: s(150), pourAmount: g(45) },
  ],
  lockLastPour: true,
  selectedPourIndex: null,
});

export const fromRecipe = (recipe: Recipe): CustomFormState => ({
  dripper: recipe.dripper,
  coffee: recipe.coffee,
  totalWater: recipe.totalWater,
  temperature: recipe.temperature,
  grindHint: recipe.grindHint,
  totalTimeSec: recipe.totalTimeSec,
  pours: recipe.pours.map((p) => ({
    atSec: p.atSec,
    pourAmount: p.pourAmount,
    ...(p.label ? { label: p.label } : {}),
  })),
  lockLastPour: true,
  selectedPourIndex: null,
});

const applyLockLastPour = (state: CustomFormState): CustomFormState => {
  if (!state.lockLastPour || state.pours.length === 0) return state;
  const prevSum = state.pours.slice(0, -1)
    .reduce((acc, p) => acc + (p.pourAmount as number), 0);
  const remainder = (state.totalWater as number) - prevSum;
  const last = state.pours[state.pours.length - 1]!;
  if ((last.pourAmount as number) === remainder) return state;
  const newPours = [...state.pours];
  newPours[newPours.length - 1] = { ...last, pourAmount: g(remainder) };
  return { ...state, pours: newPours };
};

export const toCustomInput = (state: CustomFormState): CustomRecipeInput => {
  const adjusted = applyLockLastPour(state);
  return {
    dripper: adjusted.dripper,
    coffee: adjusted.coffee,
    totalWater: adjusted.totalWater,
    temperature: adjusted.temperature,
    grindHint: adjusted.grindHint,
    totalTimeSec: adjusted.totalTimeSec,
    pours: adjusted.pours.map<CustomPourInput>((p) => ({
      atSec: p.atSec,
      pourAmount: p.pourAmount,
      ...(p.label ? { label: p.label } : {}),
    })),
  };
};

export const ratioOf = (state: CustomFormState): number =>
  (state.totalWater as number) / ((state.coffee as number) || 1);

export type CustomAction =
  | { type: "setDripper"; value: DripperId }
  | { type: "setCoffee"; value: Grams }
  | { type: "setTotalWater"; value: Grams }
  | { type: "setTemperature"; value: Celsius }
  | { type: "setGrindHint"; value: GrindHint }
  | { type: "setTotalTimeSec"; value: Seconds }
  | { type: "setPourAmount"; index: number; value: Grams }
  | { type: "setPourAtSec"; index: number; value: Seconds }
  | { type: "addPour" }
  | { type: "removePour"; index: number }
  | { type: "toggleBloom" }
  | { type: "setLockLastPour"; value: boolean }
  | { type: "selectPour"; index: number | null }
  | { type: "reset" };

const SNAP_SEC = 5;
const snap = (sec: number): number => Math.round(sec / SNAP_SEC) * SNAP_SEC;
const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

const clampPoursToTotalTime = (
  state: CustomFormState, newTotal: Seconds,
): CustomFormState => {
  const total = newTotal as number;
  if (state.pours.length === 0) return { ...state, totalTimeSec: newTotal };
  const pours: CustomFormPour[] = [];
  for (let i = state.pours.length - 1; i >= 0; i--) {
    const orig = state.pours[i]!.atSec as number;
    const upperBound = pours.length === 0 ? total : (pours[0]!.atSec as number) - SNAP_SEC;
    const lowerBound = i === 0 ? 0 : SNAP_SEC * i;
    const bounded = clamp(Math.min(orig, upperBound), lowerBound, upperBound);
    pours.unshift({ ...state.pours[i]!, atSec: s(bounded) });
  }
  return { ...state, totalTimeSec: newTotal, pours };
};

export const customReducer = (
  state: CustomFormState, action: CustomAction,
): CustomFormState => {
  switch (action.type) {
    case "setDripper": return { ...state, dripper: action.value };
    case "setCoffee": return { ...state, coffee: action.value };
    case "setTotalWater": return { ...state, totalWater: action.value };
    case "setTemperature": return { ...state, temperature: action.value };
    case "setGrindHint": return { ...state, grindHint: action.value };
    case "setTotalTimeSec": return clampPoursToTotalTime(state, action.value);
    case "setPourAmount": {
      if (action.index < 0 || action.index >= state.pours.length) return state;
      const pours = [...state.pours];
      pours[action.index] = { ...pours[action.index]!, pourAmount: action.value };
      return { ...state, pours };
    }
    case "setPourAtSec": {
      if (action.index <= 0 || action.index >= state.pours.length) return state;
      const total = state.totalTimeSec as number;
      const prev = state.pours[action.index - 1]!.atSec as number;
      const next = action.index + 1 < state.pours.length
        ? (state.pours[action.index + 1]!.atSec as number) : total;
      const snapped = snap(action.value as number);
      const bounded = clamp(snapped, prev + SNAP_SEC, Math.min(next - SNAP_SEC, total));
      const pours = [...state.pours];
      pours[action.index] = { ...pours[action.index]!, atSec: s(bounded) };
      return { ...state, pours };
    }
    case "addPour": {
      const total = state.totalTimeSec as number;
      const last = state.pours[state.pours.length - 1];
      const newAt = last
        ? snap(Math.min((last.atSec as number) + 30, total - SNAP_SEC))
        : 0;
      if (last && newAt <= (last.atSec as number)) return state;
      const newAmount = last ? (last.pourAmount as number) : 30;
      return { ...state, pours: [...state.pours, { atSec: s(newAt), pourAmount: g(newAmount) }] };
    }
    case "removePour": {
      if (action.index === 0) return state;
      if (action.index < 0 || action.index >= state.pours.length) return state;
      return { ...state, pours: state.pours.filter((_, i) => i !== action.index) };
    }
    case "toggleBloom": {
      const first = state.pours[0];
      if (!first) return state;
      const updated: CustomFormPour = first.label === "bloom"
        ? { atSec: first.atSec, pourAmount: first.pourAmount }
        : { atSec: first.atSec, pourAmount: first.pourAmount, label: "bloom" };
      return { ...state, pours: [updated, ...state.pours.slice(1)] };
    }
    case "setLockLastPour": return { ...state, lockLastPour: action.value };
    case "selectPour": return { ...state, selectedPourIndex: action.index };
    case "reset": return initialBlankState();
  }
};
