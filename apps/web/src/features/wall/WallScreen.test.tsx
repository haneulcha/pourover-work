import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WallScreen } from "./WallScreen";

describe("WallScreen", () => {
  it("renders title and subtitle", () => {
    render(<WallScreen selectedDripper="v60" onPickDripper={vi.fn()} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "핸드드립 계산기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("저만 믿고 따라오세요")).toBeInTheDocument();
  });

  it("renders both dripper options with names", () => {
    render(<WallScreen selectedDripper="v60" onPickDripper={vi.fn()} />);
    expect(screen.getByRole("button", { name: /V60/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Kalita Wave/ }),
    ).toBeInTheDocument();
  });

  it("calls onPickDripper with tapped dripper id", () => {
    const onPickDripper = vi.fn();
    render(<WallScreen selectedDripper="v60" onPickDripper={onPickDripper} />);
    fireEvent.click(screen.getByRole("button", { name: /Kalita Wave/ }));
    expect(onPickDripper).toHaveBeenCalledWith("kalita_wave");
  });

  it("marks the selected dripper with aria-pressed", () => {
    render(
      <WallScreen selectedDripper="kalita_wave" onPickDripper={vi.fn()} />,
    );
    const v60 = screen.getByRole("button", { name: /V60/ });
    const kalita = screen.getByRole("button", { name: /Kalita Wave/ });
    expect(v60).toHaveAttribute("aria-pressed", "false");
    expect(kalita).toHaveAttribute("aria-pressed", "true");
  });
});
