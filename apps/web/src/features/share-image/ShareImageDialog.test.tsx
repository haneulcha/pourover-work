import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pour, Recipe } from "@pourover/domain/types";
import type { BrewSession } from "@pourover/domain/session";
import { c, g, ratio, s } from "@pourover/domain/units";
import { ShareImageDialog } from "./ShareImageDialog";

vi.mock("./render/domToBlob", () => ({
  domToBlob: vi
    .fn()
    .mockResolvedValue(new Blob([new Uint8Array([1])], { type: "image/png" })),
}));

vi.mock("./output/shareOrDownload", () => ({
  canNativeShareImage: vi.fn().mockReturnValue(false),
  shareOrDownload: vi.fn().mockResolvedValue("downloaded"),
}));

const recipe: Recipe = {
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  totalWater: g(300),
  ratio: ratio(15),
  temperature: c(93),
  pours: [
    {
      index: 0,
      atSec: s(0),
      pourAmount: g(60),
      cumulativeWater: g(60),
    } as Pour,
  ],
  totalTimeSec: s(180),
  grindHint: "medium-fine",
  notes: [],
};

const session: BrewSession = {
  recipe,
  startedAt: new Date(2026, 3, 25, 9, 0).getTime(),
  completedAt: new Date(2026, 3, 25, 9, 0).getTime() + 180_000,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const mkFile = (): File =>
  new File([new Uint8Array([1])], "shot.jpg", { type: "image/jpeg" });

describe("ShareImageDialog", () => {
  it("renders nothing when open=false", () => {
    render(
      <ShareImageDialog open={false} session={session} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts in 'empty' state showing PhotoPicker", () => {
    render(
      <ShareImageDialog open={true} session={session} onClose={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "사진 찍기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "갤러리에서 선택" }),
    ).toBeInTheDocument();
  });

  it("transitions to 'preview' after picking a file", async () => {
    const { container } = render(
      <ShareImageDialog open={true} session={session} onClose={vi.fn()} />,
    );
    const galleryInput = container.querySelector(
      'input[data-source="gallery"]',
    ) as HTMLInputElement;
    fireEvent.change(galleryInput, { target: { files: [mkFile()] } });
    expect(
      await screen.findByRole("button", { name: "이미지 저장" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "사진 변경" }),
    ).toBeInTheDocument();
  });

  it("calls onClose when 취소 tapped from empty state", () => {
    const onClose = vi.fn();
    render(
      <ShareImageDialog open={true} session={session} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns to 'empty' when 사진 변경 tapped", async () => {
    const { container } = render(
      <ShareImageDialog open={true} session={session} onClose={vi.fn()} />,
    );
    const galleryInput = container.querySelector(
      'input[data-source="gallery"]',
    ) as HTMLInputElement;
    fireEvent.change(galleryInput, { target: { files: [mkFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "사진 변경" }));
    expect(
      screen.getByRole("button", { name: "사진 찍기" }),
    ).toBeInTheDocument();
  });
});
