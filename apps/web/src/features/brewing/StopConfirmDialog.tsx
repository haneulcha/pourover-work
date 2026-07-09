import { Button } from "@/ui/Button";

type Props = {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export function StopConfirmDialog({ onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-dialog">
      <button
        type="button"
        aria-label="다이얼로그 닫기"
        onClick={onCancel}
        className="absolute inset-0 bg-overlay-scrim"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-dialog-title"
        className="absolute left-1/2 top-1/2 w-[calc(100%-3.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-large bg-surface p-6 shadow-overlay"
      >
        <h2 id="stop-dialog-title" className="text-body-lg font-medium">
          브루잉을 중단할까요?
        </h2>
        <p className="mt-2 text-body-sm text-text-muted">기록은 남지 않습니다.</p>
        <div className="mt-5 flex gap-2.5">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-11 flex-1">
            계속하기
          </Button>
          <Button size="sm" onClick={onConfirm} className="h-11 flex-1">
            처음으로
          </Button>
        </div>
      </div>
    </div>
  );
}
