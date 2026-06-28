import { describe, expect, it } from "vitest";
import { g } from "../units";
import type { RecipeInput, RoastLevel, TasteProfile } from "../types";
import { methodList } from "./index";
import { cuesBetween, leadInCountdown, LEAD_IN_SEC } from "../session";

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

describe("cue invariants (sweep)", () => {
  for (const method of methodList) {
    for (const coffee of sampleCoffees) {
      for (const roast of sampleRoasts) {
        for (const taste of sampleTastes) {
          const label = `${method.name} coffee=${coffee}g roast=${roast} ${taste.sweetness}/${taste.strength}`;
          const r = method.compute({
            method: method.id,
            dripper: method.supportedDrippers[0]!,
            coffee: g(coffee),
            roast,
            taste,
          });
          const T = r.totalTimeSec;

          it(`pour 큐는 비-블룸 푸어마다 정확히 1회, complete 1회 — ${label}`, () => {
            const cues: ReturnType<typeof cuesBetween> = [];
            for (let t = 1; t <= T; t++) cues.push(...cuesBetween(t - 1, t, r.pours, T, LEAD_IN_SEC));

            const pourIdx = cues.filter((c) => c.kind === "pour").map((c) => (c as { stepIdx: number }).stepIdx);
            const expectedPourIdx = r.pours
              .map((p, i) => ({ i, at: p.atSec }))
              .filter((x) => x.at > 0)
              .map((x) => x.i);
            expect(pourIdx).toEqual(expectedPourIdx);

            expect(cues.filter((c) => c.kind === "complete")).toHaveLength(1);

            const leadIns = cues.filter((c) => c.kind === "lead-in").length;
            expect(leadIns).toBeLessThanOrEqual(pourIdx.length); // 간격<5초면 생략될 수 있음
          });

          it(`leadInCountdown 은 항상 null 또는 1..${LEAD_IN_SEC} — ${label}`, () => {
            for (let t = 0; t <= T; t++) {
              const v = leadInCountdown(t, r.pours, LEAD_IN_SEC);
              if (v !== null) {
                expect(v).toBeGreaterThanOrEqual(1);
                expect(v).toBeLessThanOrEqual(LEAD_IN_SEC);
              }
            }
          });
        }
      }
    }
  }
});
