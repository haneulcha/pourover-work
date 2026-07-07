import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cuePlayerModule from "./cuePlayer";
import type { Pour, Recipe } from "@pourover/domain/types";
import { c, g, ratio, s } from "@pourover/domain/units";
import type { BrewSession } from "@pourover/domain/session";
import { BrewingScreen } from "./BrewingScreen";

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
  method: "hoffmann_v60",
  dripper: "v60",
  coffee: g(15),
  totalWater: g(250),
  ratio: ratio(16.67),
  temperature: c(93),
  pours: [
    mkPour(0, 0, 30, 30, true),
    mkPour(1, 45, 120, 150),
    mkPour(2, 75, 100, 250),
  ],
  totalTimeSec: s(210),
  grindHint: "medium-fine",
  notes: [],
};

const BASE = 1_000_000_000_000;
const makeSession = (startedAt: number): BrewSession => ({ recipe, startedAt });

const renderScreen = (
  startedAt = BASE,
  handlers: { onExit?: () => void; onComplete?: () => void } = {},
) =>
  render(
    <BrewingScreen
      session={makeSession(startedAt)}
      onExit={handlers.onExit ?? vi.fn()}
      onComplete={handlers.onComplete ?? vi.fn()}
    />,
  );

const advanceTo = (elapsedMs: number) => {
  act(() => {
    vi.setSystemTime(new Date(BASE + elapsedMs));
    vi.advanceTimersByTime(500); // useElapsed 250ms 틱 최소 1회
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(BASE));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("BrewingScreen — 스텝 표시", () => {
  it("시작: 목표 누적량 + 라벨 + 상시 카운트다운, 배경은 base", () => {
    renderScreen();
    expect(screen.getByTestId("big-number")).toHaveTextContent("30");
    expect(screen.getByText(/bloom/)).toBeInTheDocument();
    // 다음 푸어 atSec=45, elapsed=0
    expect(screen.getByTestId("countdown")).toHaveTextContent(
      "다음 붓기까지 0:45",
    );
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("false");
  });

  it("탭 제스처 없음 — 전체 화면 탭 영역이 존재하지 않는다", () => {
    renderScreen();
    expect(screen.queryByTestId("tap-area")).toBeNull();
  });

  it("경계를 넘으면 시계가 다음 스텝으로 전진한다", () => {
    renderScreen();
    advanceTo(46_000);
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
    // 다음 푸어 atSec=75, elapsed=46
    expect(screen.getByTestId("countdown")).toHaveTextContent(
      "다음 붓기까지 0:29",
    );
  });

  it("마지막 스텝: '마지막' 표기 + 완료까지 카운트다운", () => {
    renderScreen(BASE - 80_000); // elapsed=80 → 마지막 푸어(idx 2)
    expect(screen.getByTestId("big-number")).toHaveTextContent("250");
    expect(screen.getByText(/마지막/)).toBeInTheDocument();
    // 210-80=130
    expect(screen.getByTestId("countdown")).toHaveTextContent("완료까지 2:10");
  });

  it("구석 정보: 경과/총시간과 스텝 카운트", () => {
    renderScreen();
    expect(screen.getByText(/0:00 \/ 3:30/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
  });
});

describe("BrewingScreen — 리드인", () => {
  it("다음 푸어 5초 전부터 배경이 액센트로 물든다", () => {
    renderScreen();
    advanceTo(41_000); // 45초 푸어 4초 전
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("true");
    expect(screen.getByTestId("countdown")).toHaveTextContent(
      "다음 붓기까지 0:04",
    );
  });

  it("경계를 지나면 base로 복귀한다", () => {
    renderScreen();
    advanceTo(46_000);
    expect(screen.getByTestId("brewing-screen").dataset.accent).toBe("false");
  });
});

describe("BrewingScreen — 진행 레일", () => {
  it("레일이 레시피 경계로 렌더된다 (상세 동작은 BrewRail.test)", () => {
    renderScreen(BASE - 60_000); // elapsed=60
    expect(screen.getByTestId("brew-rail")).toBeInTheDocument();
    expect(screen.getAllByTestId("brew-rail-drop")).toHaveLength(2); // 45s, 75s
  });
});

describe("BrewingScreen — 중단", () => {
  it("길게 누르기(600ms)로 중단 다이얼로그가 열린다", () => {
    renderScreen();
    fireEvent.pointerDown(screen.getByTestId("brewing-screen"));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
  });

  it("600ms 전에 떼면 다이얼로그가 열리지 않는다", () => {
    renderScreen();
    fireEvent.pointerDown(screen.getByTestId("brewing-screen"));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(screen.getByTestId("brewing-screen"));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByText("브루잉을 중단할까요?")).toBeNull();
  });

  it("하단 힌트 버튼으로도 다이얼로그가 열린다 (키보드 경로)", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
  });

  it("처음으로 확인 시 onExit", () => {
    const onExit = vi.fn();
    renderScreen(BASE, { onExit });
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("다이얼로그가 떠 있어도 시계는 흐른다 (일시정지 없음)", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "길게 눌러 중단" }));
    advanceTo(46_000);
    fireEvent.click(screen.getByRole("button", { name: "계속하기" }));
    expect(screen.getByTestId("big-number")).toHaveTextContent("150");
  });
});

describe("BrewingScreen — 완료 / 부가", () => {
  it("elapsed >= totalTimeSec이면 onComplete 1회", () => {
    const onComplete = vi.fn();
    renderScreen(BASE - 300_000, { onComplete });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("진행 중에는 onComplete가 불리지 않는다", () => {
    const onComplete = vi.fn();
    renderScreen(BASE, { onComplete });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("음소거 토글 aria-pressed", () => {
    renderScreen();
    const toggle = screen.getByRole("button", { name: /큐 소리/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("aria-live가 경계 통과 시 새 스텝을 안내한다", () => {
    renderScreen();
    advanceTo(46_000);
    expect(screen.getByRole("status")).toHaveTextContent("1차: 150그램까지");
  });
});

describe("BrewingScreen — 큐 발화 배선 (불변 확인)", () => {
  it("푸어 경계를 넘으면 player.play 호출 (lead-in + pour)", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    renderScreen();
    advanceTo(46_000);
    const kinds = play.mock.calls.map((call) => call[0]);
    expect(kinds).toContain("lead-in");
    expect(kinds).toContain("pour");
  });

  it("totalTimeSec 도달 시 complete 큐 발화", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    renderScreen();
    advanceTo(210_000);
    const kinds = play.mock.calls.map((call) => call[0]);
    expect(kinds).toContain("complete");
  });
});
