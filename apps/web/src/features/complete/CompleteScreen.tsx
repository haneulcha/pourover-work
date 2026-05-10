import { useState } from "react";
import { brewMethods } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import {
  sessionDurationSec,
  type BrewSession,
  type Feeling,
} from "@pourover/domain/session";
import { cx } from "@/ui/cx";
import { Footer } from "@/ui/Footer";
import { formatBrewedAt, formatGrindHint, formatTime } from "@/ui/format";
import { FeelingGlyph } from "./FeelingGlyph";
import { ShareImageDialog } from "@/features/share-image/ShareImageDialog";

type Props = {
  readonly session: BrewSession;
  readonly onFeelingChange: (feeling: Feeling | null) => void;
  readonly onExit: () => void;
};

const FEELINGS: readonly { id: Feeling; label: string }[] = [
  { id: "calm", label: "만족스러워요" },
  { id: "neutral", label: "글쎄요" },
  { id: "wave", label: "아쉬워요" },
];

export function CompleteScreen({ session, onFeelingChange, onExit }: Props) {
  const { recipe } = session;
  const dripperName = drippers[recipe.dripper].name;
  const methodName = brewMethods[recipe.method].name;
  const dateText = formatBrewedAt(session.startedAt);
  const [shareOpen, setShareOpen] = useState(false);

  const handleFeelingTap = (feeling: Feeling): void => {
    onFeelingChange(session.feeling === feeling ? null : feeling);
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-16 text-text-primary">
      {/* quiet header */}
      <header className="flex flex-col items-center gap-1">
        <span className="text-caption-sm text-text-muted tabular-nums">{dateText}</span>
      </header>

      {/* hero */}
      <section aria-label="총 시간" className="mt-4 flex flex-col items-center">
        <span className="text-caption-sm text-text-muted">오늘의 커피</span>
        <span className="mt-1 text-heading-xl font-medium leading-none tabular-nums">
          {formatTime(sessionDurationSec(session))}
        </span>
      </section>

      {/* recipe summary card */}
      <section aria-label="레시피 요약" className="mt-10">
        <div className="h-px bg-border" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-5">
          <SummaryCell label="드리퍼" value={dripperName} />
          <SummaryCell label="레시피" value={methodName} />
          <SummaryCell
            label="원두 · 물"
            value={`${recipe.coffee} g · ${recipe.totalWater} g`}
          />
          <SummaryCell
            label="온도 · 분쇄"
            value={`${recipe.temperature}° · ${formatGrindHint(recipe.grindHint)}`}
          />
        </div>
        <div className="h-px bg-border" />
      </section>

      {/* feeling */}
      <section
        aria-label="감정 기록"
        className="mt-10 flex flex-col items-center gap-3"
      >
        <p className="text-body-sm text-text-secondary">
          오늘의 핸드드립 경험은 어땠나요?
        </p>
        <div className="flex w-full gap-2">
          {FEELINGS.map((f) => {
            const isSelected = session.feeling === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={f.label}
                onClick={() => handleFeelingTap(f.id)}
                className={cx(
                  "flex h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-card border transition-colors",
                  isSelected
                    ? "border-text-primary bg-surface-soft font-medium text-text-primary"
                    : "border-surface-hairline text-text-secondary hover:bg-surface-strong/60",
                )}
              >
                <FeelingGlyph kind={f.id} size={34} />
                <span className="text-caption-sm">{f.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* bottom buttons */}
      <div className="mt-auto flex gap-2 pt-10 text-body-sm font-medium">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="공유"
          className="w-16 rounded-button border border-text-primary bg-surface-soft py-3 text-text-primary transition-colors hover:bg-surface-strong"
        >
          공유
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex-1 rounded-button border border-text-primary bg-surface-soft py-3 transition-colors hover:bg-surface-strong"
        >
          처음으로
        </button>
      </div>

      <Footer />
      <ShareImageDialog
        open={shareOpen}
        session={session}
        onClose={() => setShareOpen(false)}
      />
    </div>
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
      <span className="text-caption-xxs uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span
        className={cx(
          "tabular-nums",
          small ? "text-body-sm text-text-secondary" : "text-body-md",
        )}
      >
        {value}
      </span>
    </div>
  );
}
