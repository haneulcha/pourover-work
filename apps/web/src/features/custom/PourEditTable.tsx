import type { Grams, Seconds } from "@pourover/domain/types";
import { g, s } from "@pourover/domain/units";
import type { CustomFormState } from "./customFormState";

type Props = {
  readonly state: CustomFormState;
  readonly mobile: boolean;
  readonly onPatchPour: (
    index: number,
    patch: { atSec?: Seconds; pourAmount?: Grams },
  ) => void;
  readonly onAddPour: () => void;
  readonly onRemovePour: (index: number) => void;
  readonly onToggleBloom: () => void;
  readonly onSelectPour: (index: number | null) => void;
};

const fmtTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const sx = sec % 60;
  return `${m}:${String(sx).padStart(2, "0")}`;
};

const parseTime = (v: string): number | null => {
  const m = /^(\d+):(\d{1,2})$/.exec(v.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
};

export function PourEditTable({
  state,
  mobile,
  onPatchPour,
  onAddPour,
  onRemovePour,
  onToggleBloom,
  onSelectPour,
}: Props) {
  const totalWaterNum = state.totalWater as number;
  const cumulative: number[] = [];
  let running = 0;
  for (const p of state.pours) {
    running += p.pourAmount as number;
    cumulative.push(running);
  }

  const pctOf = (amount: number): string =>
    totalWaterNum > 0
      ? `${Math.round((amount / totalWaterNum) * 100)}%`
      : "—";

  const lastIndex = state.pours.length - 1;
  const isLastLocked = (i: number): boolean =>
    state.lockLastPour && i === lastIndex && state.pours.length > 1;

  if (mobile) {
    return (
      <div className="flex flex-col gap-3">
        {state.pours.map((p, i) => {
          const isFirst = i === 0;
          const isSelected = state.selectedPourIndex === i;
          const lastLocked = isLastLocked(i);
          const bloomOn = isFirst && p.label === "bloom";
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onSelectPour(i)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelectPour(i);
                }
              }}
              className={`rounded-card border p-3 transition-colors ${
                isSelected
                  ? "border-accent bg-surface-strong"
                  : "border-surface-hairline bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                {isFirst ? (
                  <BloomToggle on={bloomOn} onChange={onToggleBloom} />
                ) : (
                  <span className="text-body-sm font-medium text-text-primary">
                    Pour {i + 1}
                  </span>
                )}
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Remove pour ${i + 1}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onRemovePour(i);
                    }}
                    className="rounded-button px-2 py-1 text-text-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <LabeledRow label="Time">
                  <TimeCell
                    value={p.atSec as number}
                    disabled={isFirst}
                    onCommit={(n) => onPatchPour(i, { atSec: s(n) })}
                  />
                </LabeledRow>
                <LabeledRow label="Pour (g)">
                  <GramsCell
                    value={p.pourAmount as number}
                    disabled={lastLocked}
                    onCommit={(n) => onPatchPour(i, { pourAmount: g(n) })}
                  />
                </LabeledRow>
                <div className="flex items-center justify-between text-caption-xxs uppercase tracking-wider text-text-muted">
                  <span>
                    Cum.{" "}
                    <span className="tabular-nums text-text-secondary normal-case">
                      {cumulative[i]}g
                    </span>
                  </span>
                  <span>
                    %{" "}
                    <span className="tabular-nums text-text-secondary normal-case">
                      {pctOf(p.pourAmount as number)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddPour}
          className="rounded-button border border-dashed border-surface-hairline bg-surface px-3 py-2 text-body-sm text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          + Add pour
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-surface-hairline bg-surface">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-surface-hairline text-left text-caption-xxs uppercase tracking-wider text-text-muted">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Time</th>
            <th className="px-3 py-2 font-semibold">Pour (g)</th>
            <th className="px-3 py-2 font-semibold">Cum.</th>
            <th className="px-3 py-2 font-semibold">%</th>
            <th className="px-3 py-2 font-semibold" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {state.pours.map((p, i) => {
            const isFirst = i === 0;
            const isSelected = state.selectedPourIndex === i;
            const lastLocked = isLastLocked(i);
            const bloomOn = isFirst && p.label === "bloom";
            return (
              <tr
                key={i}
                onClick={() => onSelectPour(i)}
                className={`cursor-pointer border-b border-surface-hairline last:border-b-0 transition-colors ${
                  isSelected ? "bg-surface-strong" : "hover:bg-surface-strong/60"
                }`}
              >
                <td className="px-3 py-2 align-middle">
                  {isFirst ? (
                    <BloomToggle on={bloomOn} onChange={onToggleBloom} />
                  ) : (
                    <span className="text-text-secondary tabular-nums">
                      {i + 1}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <TimeCell
                    value={p.atSec as number}
                    disabled={isFirst}
                    onCommit={(n) => onPatchPour(i, { atSec: s(n) })}
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <GramsCell
                    value={p.pourAmount as number}
                    disabled={lastLocked}
                    onCommit={(n) => onPatchPour(i, { pourAmount: g(n) })}
                  />
                </td>
                <td className="px-3 py-2 align-middle text-text-muted tabular-nums">
                  {cumulative[i]}g
                </td>
                <td className="px-3 py-2 align-middle text-text-muted tabular-nums">
                  {pctOf(p.pourAmount as number)}
                </td>
                <td className="px-3 py-2 align-middle text-right">
                  {i > 0 && (
                    <button
                      type="button"
                      aria-label={`Remove pour ${i + 1}`}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onRemovePour(i);
                      }}
                      className="rounded-button px-2 py-1 text-text-muted hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={6} className="px-3 py-2">
              <button
                type="button"
                onClick={onAddPour}
                className="w-full rounded-button px-3 py-2 text-body-sm text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                + Add pour
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BloomToggle({
  on,
  onChange,
}: {
  readonly on: boolean;
  readonly onChange: () => void;
}) {
  return (
    <label
      onClick={(ev) => ev.stopPropagation()}
      className="inline-flex items-center gap-2"
    >
      <input
        type="checkbox"
        checked={on}
        onChange={onChange}
        className="h-4 w-4 rounded border-surface-hairline text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <span
        className={`text-caption-sm font-medium ${
          on ? "text-pour-bloom" : "text-text-muted"
        }`}
      >
        Bloom
      </span>
    </label>
  );
}

function TimeCell({
  value,
  onCommit,
  disabled,
}: {
  readonly value: number;
  readonly onCommit: (next: number) => void;
  readonly disabled: boolean;
}) {
  if (disabled) {
    return (
      <span className="text-text-muted tabular-nums">{fmtTime(value)}</span>
    );
  }
  return (
    <input
      key={value}
      type="text"
      inputMode="numeric"
      defaultValue={fmtTime(value)}
      onClick={(ev) => ev.stopPropagation()}
      onBlur={(ev) => {
        const parsed = parseTime(ev.target.value);
        if (parsed === null) {
          ev.target.value = fmtTime(value);
          return;
        }
        if (parsed !== value) onCommit(parsed);
        else ev.target.value = fmtTime(value);
      }}
      placeholder="m:ss"
      aria-label="Pour time"
      className="w-20 rounded-button border border-surface-hairline bg-surface px-2 py-1 text-body-sm text-text-primary tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    />
  );
}

function GramsCell({
  value,
  onCommit,
  disabled,
}: {
  readonly value: number;
  readonly onCommit: (next: number) => void;
  readonly disabled: boolean;
}) {
  if (disabled) {
    return (
      <span className="text-text-muted tabular-nums">{value}g</span>
    );
  }
  return (
    <input
      key={value}
      type="number"
      defaultValue={value}
      onClick={(ev) => ev.stopPropagation()}
      onBlur={(ev) => {
        const n = Number(ev.target.value);
        if (!Number.isFinite(n) || n <= 0) {
          ev.target.value = String(value);
          return;
        }
        if (n !== value) onCommit(n);
      }}
      aria-label="Pour amount"
      className="w-20 rounded-button border border-surface-hairline bg-surface px-2 py-1 text-body-sm text-text-primary tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    />
  );
}

function LabeledRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-caption-xxs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div onClick={(ev) => ev.stopPropagation()}>{children}</div>
    </div>
  );
}
