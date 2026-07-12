import { getMethodName } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import type { Recipe } from "@pourover/domain/types";
import { cx } from "@/ui/cx";
import { formatGrindHint } from "@/ui/format";

export function BrewSummary({ recipe }: { readonly recipe: Recipe }) {
  const dripperName = drippers[recipe.dripper].name;
  const methodName = getMethodName(recipe.method);
  return (
    <section aria-label="레시피 요약" className="mt-10">
      <div className="h-px bg-surface-hairline" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-5">
        <SummaryCell label="드리퍼" value={dripperName} />
        <SummaryCell label="레시피" value={methodName} />
        <SummaryCell label="원두 · 물" value={`${recipe.coffee} · ${recipe.totalWater} g`} />
        <SummaryCell
          label="온도 · 분쇄"
          value={`${recipe.temperature}° · ${formatGrindHint(recipe.grindHint)}`}
        />
      </div>
      <div className="h-px bg-surface-hairline" />
    </section>
  );
}

function SummaryCell({
  label,
  value,
  small,
}: {
  readonly label: string;
  readonly value: string;
  readonly small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption-xxs uppercase tracking-wider text-text-muted">{label}</span>
      <span className={cx("tabular-nums", small ? "text-body-sm text-text-secondary" : "text-body-md")}>
        {value}
      </span>
    </div>
  );
}
