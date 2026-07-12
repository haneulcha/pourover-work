import type { Feeling } from "@pourover/domain/session";

// 감정의 이름은 한 곳에서만. 완료 화면의 선택지와 일기의 표시가 같은 말을 쓴다.
export const FEELING_LABEL: Record<Feeling, string> = {
  calm: "만족스러워요",
  neutral: "글쎄요",
  wave: "아쉬워요",
};

type Props = {
  readonly kind: Feeling;
  readonly size?: number;
};

export function FeelingGlyph({ kind, size = 34 }: Props) {
  if (kind === "calm") {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
        <circle
          cx={17}
          cy={17}
          r={11}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        />
        <circle cx={17} cy={17} r={2} fill="currentColor" />
      </svg>
    );
  }
  if (kind === "neutral") {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
        <line
          x1={5}
          y1={17}
          x2={29}
          y2={17}
          stroke="currentColor"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
        <line
          x1={17}
          y1={13}
          x2={17}
          y2={21}
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.6}
        />
      </svg>
    );
  }
  // wave
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <path
        d="M 4 14 Q 10 8, 17 14 T 30 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path
        d="M 4 20 Q 10 26, 17 20 T 30 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.7}
      />
    </svg>
  );
}
