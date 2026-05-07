import { useRef, useState } from "react";
import type { Seconds } from "@/domain/types";
import { s } from "@/domain/units";
import type { CustomFormState } from "./customFormState";

type Props = {
  readonly state: CustomFormState;
  readonly mobile: boolean;
  readonly onDragMarker: (index: number, value: Seconds) => void;
  readonly onSelect: (index: number | null) => void;
};

const fmtTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const sx = Math.round(sec % 60);
  return `${m}:${String(sx).padStart(2, "0")}`;
};

export function PourTimelinePreview({
  state,
  mobile,
  onDragMarker,
  onSelect,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const total = state.totalTimeSec as number;
  const safeTotal = total > 0 ? total : 1;

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    if (mobile || index === 0) return;
    e.preventDefault();
    setDragIdx(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (dragIdx == null) return;
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const sec = Math.round(ratio * total);
    onDragMarker(dragIdx, s(sec));
  };

  const endDrag = () => setDragIdx(null);

  const ticks = [0, total / 4, total / 2, (3 * total) / 4, total];

  return (
    <div className="rounded-card border border-surface-hairline bg-surface p-4">
      <div
        ref={trackRef}
        className="relative h-14 select-none"
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-pill bg-timeline-grid" />
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-pill bg-pour-main/40" />
        {state.pours.map((p, i) => {
          const isFirst = i === 0;
          const isSelected = state.selectedPourIndex === i;
          const isBloom = p.label === "bloom";
          const isDragging = dragIdx === i;
          const cursorClass =
            mobile || isFirst
              ? "cursor-default"
              : isDragging
                ? "cursor-grabbing"
                : "cursor-grab";
          const colorClass = isBloom ? "bg-pour-bloom" : "bg-pour-main";
          const ringClass = isSelected
            ? "ring-2 ring-text-primary"
            : "";
          const left = `${((p.atSec as number) / safeTotal) * 100}%`;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Pour ${i + 1} at ${p.atSec as number}s`}
              onPointerDown={startDrag(i)}
              onClick={() => onSelect(i)}
              style={{ left }}
              className={`absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface ${colorClass} ${cursorClass} ${ringClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-focus`}
            />
          );
        })}
      </div>
      {!mobile && (
        <div className="mt-2 grid grid-cols-5 text-caption-xxs uppercase tracking-wider text-text-muted">
          {ticks.map((t, i) => (
            <span
              key={i}
              className={`tabular-nums ${
                i === 0
                  ? "text-left"
                  : i === ticks.length - 1
                    ? "text-right"
                    : "text-center"
              }`}
            >
              {fmtTime(t)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
