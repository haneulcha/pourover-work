import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoPicker } from "./PhotoPicker";

const mkFile = (): File =>
  new File([new Uint8Array([1])], "shot.jpg", { type: "image/jpeg" });

describe("PhotoPicker", () => {
  it("renders both buttons", () => {
    render(<PhotoPicker onPick={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "사진 찍기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "갤러리에서 선택" }),
    ).toBeInTheDocument();
  });

  it("camera input has capture='environment'", () => {
    const { container } = render(<PhotoPicker onPick={vi.fn()} />);
    const cameraInput = container.querySelector(
      'input[data-source="camera"]',
    ) as HTMLInputElement | null;
    expect(cameraInput).not.toBeNull();
    expect(cameraInput?.getAttribute("capture")).toBe("environment");
    expect(cameraInput?.accept).toContain("image/");
  });

  it("gallery input does not have capture attr", () => {
    const { container } = render(<PhotoPicker onPick={vi.fn()} />);
    const galleryInput = container.querySelector(
      'input[data-source="gallery"]',
    ) as HTMLInputElement | null;
    expect(galleryInput).not.toBeNull();
    expect(galleryInput?.hasAttribute("capture")).toBe(false);
  });

  it("calls onPick with file when camera input changes", () => {
    const onPick = vi.fn();
    const { container } = render(<PhotoPicker onPick={onPick} />);
    const input = container.querySelector(
      'input[data-source="camera"]',
    ) as HTMLInputElement;
    const file = mkFile();
    fireEvent.change(input, { target: { files: [file] } });
    expect(onPick).toHaveBeenCalledWith(file);
  });

  it("calls onPick with file when gallery input changes", () => {
    const onPick = vi.fn();
    const { container } = render(<PhotoPicker onPick={onPick} />);
    const input = container.querySelector(
      'input[data-source="gallery"]',
    ) as HTMLInputElement;
    const file = mkFile();
    fireEvent.change(input, { target: { files: [file] } });
    expect(onPick).toHaveBeenCalledWith(file);
  });

  it("does not call onPick when files is empty", () => {
    const onPick = vi.fn();
    const { container } = render(<PhotoPicker onPick={onPick} />);
    const input = container.querySelector(
      'input[data-source="gallery"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(onPick).not.toHaveBeenCalled();
  });
});
