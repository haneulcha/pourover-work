import { brewMethods } from "@/domain/methods";
import { drippers } from "@/domain/drippers";
import { sessionDurationSec, type Feeling } from "@/domain/session";
import { cx } from "@/ui/cx";
import { formatTime } from "@/ui/format";
import { FeelingGlyph } from "@/features/complete/FeelingGlyph";
import type { ShareVariant, ShareVariantProps } from "./types";

const FEELING_LABEL: Record<Feeling, string> = {
  calm: "만족스러워요",
  neutral: "글쎄요",
  wave: "아쉬워요",
};

const formatShareDate = (epochMs: number): string => {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
};

export function Full({ session, photoUrl, color }: ShareVariantProps) {
  const { recipe } = session;
  const methodName = brewMethods[recipe.method].name;
  const dripperName = drippers[recipe.dripper].name;
  const isNegative = color === "negative";

  // Right-side scrim for legibility (Garmin/Strava-style). Photo stays
  // visible on the left third; text panel sits on the dark side at right.
  const scrim = isNegative
    ? "linear-gradient(to left, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 40%, transparent 75%)"
    : "linear-gradient(to left, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 40%, transparent 75%)";
  const textColor = isNegative ? "text-text-primary" : "text-white";
  const labelColor = isNegative ? "text-black/55" : "text-white/65";
  const dividerColor = isNegative ? "bg-black/15" : "bg-white/25";
  const wordmarkColor = isNegative ? "text-black/45" : "text-white/55";

  return (
    <div
      data-share-variant="full"
      data-color={color}
      className="relative h-full w-full overflow-hidden font-sans"
    >
      {/* <img> instead of CSS background-image: html-to-image inlines <img>
          src reliably, but drops background-image: url(blob:...) during
          foreignObject rasterization. */}
      <img
        src={photoUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: scrim }} />

      <div
        className={cx(
          "absolute inset-y-0 right-0 flex w-1/2 flex-col justify-center gap-7 p-14",
          textColor,
        )}
      >
        <span
          className={cx(
            "text-caption-sm font-semibold uppercase tracking-widest",
            labelColor,
          )}
        >
          {methodName}
        </span>

        <Stat
          value={formatTime(sessionDurationSec(session))}
          label="시간"
          labelColor={labelColor}
          big
        />

        <div className={cx("h-px w-12", dividerColor)} />

        <Stat
          value={formatShareDate(session.startedAt)}
          label="날짜"
          labelColor={labelColor}
        />

        <Stat
          value={dripperName}
          label="드리퍼"
          labelColor={labelColor}
        />

        <Stat
          value={`${recipe.coffee}g · ${recipe.totalWater}g · ${recipe.temperature}°`}
          label="원두 · 물 · 온도"
          labelColor={labelColor}
        />

        {session.feeling != null && (
          <div>
            <div className="flex items-center gap-2">
              <FeelingGlyph kind={session.feeling} size={26} />
              <span className="text-heading-sm tabular-nums leading-none">
                {FEELING_LABEL[session.feeling]}
              </span>
            </div>
            <span
              className={cx(
                "mt-2 block text-caption-sm uppercase tracking-widest",
                labelColor,
              )}
            >
              오늘의 기분
            </span>
          </div>
        )}
      </div>

      <div
        className={cx(
          "absolute bottom-6 left-6 text-caption-sm tracking-widest",
          wordmarkColor,
        )}
      >
        pourover.work
      </div>
    </div>
  );
}

type StatProps = {
  readonly value: string;
  readonly label: string;
  readonly labelColor: string;
  readonly big?: boolean;
};

function Stat({ value, label, labelColor, big = false }: StatProps) {
  return (
    <div>
      <div
        className={cx(
          "tabular-nums leading-none",
          big ? "text-heading-xl font-medium" : "text-heading-sm",
        )}
      >
        {value}
      </div>
      <span
        className={cx(
          "mt-2 block text-caption-sm uppercase tracking-widest",
          labelColor,
        )}
      >
        {label}
      </span>
    </div>
  );
}

export const fullVariant: ShareVariant = {
  id: "full",
  name: "전체",
  Component: Full,
  exportSize: { width: 1080, height: 1080 },
};
