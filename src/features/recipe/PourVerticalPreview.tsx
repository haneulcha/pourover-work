import type { Pour } from "@/domain/types";
import { formatTime } from "@/ui/format";

const STROKE = {
  hairline: 1,
  base: 2.5,
  bold: 2.8,
} as const;

type Props = {
  readonly pours: readonly Pour[];
  readonly totalTimeSec: number;
  readonly width?: number;
  readonly height?: number;
};

export function PourVerticalPreview({
  pours,
  totalTimeSec,
  width = 340,
  height = 200,
}: Props) {
  if (pours.length === 0 || totalTimeSec <= 0) return null;

  const padT = 10;
  const padB = 10;
  const axisX = 44;
  const nodeR = 3.5;
  const rightLabelWidth = 70;
  const barMaxW = width - axisX - 16 - rightLabelWidth;

  const maxDelta = Math.max(...pours.map((p) => p.pourAmount));
  const ty = (t: number): number =>
    padT + (t / totalTimeSec) * (height - padT - padB);

  return (
    <svg
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block size-full"
      role="img"
      aria-label="푸어 스케줄"
    >
      <desc>
        {pours
          .map(
            (p) =>
              `${formatTime(p.atSec)} +${p.pourAmount}그램${p.label === "bloom" ? " (bloom)" : ""}`,
          )
          .join(", ")}
      </desc>

      <line
        x1={axisX}
        y1={padT}
        x2={axisX}
        y2={height - padB}
        stroke="var(--color-bg-hairline)"
        strokeWidth={STROKE.hairline}
      />

      {pours.map((p) => {
        const y = ty(p.atSec);
        const barW = (p.pourAmount / maxDelta) * barMaxW;
        const barStart = axisX + nodeR + 4;
        const bloom = p.label === "bloom";
        const color = bloom
          ? "var(--color-pour-bloom)"
          : "var(--color-pour-main)";

        return (
          <g key={p.index}>
            <Label x={axisX} y={y}>
              {formatTime(p.atSec)}
            </Label>

            <circle cx={axisX} cy={y} r={nodeR} fill={color} stroke={color} />
            <line
              x1={barStart}
              y1={y}
              x2={barStart + barW}
              y2={y}
              stroke={color}
              strokeWidth={bloom ? STROKE.bold : STROKE.base}
              strokeLinecap="round"
              opacity={bloom ? 1 : 0.88}
            />
            <text
              x={barStart + barW + 8}
              y={y + 3.5}
              fontSize={12}
              fill="var(--color-text-ink)"
              className="tabular-nums"
            >
              +{p.pourAmount}g
            </text>

            {bloom && (
              <text
                x={width - 4}
                y={y + 3.5}
                fontSize={10}
                fontWeight={700}
                fill="var(--color-pour-bloom)"
                textAnchor="end"
              >
                뜸 들이기 (Bloom)
              </text>
            )}
          </g>
        );
      })}

      <g>
        <Label x={axisX} y={ty(totalTimeSec)}>
          {formatTime(totalTimeSec)}
        </Label>
        <circle
          cx={axisX}
          cy={ty(totalTimeSec)}
          r={nodeR}
          fill="var(--color-text-body)"
          stroke="var(--color-text-body)"
        />
      </g>
    </svg>
  );
}

const Label = ({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) => {
  return (
    <text
      x={x - 12}
      y={y + 4}
      fontSize={12}
      fill="var(--color-text-body)"
      textAnchor="end"
      className="tabular-nums"
    >
      {children}
    </text>
  );
};
