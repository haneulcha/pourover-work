import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Pour, Recipe } from "@pourover/domain/types";
import type { BrewSession } from "@pourover/domain/session";
import { c, g, ratio, s } from "@pourover/domain/units";
import { ShareCanvas } from "./ShareCanvas";

const drawMock = vi.fn();

vi.mock("./variants/registry", async () => {
  const actual = await vi.importActual<typeof import("./variants/registry")>(
    "./variants/registry",
  );
  return {
    ...actual,
    getVariant: () => ({
      id: "full" as const,
      name: "전체",
      exportSize: { width: 1080, height: 1080 },
      draw: drawMock,
    }),
  };
});

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
  pours: [mkPour(0, 0, 300, 300)],
  totalTimeSec: s(180),
  grindHint: "medium-fine",
  notes: [],
};

const session: BrewSession = {
  recipe,
  startedAt: Date.now(),
};

describe("ShareCanvas", () => {
  it("renders a canvas with the variant's export dimensions", () => {
    drawMock.mockReset();
    const { container } = render(
      <ShareCanvas
        session={session}
        photoUrl="data:image/jpeg;base64,STUB"
        layout="full"
        color="positive"
      />,
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.width).toBe(1080);
    expect(canvas?.height).toBe(1080);
    expect(canvas?.getAttribute("data-share-canvas")).toBe("full");
    expect(canvas?.getAttribute("data-color")).toBe("positive");
  });

  it("invokes the variant draw with photo + session after the image decodes", async () => {
    drawMock.mockReset();
    render(
      <ShareCanvas
        session={session}
        photoUrl="data:image/jpeg;base64,STUB"
        layout="full"
        color="positive"
      />,
    );
    await waitFor(() => expect(drawMock).toHaveBeenCalled());
    const lastCall = drawMock.mock.calls.at(-1)!;
    const props = lastCall[1] as {
      session: BrewSession;
      photo: HTMLImageElement;
      color: string;
      width: number;
      height: number;
    };
    expect(props.session).toBe(session);
    expect(props.color).toBe("positive");
    expect(props.width).toBe(1080);
    expect(props.height).toBe(1080);
    expect(props.photo).toBeDefined();
  });

  it("re-runs draw when the photo URL changes", async () => {
    drawMock.mockReset();
    const { rerender } = render(
      <ShareCanvas
        session={session}
        photoUrl="data:image/jpeg;base64,A"
        layout="full"
        color="positive"
      />,
    );
    await waitFor(() => expect(drawMock).toHaveBeenCalledTimes(1));
    act(() => {
      rerender(
        <ShareCanvas
          session={session}
          photoUrl="data:image/jpeg;base64,B"
          layout="full"
          color="positive"
        />,
      );
    });
    await waitFor(() => expect(drawMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("forwards the canvas ref to the parent", async () => {
    drawMock.mockReset();
    let captured: HTMLCanvasElement | null = null;
    render(
      <ShareCanvas
        ref={(c) => {
          captured = c;
        }}
        session={session}
        photoUrl="data:image/jpeg;base64,STUB"
        layout="full"
        color="positive"
      />,
    );
    expect(captured).not.toBeNull();
    expect((captured as unknown as HTMLCanvasElement).tagName).toBe("CANVAS");
  });
});
