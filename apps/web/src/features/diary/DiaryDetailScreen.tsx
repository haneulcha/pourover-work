import { useEffect, useState } from "react";
import { recipeFromJSON } from "@pourover/domain/serialize";
import type { Recipe } from "@pourover/domain/types";
import { Footer } from "@/ui/Footer";
import { formatTime } from "@/ui/format";
import { BrewSummary } from "@/features/complete/BrewSummary";
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
    await deleteLog(id);
    onDeleted();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-12 text-text-primary">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-body-sm text-text-secondary underline-offset-2 hover:underline">
          ← 목록
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={detail === null}
          className="text-body-sm text-text-muted underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-40"
        >
          삭제
        </button>
      </header>

      {error ? (
        <p className="mt-6 text-body-sm text-text-muted">기록을 불러오지 못했어요.</p>
      ) : (
        <>
          {detail && (
            <span className="mt-4 text-caption-sm text-text-muted tabular-nums">
              {detail.brewedAt.slice(0, 10)} · {formatTime(detail.durationSec)}
            </span>
          )}
          {recipe && <BrewSummary recipe={recipe} />}

          <section aria-label="메모" className="mt-6">
            <textarea
              aria-label="메모"
              value={memo}
              maxLength={280}
              onChange={(e) => setMemo(e.target.value)}
              onBlur={() => void patchLog(id, { memo: memo.trim() || null })}
              rows={3}
              className="w-full resize-none rounded-card border border-surface-hairline bg-surface-soft px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
