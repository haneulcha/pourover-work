import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput, RoastLevel, TasteProfile } from "../types";
import { methodList } from "./index";

const sampleTastes: readonly TasteProfile[] = [
  { sweetness: "balanced", strength: "medium" },
  { sweetness: "sweet", strength: "strong" },
  { sweetness: "bright", strength: "light" },
];

const sampleRoasts: readonly RoastLevel[] = ["light", "medium", "dark"];
const sampleCoffees = [10, 20, 30];

describe("method invariants (sweep)", () => {
  for (const method of methodList) {
    describe(method.name, () => {
      for (const coffee of sampleCoffees) {
        for (const roast of sampleRoasts) {
          for (const taste of sampleTastes) {
            const label = `coffee=${coffee}g roast=${roast} sweetness=${taste.sweetness} strength=${taste.strength}`;

            it(`totalWater === sum(pourAmount) — ${label}`, () => {
              const input: RecipeInput = {
                method: method.id,
                dripper: method.supportedDrippers[0]!,
                coffee: g(coffee),
                roast,
                taste,
              };
              const r = method.compute(input);
              const sum = r.pours.reduce((acc, p) => acc + p.pourAmount, 0);
              expect(sum).toBe(r.totalWater);
            });

            it(`cumulativeWater is running sum — ${label}`, () => {
              const input: RecipeInput = {
                method: method.id,
                dripper: method.supportedDrippers[0]!,
                coffee: g(coffee),
                roast,
                taste,
              };
              const r = method.compute(input);
              let running = 0;
              for (const p of r.pours) {
                running += p.pourAmount;
                expect(p.cumulativeWater).toBe(running);
              }
            });

            it(`first pour starts at 0s — ${label}`, () => {
              const input: RecipeInput = {
                method: method.id,
                dripper: method.supportedDrippers[0]!,
                coffee: g(coffee),
                roast,
                taste,
              };
              const r = method.compute(input);
              expect(r.pours[0]!.atSec).toBe(0);
            });
          }
        }
      }
    });
  }
});
