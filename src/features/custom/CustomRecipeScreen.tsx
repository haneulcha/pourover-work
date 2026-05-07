import { useEffect, useMemo, useReducer, useState } from "react";
import type { Recipe } from "@/domain/types";
import { buildCustomRecipe } from "@/domain/methods/custom";
import { CustomBasicsForm } from "./CustomBasicsForm";
import { CustomStatsPanel } from "./CustomStatsPanel";
import { PourEditTable } from "./PourEditTable";
import { PourTimelinePreview } from "./PourTimelinePreview";
import {
  customReducer,
  fromRecipe,
  initialBlankState,
  toCustomInput,
} from "./customFormState";

type Props = {
  readonly prefillFrom?: Recipe;
  readonly onUseRecipe: (recipe: Recipe) => void;
  readonly onCancel: () => void;
};

export function CustomRecipeScreen({
  prefillFrom,
  onUseRecipe,
  onCancel,
}: Props) {
  const initial = useMemo(
    () => (prefillFrom ? fromRecipe(prefillFrom) : initialBlankState()),
    // Prefill is captured once on mount; subsequent prop changes are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [state, dispatch] = useReducer(customReducer, initial);

  const [mobile, setMobile] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth <= 640,
  );

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const result = useMemo(
    () => buildCustomRecipe(toCustomInput(state)),
    [state],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-sm font-semibold text-text-primary">
          Custom Recipe
        </h1>
        <button
          type="button"
          onClick={() => dispatch({ type: "reset" })}
          className="rounded-button border border-surface-hairline bg-surface px-3 py-1.5 text-caption-sm text-text-secondary transition-colors hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Start blank
        </button>
      </div>

      <CustomBasicsForm
        dripper={state.dripper}
        coffee={state.coffee}
        totalWater={state.totalWater}
        temperature={state.temperature}
        grindHint={state.grindHint}
        totalTimeSec={state.totalTimeSec}
        onChange={(patch) => {
          if (patch.dripper !== undefined) {
            dispatch({ type: "setDripper", value: patch.dripper });
          }
          if (patch.coffee !== undefined) {
            dispatch({ type: "setCoffee", value: patch.coffee });
          }
          if (patch.totalWater !== undefined) {
            dispatch({ type: "setTotalWater", value: patch.totalWater });
          }
          if (patch.temperature !== undefined) {
            dispatch({ type: "setTemperature", value: patch.temperature });
          }
          if (patch.grindHint !== undefined) {
            dispatch({ type: "setGrindHint", value: patch.grindHint });
          }
          if (patch.totalTimeSec !== undefined) {
            dispatch({ type: "setTotalTimeSec", value: patch.totalTimeSec });
          }
        }}
      />

      <PourTimelinePreview
        state={state}
        mobile={mobile}
        onDragMarker={(i, v) =>
          dispatch({ type: "setPourAtSec", index: i, value: v })
        }
        onSelect={(i) => dispatch({ type: "selectPour", index: i })}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <PourEditTable
          state={state}
          mobile={mobile}
          onPatchPour={(i, patch) => {
            if (patch.atSec !== undefined) {
              dispatch({ type: "setPourAtSec", index: i, value: patch.atSec });
            }
            if (patch.pourAmount !== undefined) {
              dispatch({
                type: "setPourAmount",
                index: i,
                value: patch.pourAmount,
              });
            }
          }}
          onAddPour={() => dispatch({ type: "addPour" })}
          onRemovePour={(i) => dispatch({ type: "removePour", index: i })}
          onToggleBloom={() => dispatch({ type: "toggleBloom" })}
          onSelectPour={(i) => dispatch({ type: "selectPour", index: i })}
        />
        <CustomStatsPanel
          result={result}
          lockLastPour={state.lockLastPour}
          onToggleLock={(v) =>
            dispatch({ type: "setLockLastPour", value: v })
          }
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-surface-hairline pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-button border border-surface-hairline bg-surface px-4 py-2 text-body-sm text-text-secondary transition-colors hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!result.ok}
          title={
            result.ok ? undefined : "Fix validation errors to use this recipe"
          }
          onClick={() => {
            if (result.ok) onUseRecipe(result.recipe);
          }}
          className="rounded-button bg-accent px-4 py-2 text-body-sm font-medium text-text-on-accent transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use this recipe
        </button>
      </div>
    </div>
  );
}
