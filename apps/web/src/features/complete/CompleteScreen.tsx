import { useEffect, useRef, useState } from "react";
import {
  sessionDurationSec,
  type BrewSession,
  type Feeling,
} from "@pourover/domain/session";
import { cx } from "@/ui/cx";
import { Footer } from "@/ui/Footer";
import { formatBrewedAt, formatTime } from "@/ui/format";
import { useSession } from "@/features/auth/useSession";
import { signInWithGoogle } from "@/features/auth/api";
import { createLog, patchLog } from "@/features/diary/api";
import { BrewSummary } from "./BrewSummary";
import { FeelingGlyph } from "./FeelingGlyph";
import { ShareImageDialog } from "@/features/share-image/ShareImageDialog";

type Props = {
  readonly session: BrewSession;
  readonly logId: string;
  readonly onFeelingChange: (feeling: Feeling | null) => void;
  readonly onExit: () => void;
};

const FEELINGS: readonly { id: Feeling; label: string }[] = [
  { id: "calm", label: "만족스러워요" },
  { id: "neutral", label: "글쎄요" },
  { id: "wave", label: "아쉬워요" },
];

export function CompleteScreen({ session, logId, onFeelingChange, onExit }: Props) {
  const { recipe } = session;
  const dateText = formatBrewedAt(session.startedAt);
  const [shareOpen, setShareOpen] = useState(false);

  const auth = useSession();
  const isLoggedIn = auth.status === "loaded" && auth.session != null;
  const [memo, setMemo] = useState("");
  const createdRef = useRef(false);

  // 완료 진입 시 1회 자동 저장(멱등). StrictMode 이중 마운트는 ref로 가드하고,
  // 서버도 ON CONFLICT 로 멱등이라 이중 안전.
  useEffect(() => {
    if (!isLoggedIn || createdRef.current) return;
    createdRef.current = true;
    void createLog({
      id: logId,
      recipe: session.recipe,
      brewedAt: new Date(session.startedAt).toISOString(),
      durationSec: sessionDurationSec(session),
      feeling: session.feeling ?? null,
      memo: null,
    });
  }, [isLoggedIn, logId, session]);

  const handleFeelingTap = (feeling: Feeling): void => {
    const next = session.feeling === feeling ? null : feeling;
    onFeelingChange(next);
    if (isLoggedIn) void patchLog(logId, { feeling: next });
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
      <BrewSummary recipe={recipe} />

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

      {/* memo / whisper */}
      {isLoggedIn ? (
        <section aria-label="메모" className="mt-6">
          <textarea
            aria-label="메모"
            value={memo}
            maxLength={280}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => void patchLog(logId, { memo: memo.trim() || null })}
            placeholder="한 줄 남겨둘까요"
            rows={2}
            className="w-full resize-none rounded-card border border-surface-hairline bg-surface-soft px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => void signInWithGoogle(window.location.href)}
          className="mt-6 block w-full text-center text-caption-sm text-text-muted underline underline-offset-2 hover:text-text-secondary"
        >
          로그인하면 이 기록이 일기에 남아요
        </button>
      )}

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
