import { useState } from "react";
import { dripperList } from "@pourover/domain/drippers";
import { brewMethods, getMethodName, methodsForDripper } from "@pourover/domain/methods";
import type {
  BrewMethodId,
  DripperId,
  Grams,
  Recipe,
  RoastLevel,
  StrengthProfile,
  SweetnessProfile,
  TasteProfile,
} from "@pourover/domain/types";
import { Button } from "@/ui/Button";
import { Segmented } from "@/ui/Segmented";
import { Slider } from "@/ui/Slider";
import { DripperIcon } from "@/ui/DripperIcon";
import { cx } from "@/ui/cx";
import { formatGrindHint, formatTime } from "@/ui/format";
import { DripperPopover } from "./DripperPopover";
import { PourVerticalPreview } from "./PourVerticalPreview";

const MIN_COFFEE_G = 5;
const MAX_COFFEE_G = 50;

type Props = {
  readonly coffee: Grams;
  readonly dripper: DripperId;
  readonly method: BrewMethodId;
  readonly roast: RoastLevel;
  readonly taste: TasteProfile;
  readonly recipe: Recipe;
  readonly onCoffeeChange: (coffee: number) => void;
  readonly onDripperChange: (dripper: DripperId) => void;
  readonly onMethodChange: (method: BrewMethodId) => void;
  readonly onRoastChange: (roast: RoastLevel) => void;
  readonly onTasteChange: (taste: TasteProfile) => void;
  readonly onStart: () => void;
  readonly onBack: () => void;
  readonly onCustomize: () => void;
};

export function RecipeScreen({
  coffee,
  dripper,
  method,
  roast,
  taste,
  recipe,
  onCoffeeChange,
  onDripperChange,
  onMethodChange,
  onRoastChange,
  onTasteChange,
  onStart,
  onBack,
  onCustomize,
}: Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isCustom = method === "custom";
  const compatMethods = methodsForDripper(dripper);
  const methodMeta = method === "custom" ? null : brewMethods[method];
  const methodLabel = methodMeta?.name ?? getMethodName(method);

  const ratioDisplay = `1:${Math.round(recipe.ratio)}`;
  const recommendedLine = `${recipe.temperature}° · ${ratioDisplay} 비율 · 총 ${formatTime(recipe.totalTimeSec)} 소요 · ${formatGrindHint(recipe.grindHint)}`;
  const dripperName = dripperList.find((d) => d.id === dripper)?.name ?? "";

  const popoverOptions = dripperList.map((d) => {
    const firstMethod = methodsForDripper(d.id)[0];
    return {
      id: d.id,
      name: d.name,
      methodSubtitle: firstMethod?.name ?? "",
    };
  });

  return (
    <div className="relative mx-auto flex min-h-svh max-w-lg flex-col bg-surface text-text-primary">
      {/* top bar */}
      <header className="flex items-center gap-3 px-5 pt-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="드리퍼 선택으로 돌아가기"
          className="-ml-2 p-2 text-text-muted transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4 L6 10 L12 16"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPopoverOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={popoverOpen}
            aria-label={`드리퍼 바꾸기, 현재 ${dripperName}`}
            className="-ml-1 flex items-center gap-3 rounded-button p-1 transition-colors hover:bg-surface-strong/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span style={{ viewTransitionName: `dripper-${dripper}` }}>
              <DripperIcon type={dripper} size={56} selected />
            </span>
            <div className="text-left">
              <div className="flex items-center gap-1 text-body-lg font-medium">
                <span>{dripperName}</span>
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className={cx(
                    "text-text-muted transition-transform",
                    popoverOpen && "rotate-180",
                  )}
                >
                  <path
                    d="M3.5 5.5 L7 9 L10.5 5.5"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-caption-sm text-text-muted">{methodLabel}</div>
            </div>
          </button>

          {popoverOpen && (
            <DripperPopover
              options={popoverOptions}
              selected={dripper}
              onSelect={(id) => {
                onDripperChange(id);
                setPopoverOpen(false);
              }}
              onClose={() => setPopoverOpen(false)}
            />
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="h-px bg-border" />

        {/* controls */}
        <Row label="커피 양">
          <Slider
            label="커피 양"
            value={coffee}
            onChange={onCoffeeChange}
            min={MIN_COFFEE_G}
            max={MAX_COFFEE_G}
            suffix="g"
          />
        </Row>

        <Row label="맛">
          <Segmented<SweetnessProfile>
            name="sweetness"
            label="맛"
            value={taste.sweetness}
            onChange={(v) => onTasteChange({ ...taste, sweetness: v })}
            options={[
              { value: "sweet", label: "달달함" },
              { value: "balanced", label: "균형감" },
              { value: "bright", label: "산뜻함" },
            ]}
          />
        </Row>

        <Row label="강도">
          <Segmented<StrengthProfile>
            name="strength"
            label="강도"
            value={taste.strength}
            onChange={(v) => onTasteChange({ ...taste, strength: v })}
            options={[
              { value: "light", label: "연하게" },
              { value: "medium", label: "보통" },
              { value: "strong", label: "진하게" },
            ]}
          />
        </Row>

        <div>
          <Row label="방식">
            {isCustom ? (
              <span className="text-body-sm text-text-primary">Custom</span>
            ) : (
              <Segmented<BrewMethodId>
                name="method"
                label="방식"
                value={method}
                onChange={onMethodChange}
                options={compatMethods.map((m) => ({
                  value: m.id,
                  label: m.shortName ?? m.name,
                }))}
              />
            )}
          </Row>
          {methodMeta && (
            <p className="pl-16 mt-1 text-caption-sm text-text-muted">
              {methodMeta.description}
            </p>
          )}
        </div>

        <Row label="로스팅">
          <Segmented<RoastLevel>
            name="roast"
            label="로스팅"
            value={roast}
            onChange={onRoastChange}
            options={[
              { value: "light", label: "라이트" },
              { value: "medium", label: "미디엄" },
              { value: "dark", label: "다크" },
            ]}
          />
        </Row>

        {/* recommended row */}
        <div className="text-center my-1">
          <span className="flex-1 text-body-sm text-text-muted">
            {recommendedLine}
          </span>
        </div>

        <div className="h-px bg-border my-2" />

        {/* pour schedule */}
        <section className="min-h-0" aria-label="푸어 스케줄">
          <div className="flex items-center justify-between">
            <span className="text-caption-sm font-semibold uppercase tracking-wider text-text-muted">
              미리보기
            </span>
            <span className="text-caption-sm text-text-muted tabular-nums">
              {[
                `${recipe.totalWater}g · ${formatTime(recipe.totalTimeSec)} · ${recipe.pours.length}번에 나누어 붓기`,
              ].join(" · ")}
            </span>
          </div>

          <div className="mt-3">
            <PourVerticalPreview
              pours={recipe.pours}
              totalTimeSec={recipe.totalTimeSec}
            />
          </div>
        </section>
      </main>

      {/* start button */}
      <div className="px-5 pb-6 mt-4 space-y-2">
        <Button onClick={onStart} className="w-full">
          시작
        </Button>
        <Button variant="secondary" size="sm" onClick={onCustomize} className="w-full">
          {isCustom ? "Edit custom recipe" : "Customize this recipe"}
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr] items-center gap-3">
      <span className="text-caption-sm text-text-secondary">{label}</span>
      <div>{children}</div>
    </div>
  );
}
