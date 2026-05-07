import { useEffect, useRef, useState } from "react";

type Props = {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly suffix?: string;
};

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: Props) {
  const [raw, setRaw] = useState<string>(String(value));
  const focusedRef = useRef(false);

  // Only sync from prop when user isn't actively editing the number input;
  // otherwise in-progress typing ('2' on way to '25') gets clobbered.
  useEffect(() => {
    if (!focusedRef.current) setRaw(String(value));
  }, [value]);

  const clamp = (n: number): number =>
    Math.max(min, Math.min(max, Math.round(n)));

  const commitRaw = (): void => {
    if (raw === "") {
      setRaw(String(value));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setRaw(String(value));
      return;
    }
    const clamped = clamp(n);
    setRaw(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="flex-1 accent-accent"
      />
      <input
        type="number"
        aria-label={`${label} 값`}
        min={min}
        max={max}
        step={step}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commitRaw();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-16 rounded-subtle border border-surface-hairline bg-surface px-2 py-1 text-right text-body-sm font-medium tabular-nums"
      />
      {suffix && <span className="text-body-sm text-text-muted">{suffix}</span>}
    </div>
  );
}
