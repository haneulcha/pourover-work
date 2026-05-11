import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Recipe, Pour } from "@pourover/domain/types";
import type { BrewSession } from "@pourover/domain/session";
import { c, g, ratio, s } from "@pourover/domain/units";
import { Full, fullVariant } from "./full";

const mkPour = (i: number, atSec: number, amt: number, cum: number): Pour => ({
  index: i,
  atSec: s(atSec),
  pourAmount: g(amt),
  cumulativeWater: g(cum),
});

const recipe: Recipe = {
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  totalWater: g(300),
  ratio: ratio(15),
  temperature: c(93),
  pours: [mkPour(0, 0, 60, 60), mkPour(1, 45, 240, 300)],
  totalTimeSec: s(208),
  grindHint: "medium-fine",
  notes: [],
};

const baseSession: BrewSession = {
  recipe,
  startedAt: new Date(2026, 3, 25, 9, 12).getTime(),
  completedAt: new Date(2026, 3, 25, 9, 12).getTime() + 222_000, // 3:42
};

describe("Full variant", () => {
  it("renders method name, date, total time, recipe row and labels", () => {
    render(
      <Full
        session={baseSession}
        photoUrl="blob:fake"
        color="positive"
      />,
    );
    expect(screen.getByText("Kasuya 4:6")).toBeInTheDocument();
    expect(screen.getByText("3:42")).toBeInTheDocument();
    expect(screen.getByText("시간")).toBeInTheDocument();
    expect(screen.getByText("2026.04.25")).toBeInTheDocument();
    expect(screen.getByText("날짜")).toBeInTheDocument();
    expect(screen.getByText("V60")).toBeInTheDocument();
    expect(screen.getByText("드리퍼")).toBeInTheDocument();
    expect(screen.getByText("20g · 300g · 93°")).toBeInTheDocument();
    expect(screen.getByText("원두 · 물 · 온도")).toBeInTheDocument();
    expect(screen.getByText("pourover.work")).toBeInTheDocument();
  });

  it("does not render the grind hint", () => {
    render(
      <Full
        session={baseSession}
        photoUrl="blob:fake"
        color="positive"
      />,
    );
    expect(screen.queryByText(/고운 소금/)).not.toBeInTheDocument();
  });

  it("renders feeling row with label when feeling is set", () => {
    render(
      <Full
        session={{ ...baseSession, feeling: "calm" }}
        photoUrl="blob:fake"
        color="positive"
      />,
    );
    expect(screen.getByText("만족스러워요")).toBeInTheDocument();
    expect(screen.getByText("오늘의 기분")).toBeInTheDocument();
  });

  it("omits feeling row when feeling is unset", () => {
    render(
      <Full
        session={baseSession}
        photoUrl="blob:fake"
        color="positive"
      />,
    );
    expect(screen.queryByText("만족스러워요")).not.toBeInTheDocument();
    expect(screen.queryByText("글쎄요")).not.toBeInTheDocument();
    expect(screen.queryByText("아쉬워요")).not.toBeInTheDocument();
    expect(screen.queryByText("오늘의 기분")).not.toBeInTheDocument();
  });

  it("renders photoUrl as <img> backdrop (so html-to-image can inline it)", () => {
    const { container } = render(
      <Full
        session={baseSession}
        photoUrl="blob:my-photo"
        color="positive"
      />,
    );
    const img = container.querySelector(
      '[data-share-variant="full"] img',
    ) as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("blob:my-photo");
  });

  it("exports as a square image (1080x1080)", () => {
    expect(fullVariant.exportSize).toEqual({ width: 1080, height: 1080 });
  });

  it("applies color class for negative", () => {
    const { container } = render(
      <Full
        session={baseSession}
        photoUrl="blob:fake"
        color="negative"
      />,
    );
    const root = container.querySelector('[data-share-variant="full"]');
    expect(root?.getAttribute("data-color")).toBe("negative");
  });
});
