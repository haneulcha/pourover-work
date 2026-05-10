import type { Celsius, Grams, Ratio, Seconds } from "./types";

export const g = (n: number): Grams => n as Grams;
export const c = (n: number): Celsius => n as Celsius;
export const s = (n: number): Seconds => n as Seconds;
export const ratio = (n: number): Ratio => n as Ratio;
