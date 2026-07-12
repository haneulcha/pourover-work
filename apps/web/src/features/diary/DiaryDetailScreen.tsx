import { useEffect, useState } from "react";
import { recipeFromJSON } from "@pourover/domain/serialize";
import type { Recipe } from "@pourover/domain/types";
import { Footer } from "@/ui/Footer";
import { formatLogClock, formatLogDay, formatTime } from "@/ui/format";
import { BrewSummary } from "@/features/complete/BrewSummary";
import { FEELING_LABEL, FeelingGlyph } from "@/features/complete/FeelingGlyph";
import { deleteLog, getLog, patchLog, type LogDetail } from "./api";

export function DiaryDetailScreen({
  id,
  onBack,
  onDeleted,
}: {
  readonly id: string;
  readonly onBack: () => void;
  readonly onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void getLog(id)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setMemo(d.memo ?? "");
        setRecipe(recipeFromJSON(d.recipe));
      })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [id]);

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteLog(id);
      onDeleted();
    } catch {
      setConfirmingDelete(false);
      setDeleteFailed(true);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-12 text-text-primary">
      <header className="flex min-h-8 items-center justify-between">
        <button type="button" onClick={onBack} className="text-body-sm text-text-secondary underline-offset-2 hover:underline">
          ← 목록
        </button>

        {confirmingDelete ? (
          <span className="flex items-center gap-md text-body-sm">
            <span className="text-text-secondary">삭제할까요?</span>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-text-muted underline-offset-2 hover:underline"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="font-medium text-danger underline-offset-2 hover:underline"
            >
              삭제
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={detail === null}
            className="text-body-sm text-text-muted underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            삭제
          </button>
        )}
      </header>

      {error ? (
        <p className="mt-6 text-body-sm text-text-muted">기록을 불러오지 못했어요.</p>
      ) : (
        <>
          {detail && (
            <section aria-label="브루잉 기록" className="mt-lg flex flex-col items-center">
              <span className="text-caption-sm tabular-nums text-text-muted">
                {formatLogDay(detail.brewedAt)} · {formatLogClock(detail.brewedAt)}
              </span>
              <span className="mt-1 text-heading-xl font-medium leading-none tabular-nums">
                {formatTime(detail.durationSec)}
              </span>
              {detail.feeling && (
                <span className="mt-sm flex items-center gap-xs rounded-pill bg-surface-soft py-1 pl-2 pr-3 text-accent">
                  <FeelingGlyph kind={detail.feeling} size={24} />
                  <span className="text-body-sm text-text-secondary">
                    {FEELING_LABEL[detail.feeling]}
                  </span>
                </span>
              )}
            </section>
          )}

          {recipe && <BrewSummary recipe={recipe} />}

          <section aria-label="메모" className="mt-lg">
            <span className="mb-xxs block text-caption-xxs uppercase tracking-wider text-text-muted">
              메모
            </span>
            <textarea
              aria-label="메모"
              value={memo}
              maxLength={280}
              onChange={(e) => setMemo(e.target.value)}
              onBlur={() => void patchLog(id, { memo: memo.trim() || null })}
              placeholder="한 줄 남겨둘까요"
              rows={3}
              className="w-full resize-none rounded-card border border-surface-hairline bg-surface-soft px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </section>

          {deleteFailed && (
            <p role="alert" className="mt-xs text-caption-sm text-danger">
              삭제하지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          )}
        </>
      )}

      <Footer />
    </div>
  );
}
