import { useEffect, useRef, useState } from "react";
import type { BrewSession } from "@pourover/domain/session";
import { cx } from "@/ui/cx";
import { PhotoPicker } from "./PhotoPicker";
import { ShareCanvas } from "./ShareCanvas";
import { usePhoto } from "./usePhoto";
import { canvasToBlob } from "./render/canvasToBlob";
import {
  canNativeShareImage,
  shareOrDownload,
  type ShareOutcome,
} from "./output/shareOrDownload";
import {
  DEFAULT_COLOR,
  DEFAULT_LAYOUT,
  getVariant,
} from "./variants/registry";

type Props = {
  readonly open: boolean;
  readonly session: BrewSession;
  readonly onClose: () => void;
};

type Phase = "preview" | "exporting" | "error";

const filenameFor = (session: BrewSession): string => {
  const d = new Date(session.startedAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `pourover-${y}-${m}-${day}.png`;
};

export function ShareImageDialog({ open, session, onClose }: Props) {
  const photo = usePhoto();
  const [phase, setPhase] = useState<Phase>("preview");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layout = DEFAULT_LAYOUT;
  const color = DEFAULT_COLOR;
  const variant = getVariant(layout);

  useEffect(() => {
    if (!open) {
      photo.clear();
      setPhase("preview");
      setErrorMsg(null);
    }
  }, [open, photo]);

  if (!open) return null;

  const shareLabel = canNativeShareImage() ? "공유하기" : "이미지 저장";

  const handleShare = async (): Promise<void> => {
    if (canvasRef.current == null || photo.state.kind !== "loaded") return;
    setPhase("exporting");
    setErrorMsg(null);
    try {
      const blob = await canvasToBlob(canvasRef.current, "image/png");
      const outcome: ShareOutcome = await shareOrDownload(
        blob,
        filenameFor(session),
      );
      if (outcome === "shared" || outcome === "downloaded") {
        onClose();
        return;
      }
      if (outcome === "cancelled") {
        setPhase("preview");
        return;
      }
      setErrorMsg("공유에 실패했어요. 다시 시도해주세요.");
      setPhase("error");
    } catch (err) {
      console.error("[share-image] export failed:", err);
      setErrorMsg("이미지를 만들지 못했어요. 다시 시도해주세요.");
      setPhase("error");
    }
  };

  // Preview viewport: render at exportSize then scale down to fit dialog.
  const PREVIEW_WIDTH = 320;
  const scale = PREVIEW_WIDTH / variant.exportSize.width;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="공유 이미지 만들기"
      className="fixed inset-0 z-dialog flex flex-col bg-surface px-6 pb-6 pt-12 text-text-primary"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-body-md font-semibold">공유하기</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-body-sm text-text-secondary"
        >
          닫기
        </button>
      </header>

      {photo.state.kind === "loading" && (
        <div className="mt-10 flex flex-1 items-center justify-center">
          <p className="text-body-sm text-text-secondary">사진을 불러오는 중…</p>
        </div>
      )}

      {photo.state.kind === "empty" && (
        <div className="mt-10 flex flex-1 flex-col justify-center gap-6">
          <p className="text-center text-body-sm text-text-secondary">
            방금 내린 커피 사진을 골라주세요.
          </p>
          <PhotoPicker onPick={photo.setFile} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-button py-3.5 text-body-sm text-text-muted"
          >
            취소
          </button>
        </div>
      )}

      {photo.state.kind === "loaded" && (
        <div className="mt-6 flex flex-1 flex-col gap-6">
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            <div
              style={{
                width: `${PREVIEW_WIDTH}px`,
                height: `${variant.exportSize.height * scale}px`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <ShareCanvas
                  ref={canvasRef}
                  session={session}
                  photoUrl={photo.state.url}
                  layout={layout}
                  color={color}
                />
              </div>
            </div>
          </div>

          {phase === "error" && errorMsg != null && (
            <p className="text-center text-body-sm text-pour-bloom">{errorMsg}</p>
          )}

          <div className="flex flex-col gap-2 text-body-sm font-medium">
            <button
              type="button"
              onClick={handleShare}
              disabled={phase === "exporting"}
              className={cx(
                "rounded-button border border-text-primary bg-surface-soft py-3.5 transition-colors hover:bg-surface-strong",
                phase === "exporting" && "opacity-disabled",
              )}
            >
              {phase === "exporting" ? "만드는 중…" : shareLabel}
            </button>
            <button
              type="button"
              onClick={photo.clear}
              disabled={phase === "exporting"}
              className="rounded-button border border-surface-hairline py-3.5"
            >
              사진 변경
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
