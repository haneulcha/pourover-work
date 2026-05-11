import type { BuildResult, ValidationError } from "@pourover/domain/methods/custom";

type Props = {
  readonly result: BuildResult;
  readonly lockLastPour: boolean;
  readonly onToggleLock: (next: boolean) => void;
};

const errorMessage = (e: ValidationError): string => {
  switch (e.kind) {
    case "coffee-non-positive":
      return "Coffee must be greater than 0";
    case "water-non-positive":
      return "Total water must be greater than 0";
    case "time-non-positive":
      return "Total time must be greater than 0";
    case "no-pours":
      return "At least one pour is required";
    case "first-pour-not-zero":
      return "First pour must start at 0:00";
    case "non-monotonic-time":
      return `Pour ${e.pourIndex + 1} must come after the previous pour`;
    case "pour-after-total-time":
      return `Pour ${e.pourIndex + 1} is after total time`;
    case "non-positive-pour":
      return `Pour ${e.pourIndex + 1} amount must be greater than 0`;
    case "sum-mismatch":
      return `Pours sum to ${e.sum}g but total water is ${e.totalWater}g`;
    case "bloom-not-on-first":
      return "Bloom can only be on the first pour";
  }
};

const formatMSS = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec - m * 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export function CustomStatsPanel({ result, lockLastPour, onToggleLock }: Props) {
  const ok = result.ok;

  let coffeeStr = "—";
  let waterStr = "—";
  let ratioStr = "—";
  let poursStr = "—";
  let totalStr = "—";
  let avgIntervalStr = "—";

  if (ok) {
    const r = result.recipe;
    coffeeStr = `${r.coffee}g`;
    waterStr = `${r.totalWater}g`;
    ratioStr = `1:${(r.ratio as number).toFixed(1)}`;
    poursStr = String(r.pours.length);
    totalStr = formatMSS(r.totalTimeSec as number);
    if (r.pours.length > 1) {
      const avg = Math.round(
        (r.totalTimeSec as number) / (r.pours.length - 1),
      );
      avgIntervalStr = `${avg}s`;
    }
  }

  const errors = !result.ok ? result.errors : [];
  const visibleErrors = errors.slice(0, 3);
  const remaining = errors.length - visibleErrors.length;

  return (
    <div className="rounded-card border border-surface-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-caption-xxs font-semibold uppercase tracking-wider text-text-muted">
          Stats
        </span>
        <label className="flex items-center gap-2 text-caption-sm text-text-secondary">
          <input
            type="checkbox"
            checked={lockLastPour}
            onChange={(ev) => onToggleLock(ev.target.checked)}
            className="h-4 w-4 rounded border-surface-hairline text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          <span>Auto-fit last pour</span>
        </label>
      </div>

      {!result.ok && (
        <div
          role="alert"
          className="mt-3 rounded-button border border-danger bg-danger/10 p-3 text-caption-sm text-danger"
        >
          <ul className="space-y-1">
            {visibleErrors.map((e, i) => (
              <li key={i}>{errorMessage(e)}</li>
            ))}
            {remaining > 0 && <li>... and {remaining} more</li>}
          </ul>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="Coffee" value={coffeeStr} />
        <Stat label="Water" value={waterStr} />
        <Stat label="Ratio" value={ratioStr} />
        <Stat label="Pours" value={poursStr} />
        <Stat label="Total" value={totalStr} />
        <Stat label="Avg interval" value={avgIntervalStr} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dd className="text-body-lg font-semibold text-text-primary tabular-nums">
        {value}
      </dd>
      <dt className="text-caption-xxs uppercase tracking-wider text-text-muted">
        {label}
      </dt>
    </div>
  );
}
