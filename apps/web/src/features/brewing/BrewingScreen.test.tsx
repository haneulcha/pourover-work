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

// Session with startedAt anchored at mocked Date.now; we override Date.now inside tests.
const makeSession = (startedAt: number): BrewSession => ({ recipe, startedAt });

describe("BrewingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows hero weight of active step (bloom at elapsed=0)", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    // bloom pour cumulativeWater = 30
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("30");
    // label for active step in progress rail
    expect(screen.getByText("bloom")).toBeInTheDocument();
  });

  it("opens stop dialog when 중단 tapped", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "중단" }));
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
  });

  it("calls onExit when 처음으로 confirmed in dialog", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    const onExit = vi.fn();
    render(
      <BrewingScreen session={session} onExit={onExit} onComplete={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "중단" }));
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("fires onComplete once when elapsed >= totalTimeSec", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000 - 300_000); // 300s ago, > totalTime 210
    const onComplete = vi.fn();
    render(
      <BrewingScreen
        session={session}
        onExit={vi.fn()}
        onComplete={onComplete}
      />,
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not fire onComplete while running", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    const onComplete = vi.fn();
    render(
      <BrewingScreen
        session={session}
        onExit={vi.fn()}
        onComplete={onComplete}
      />,
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("advances active step when elapsed crosses next pour boundary", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );

    // At elapsed=0: bloom step, cumulativeWater=30
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("30");

    // Advance past the 45s boundary (2nd pour atSec)
    act(() => {
      vi.setSystemTime(new Date(1_000_000_046_000));
      vi.advanceTimersByTime(500); // trigger useElapsed's 250ms interval to fire at least once
    });

    // 2nd pour is now active: cumulativeWater=150
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("150");

    // aria-live region announces the new step
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("1차: 150그램까지");
  });

  it("tapping 건너뛰기 advances hero weight to next pour", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );

    // At elapsed=0, bloom pour (cumulativeWater=30)
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("30");

    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );

    // Advanced to pour 1 (cumulativeWater=150)
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("150");
    // aria-live announces new step
    expect(screen.getByRole("status")).toHaveTextContent("1차: 150그램까지");
  });

  it("keeps skipped step ahead of the clock", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );

    // Skip from bloom (idx 0) → pour 1 at elapsed=0
    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("150");

    // Advance clock to 10s — still before pour 1's atSec=45, clockIdx=0.
    // manualFloor=1 → activeIdx stays 1.
    act(() => {
      vi.setSystemTime(new Date(1_000_000_010_000));
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("150");
  });

  it("fires onComplete when skip tapped on last step", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    // startedAt 80s ago → elapsed=80, past pour 2's atSec=75 (last pour idx=2)
    const session = makeSession(1_000_000_000_000 - 80_000);
    const onComplete = vi.fn();
    render(
      <BrewingScreen
        session={session}
        onExit={vi.fn()}
        onComplete={onComplete}
      />,
    );

    // Hero on last pour (cumulativeWater=250)
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("250");
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("advances exactly one step per consecutive skip tap", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    const onComplete = vi.fn();
    render(
      <BrewingScreen
        session={session}
        onExit={vi.fn()}
        onComplete={onComplete}
      />,
    );

    expect(screen.getByTestId("hero-weight")).toHaveTextContent("30");

    // Skip 1 → pour 1 (150)
    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("150");

    // Skip 2 → pour 2 (250)
    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );
    expect(screen.getByTestId("hero-weight")).toHaveTextContent("250");

    // Skip 3 → complete (button still visible on last step, triggers onComplete)
    fireEvent.click(
      screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" }),
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("liquid height grows proportionally to elapsed time (pour phase)", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    // elapsed=60 of 210 → 28.57% fill, still in pour phase (last pour at 75)
    const session = makeSession(1_000_000_000_000 - 60_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const liquid = screen.getByTestId("liquid");
    // 60/210 = 0.285714…, formatted "28.57%"
    expect(liquid.style.height).toBe("28.57%");
  });

  it("hero floats above meniscus during pour phase", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000 - 60_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const hero = screen.getByTestId("hero");
    // bottom is calc(28.57% + var(--brewing-hero-gap))
    expect(hero.style.bottom).toContain("28.57");
  });

  it("hero anchors below last pour ring during drawdown", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    // elapsed=120 of 210 → past last pour at 75s → drawdown active
    const session = makeSession(1_000_000_000_000 - 120_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const hero = screen.getByTestId("hero");
    // lastRingRatio = 75/210 = 0.3571…, formatted "35.71%"
    expect(hero.style.bottom).toContain("35.71");
    // drawdown label is shown (replaces "지금 · X차")
    expect(screen.getByText("드로우다운")).toBeInTheDocument();
  });

  it("ring at next pour boundary has 'next' variant", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000); // elapsed=0; next boundary is pour 1 at 45s
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const nextRing = screen.getByTestId("ring-next");
    expect(nextRing.dataset.atSec).toBe("45");
  });

  it("skip button is rendered inside the rim region", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const skip = screen.getByRole("button", { name: "다음 스텝으로 건너뛰기" });
    expect(skip.closest('[data-region="rim"]')).not.toBeNull();
  });
});

describe("BrewingScreen — 큐 음소거 토글", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("RIM 에 음소거 토글이 있고 클릭하면 aria-pressed 가 바뀐다", () => {
    vi.setSystemTime(new Date(1_000_000_000_000));
    const session = makeSession(1_000_000_000_000);
    render(
      <BrewingScreen session={session} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    const toggle = screen.getByRole("button", { name: /큐 소리/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("BrewingScreen — lead-in 카운트다운", () => {
  const BASE = 1_000_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lead-in 창 밖(시작 직후)에는 카운트다운이 없다", () => {
    vi.setSystemTime(new Date(BASE));
    render(
      <BrewingScreen session={makeSession(BASE)} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    expect(screen.queryByTestId("lead-in-countdown")).toBeNull();
  });

  it("푸어 5초 전 창에 들어가면 남은 초를 표시 (45초 푸어, elapsed 41 → 4)", () => {
    vi.setSystemTime(new Date(BASE));
    render(
      <BrewingScreen session={makeSession(BASE)} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    act(() => {
      vi.setSystemTime(new Date(BASE + 41_000));
      vi.advanceTimersByTime(250); // useElapsed 틱
    });
    expect(screen.getByTestId("lead-in-countdown")).toHaveTextContent("4");
  });
});

describe("BrewingScreen — 큐 발화 배선", () => {
  const BASE = 1_000_000_000_000;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("시간이 푸어 경계를 넘으면 주입된 player.play 가 호출된다", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    vi.setSystemTime(new Date(BASE));
    render(
      <BrewingScreen session={makeSession(BASE)} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    act(() => {
      vi.setSystemTime(new Date(BASE + 46_000)); // lead-in@40 + pour@45 통과
      vi.advanceTimersByTime(250);
    });
    const kinds = play.mock.calls.map((c) => c[0]);
    expect(kinds).toContain("lead-in");
    expect(kinds).toContain("pour");
  });

  it("시간이 totalTimeSec 에 도달하면 complete 큐가 발화한다", () => {
    const play = vi.fn();
    vi.spyOn(cuePlayerModule, "createCuePlayer").mockReturnValue({
      unlock: vi.fn(),
      play,
    });
    vi.setSystemTime(new Date(BASE));
    render(
      <BrewingScreen session={makeSession(BASE)} onExit={vi.fn()} onComplete={vi.fn()} />,
    );
    act(() => {
      vi.setSystemTime(new Date(BASE + 210_000)); // totalTimeSec = 210
      vi.advanceTimersByTime(250);
    });
    const kinds = play.mock.calls.map((c) => c[0]);
    expect(kinds).toContain("complete");
  });
});
