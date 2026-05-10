import type { DripperId } from "@pourover/domain/types";
import { cx } from "@/ui/cx";
import { DripperIcon } from "@/ui/DripperIcon";

type Option = {
  readonly id: DripperId;
  readonly name: string;
  readonly methodSubtitle: string;
};

type Props = {
  readonly options: readonly Option[];
  readonly selected: DripperId;
  readonly onSelect: (id: DripperId) => void;
  readonly onClose: () => void;
};

export function DripperPopover({
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  return (
    <>
      <button
        type="button"
        aria-label="팝오버 닫기"
        onClick={onClose}
        className="fixed inset-0 z-popover bg-surface/45 motion-safe:animate-overlay-in"
      />
      <div
        role="dialog"
        aria-label="드리퍼 선택"
        className="absolute left-[4.25rem] top-full z-popover min-w-popover origin-top-left rounded-card border border-surface-hairline bg-surface p-1 shadow-floating motion-safe:animate-popover-in"
      >
        {options.map((opt) => {
          const isSelected = opt.id === selected;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={opt.name}
              onClick={() => onSelect(opt.id)}
              className={cx(
                "flex w-full items-center gap-3 rounded-card px-2 py-2 text-left transition-colors",
                isSelected ? "bg-surface-strong" : "hover:bg-surface-strong/60",
              )}
            >
              <DripperIcon type={opt.id} size={32} selected={isSelected} />
              <div className="flex-1">
                <div className="text-body-sm font-medium">{opt.name}</div>
                <div className="text-caption-xxs text-text-muted">
                  {opt.methodSubtitle}
                </div>
              </div>
              {isSelected && (
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                >
                  <path
                    d="M 2 6 L 5 9 L 10 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
