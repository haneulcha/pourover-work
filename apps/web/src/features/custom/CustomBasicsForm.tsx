import { useState } from "react";
import type {
  Celsius,
  DripperId,
  Grams,
  GrindHint,
  Seconds,
} from "@pourover/domain/types";
import { c, g, s } from "@pourover/domain/units";

type Patch = Partial<{
  dripper: DripperId;
  coffee: Grams;
  totalWater: Grams;
  temperature: Celsius;
  grindHint: GrindHint;
  totalTimeSec: Seconds;
}>;

type Props = {
  readonly dripper: DripperId;
  readonly coffee: Grams;
  readonly totalWater: Grams;
  readonly temperature: Celsius;
  readonly grindHint: GrindHint;
  readonly totalTimeSec: Seconds;
  readonly onChange: (patch: Patch) => void;
};

const parseTime = (v: string): number | null => {
  const m = /^(\d+):(\d{1,2})$/.exec(v.trim());
  if (!m) return null;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
};

const formatTimeMSS = (totalSec: number): string => {
  const m = Math.floor(totalSec / 60);
  const sec = Math.round(totalSec - m * 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const DRIPPER_OPTIONS: ReadonlyArray<{ value: DripperId; label: string }> = [
  { value: "v60", label: "V60" },
  { value: "kalita_wave", label: "Kalita Wave" },
  { value: "kalita_102", label: "Kalita 102" },
];

const GRIND_OPTIONS: ReadonlyArray<{ value: GrindHint; label: string }> = [
  { value: "fine", label: "fine" },
  { value: "medium-fine", label: "medium-fine" },
  { value: "medium", label: "medium" },
  { value: "medium-coarse", label: "medium-coarse" },
  { value: "coarse", label: "coarse" },
];

export function CustomBasicsForm({
  dripper,
  coffee,
  totalWater,
  temperature,
  grindHint,
  totalTimeSec,
  onChange,
}: Props) {
  const ratioVal = (coffee as number) > 0
    ? (totalWater as number) / (coffee as number)
    : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Dripper">
        <select
          value={dripper}
          onChange={(ev) => onChange({ dripper: ev.target.value as DripperId })}
          className="w-full rounded-button border border-surface-hairline bg-surface px-3 py-2 text-body-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {DRIPPER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`Ratio · 1:${ratioVal.toFixed(1)}`}>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            value={coffee as number}
            suffix="g coffee"
            onCommit={(n) => onChange({ coffee: g(n) })}
          />
          <NumberInput
            value={totalWater as number}
            suffix="g water"
            onCommit={(n) => onChange({ totalWater: g(n) })}
          />
        </div>
      </Field>

      <Field label="Temperature">
        <NumberInput
          value={temperature as number}
          suffix="°C"
          onCommit={(n) => onChange({ temperature: c(n) })}
        />
      </Field>

      <Field label="Grind">
        <select
          value={grindHint}
          onChange={(ev) =>
            onChange({ grindHint: ev.target.value as GrindHint })
          }
          className="w-full rounded-button border border-surface-hairline bg-surface px-3 py-2 text-body-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {GRIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Total time">
        <TimeInput
          value={totalTimeSec as number}
          onCommit={(n) => onChange({ totalTimeSec: s(n) })}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption-xxs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  suffix,
  onCommit,
}: {
  readonly value: number;
  readonly suffix?: string;
  readonly onCommit: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-button border border-surface-hairline bg-surface px-3 py-2 focus-within:ring-2 focus-within:ring-focus">
      <input
        key={value}
        type="number"
        defaultValue={value}
        onBlur={(ev) => {
          const n = Number(ev.target.value);
          if (!Number.isFinite(n)) {
            ev.target.value = String(value);
            return;
          }
          if (n !== value) onCommit(n);
        }}
        className="w-full bg-transparent text-body-sm text-text-primary tabular-nums focus:outline-none"
      />
      {suffix && (
        <span className="shrink-0 text-caption-sm text-text-muted">{suffix}</span>
      )}
    </div>
  );
}

function TimeInput({
  value,
  onCommit,
}: {
  readonly value: number;
  readonly onCommit: (next: number) => void;
}) {
  const [, setDraft] = useState(formatTimeMSS(value));

  return (
    <input
      key={value}
      type="text"
      inputMode="numeric"
      defaultValue={formatTimeMSS(value)}
      onChange={(ev) => setDraft(ev.target.value)}
      onBlur={(ev) => {
        const parsed = parseTime(ev.target.value);
        if (parsed === null) {
          ev.target.value = formatTimeMSS(value);
          setDraft(formatTimeMSS(value));
          return;
        }
        if (parsed !== value) onCommit(parsed);
        else ev.target.value = formatTimeMSS(value);
      }}
      placeholder="m:ss"
      aria-label="Total time"
      className="w-full rounded-button border border-surface-hairline bg-surface px-3 py-2 text-body-sm text-text-primary tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    />
  );
}
