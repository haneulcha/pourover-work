import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StopConfirmDialog } from "./StopConfirmDialog";

describe("StopConfirmDialog", () => {
  it("renders heading and description", () => {
    render(<StopConfirmDialog onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("브루잉을 중단할까요?")).toBeInTheDocument();
    expect(screen.getByText("기록은 남지 않습니다.")).toBeInTheDocument();
  });

  it("calls onCancel when 계속하기 button tapped", () => {
    const onCancel = vi.fn();
    render(<StopConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "계속하기" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when 처음으로 button tapped", () => {
    const onConfirm = vi.fn();
    render(<StopConfirmDialog onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "처음으로" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when scrim background tapped", () => {
    const onCancel = vi.fn();
    render(<StopConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("다이얼로그 닫기"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
