import type { DripperId } from "@pourover/domain/types";
import { cx } from "./cx";

const STROKE = {
  hairline: 0.8,
  thin: 1.2,
  base: 1.6,
} as const;

type Props = {
  readonly type: DripperId;
  readonly size?: number;
  readonly selected?: boolean;
  readonly className?: string;
};

export function DripperIcon({
  type,
  size = 56,
  selected = false,
  className,
}: Props) {
  const strokeWidth = selected ? STROKE.base : STROKE.thin;
  const opacity = selected ? 1 : 0.55;

  if (type === "v60") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 90 90"
        className={cx("text-text-primary", className)}
        aria-hidden="true"
      >
        <g
          stroke="currentColor"
          strokeWidth={strokeWidth}
          opacity={opacity}
          fill="none"
          strokeLinejoin="round"
        >
          <path d="M 12 20 L 78 20 L 50 70 L 40 70 Z" />
          <line x1={42} y1={70} x2={42} y2={78} />
          <line x1={48} y1={70} x2={48} y2={78} />
        </g>
        <line
          x1={20}
          y1={26}
          x2={70}
          y2={26}
          stroke="currentColor"
          strokeWidth={STROKE.hairline}
          opacity={opacity * 0.5}
        />
      </svg>
    );
  }

  if (type === "kalita_102") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 90 90"
        className={cx("text-text-primary", className)}
        aria-hidden="true"
      >
        <g
          stroke="currentColor"
          strokeWidth={strokeWidth}
          opacity={opacity}
          fill="none"
          strokeLinejoin="round"
        >
          <path d="M 14 20 L 76 20 L 58 68 L 32 68 Z" />
          <line x1={36} y1={68} x2={36} y2={75} />
          <line x1={45} y1={68} x2={45} y2={75} />
          <line x1={54} y1={68} x2={54} y2={75} />
        </g>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={22 + i * 15}
            y1={28}
            x2={34 + i * 8}
            y2={62}
            stroke="currentColor"
            strokeWidth={STROKE.hairline}
            opacity={opacity * 0.5}
          />
        ))}
      </svg>
    );
  }

  // kalita_wave
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 90 90"
      className={cx("text-text-primary", className)}
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={opacity}
        fill="none"
        strokeLinejoin="round"
      >
        <path d="M 14 22 L 76 22 L 62 64 L 28 64 Z" />
        <line x1={30} y1={64} x2={30} y2={72} />
        <line x1={45} y1={64} x2={45} y2={72} />
        <line x1={60} y1={64} x2={60} y2={72} />
      </g>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M ${20 + i * 4} ${30 + i * 10} Q 45 ${26 + i * 10}, ${70 - i * 4} ${30 + i * 10}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE.hairline}
          opacity={opacity * 0.5}
        />
      ))}
    </svg>
  );
}
