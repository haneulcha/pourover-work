import { dripperList } from "@pourover/domain/drippers";
import type { DripperId } from "@pourover/domain/types";
import { LoginPill } from "@/features/auth/LoginPill";
import { DiaryLink } from "@/features/diary/DiaryLink";
import { cx } from "@/ui/cx";
import { DripperIcon } from "@/ui/DripperIcon";
import { Footer } from "@/ui/Footer";

type Props = {
  readonly selectedDripper: DripperId;
  readonly onPickDripper: (id: DripperId) => void;
  readonly onOpenDiary: () => void;
};

export function WallScreen({ selectedDripper, onPickDripper, onOpenDiary }: Props) {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface-strong text-text-primary">
      <div className="flex items-center justify-end gap-2 px-5 pt-4">
        <DiaryLink onOpen={onOpenDiary} />
        <LoginPill />
      </div>
      {/* 타이틀 zone */}
      <header className="text-center w-full px-5 pt-16">
        <h1 className="text-heading-sm font-medium leading-none tracking-tight">
          핸드드립 계산기
        </h1>
        <p className="text-body-md text-text-secondary mt-2">저만 믿고 따라오세요</p>
      </header>

      {/* shelf */}
      <section
        aria-label="드리퍼 선반"
        className="flex flex-col flex-1 justify-end pb-12"
      >
        <div className="flex items-end justify-center gap-x-6">
          {dripperList.map((d) => {
            const isSelected = d.id === selectedDripper;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onPickDripper(d.id)}
                aria-pressed={isSelected}
                aria-label={d.name}
                style={{ viewTransitionName: `dripper-${d.id}` }}
                className="transition-colors hover:bg-surface-strong/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span
                  className={cx(
                    "text-body-sm -mb-2 block",
                    isSelected
                      ? "font-medium text-text-primary"
                      : "text-text-secondary",
                  )}
                >
                  {d.name}
                </span>
                <DripperIcon type={d.id} size={96} selected={isSelected} />
              </button>
            );
          })}
        </div>
        <div className="mx-8 h-px bg-surface-hairline" />
        <p className="mt-8 text-center text-body-sm text-text-muted">
          드리퍼를 선택하면 레시피를 고르러 가요
        </p>
      </section>

      <Footer />
    </div>
  );
}
