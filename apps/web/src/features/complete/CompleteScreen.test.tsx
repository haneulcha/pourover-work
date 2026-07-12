import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pour, Recipe } from "@pourover/domain/types";
import type { BrewSession } from "@pourover/domain/session";
import { c, g, ratio, s } from "@pourover/domain/units";
import { brewMethods } from "@pourover/domain/methods";
import { CompleteScreen } from "./CompleteScreen";

const mkPour = (
  i: number,
  atSec: number,
  amt: number,
  cum: number,
  bloom = false,
): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
  ...(bloom ? { label: "bloom" as const } : {}),
});

const recipe: Recipe = {
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  totalWater: g(300),
  ratio: ratio(15),
  temperature: c(88),
  pours: [
    mkPour(0, 0, 60, 60),
    mkPour(1, 45, 60, 120),
    mkPour(2, 90, 90, 210),
    mkPour(3, 135, 90, 300),
  ],
  totalTimeSec: s(208), // 3:28
  grindHint: "coarse",
  notes: [],
};

// Actual duration 180s (3:00); recipe.totalTimeSec is 208 (3:28) to prove the
// hero uses the real elapsed time rather than the planned time.
const baseSession: BrewSession = {
  recipe,
  startedAt: new Date(2026, 2, 14, 7, 42).getTime(),
  completedAt: new Date(2026, 2, 14, 7, 42).getTime() + 180_000,
};

// ─── logging tests ────────────────────────────────────────────────────────────

const loggingRecipe = brewMethods.kasuya_4_6.compute({
  method: "kasuya_4_6", dripper: "v60", coffee: g(20), roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
});
const loggingSession: BrewSession = { recipe: loggingRecipe, startedAt: 1_000, completedAt: 201_000 };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createLog = vi.fn(async (..._a: unknown[]) => {});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const patchLog = vi.fn(async (..._a: unknown[]) => {});
vi.mock("@/features/diary/api", () => ({
  createLog: (...a: unknown[]) => createLog(...a),
  patchLog: (...a: unknown[]) => patchLog(...a),
}));

const useSession = vi.fn();
vi.mock("@/features/auth/useSession", () => ({ useSession: () => useSession() }));

beforeEach(() => {
  createLog.mockClear();
  patchLog.mockClear();
  // default: logged-out so existing tests don't trigger createLog
  useSession.mockReturnValue({ status: "loaded", session: null });
});
afterEach(() => { vi.restoreAllMocks(); });

const noop = () => {};

describe("CompleteScreen logging", () => {
  it("logged-in: auto-creates the log exactly once (StrictMode-safe)", async () => {
    useSession.mockReturnValue({ status: "loaded", session: { user: { id: "u1" } } });
    render(
      <StrictMode>
        <CompleteScreen session={loggingSession} logId="log_test" onFeelingChange={noop} onExit={noop} />
      </StrictMode>,
    );
    await waitFor(() => expect(createLog).toHaveBeenCalledTimes(1));
    expect(createLog.mock.calls[0]![0]).toMatchObject({ id: "log_test" });
  });

  it("logged-out: shows the whisper, no memo field, no createLog", async () => {
    useSession.mockReturnValue({ status: "loaded", session: null });
    render(
      <CompleteScreen session={loggingSession} logId="log_test" onFeelingChange={noop} onExit={noop} />,
    );
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(screen.getByText(/하면 이 기록이 일기에 남아요/)).toBeInTheDocument();
    expect(screen.queryByLabelText("메모")).not.toBeInTheDocument();
    expect(createLog).not.toHaveBeenCalled();
  });
});

// ─── existing tests ───────────────────────────────────────────────────────────

describe("CompleteScreen", () => {
  it("renders formatted date in quiet header", () => {
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText("2026 · 03 · 14 · 오전 7:42")).toBeInTheDocument();
  });

  it("renders hero with actual brew duration (not recipe.totalTimeSec)", () => {
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText("오늘의 커피")).toBeInTheDocument();
    // Actual 180s, not planned 208s.
    expect(screen.getByText("3:00")).toBeInTheDocument();
    expect(screen.queryByText("3:28")).not.toBeInTheDocument();
  });

  it("renders recipe summary fields", () => {
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText("드리퍼")).toBeInTheDocument();
    expect(screen.getByText("V60")).toBeInTheDocument();
    expect(screen.getByText("레시피")).toBeInTheDocument();
    expect(screen.getByText("Kasuya 4:6")).toBeInTheDocument();
    expect(screen.getByText("원두 · 물")).toBeInTheDocument();
    expect(screen.getByText("20 · 300 g")).toBeInTheDocument();
    expect(screen.getByText("온도 · 분쇄")).toBeInTheDocument();
    expect(screen.getByText(/88° · 굵은 후추 정도/)).toBeInTheDocument();
  });

  it("renders 3 feeling buttons", () => {
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "만족스러워요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "글쎄요" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "아쉬워요" }),
    ).toBeInTheDocument();
  });

  it("calls onFeelingChange with feeling when tapped", () => {
    const onFeelingChange = vi.fn();
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={onFeelingChange}
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "만족스러워요" }));
    expect(onFeelingChange).toHaveBeenCalledWith("calm");
  });

  it("calls onFeelingChange with null when same feeling re-tapped", () => {
    const onFeelingChange = vi.fn();
    const sessionWithFeeling: BrewSession = { ...baseSession, feeling: "calm" };
    render(
      <CompleteScreen
        session={sessionWithFeeling}
        logId="log_base"
        onFeelingChange={onFeelingChange}
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "만족스러워요" }));
    expect(onFeelingChange).toHaveBeenCalledWith(null);
  });

  it("marks selected feeling with aria-pressed", () => {
    const sessionWithFeeling: BrewSession = {
      ...baseSession,
      feeling: "neutral",
    };
    render(
      <CompleteScreen
        session={sessionWithFeeling}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "글쎄요" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "만족스러워요" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onExit when 처음으로 tapped", () => {
    const onExit = vi.fn();
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={onExit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("opens share dialog when 공유 tapped", () => {
    render(
      <CompleteScreen
        session={baseSession}
        logId="log_base"
        onFeelingChange={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    const shareBtn = screen.getByRole("button", { name: "공유" });
    expect(shareBtn).not.toBeDisabled();
    fireEvent.click(shareBtn);
    expect(
      screen.getByRole("dialog", { name: "공유 이미지 만들기" }),
    ).toBeInTheDocument();
  });
});
