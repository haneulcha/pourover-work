import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DripperPopover } from "./DripperPopover";

describe("DripperPopover", () => {
  const options = [
    { id: "v60" as const, name: "V60", methodSubtitle: "Kasuya 4:6" },
    {
      id: "kalita_wave" as const,
      name: "Kalita Wave",
      methodSubtitle: "Kalita Wave",
    },
  ];

  it("renders all options with selected marker", () => {
    render(
      <DripperPopover
        options={options}
        selected="v60"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /V60/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Kalita Wave/ }),
    ).toBeInTheDocument();
    const v60Option = screen.getByRole("button", { name: /V60/ });
    expect(v60Option).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect when option tapped", () => {
    const onSelect = vi.fn();
    render(
      <DripperPopover
        options={options}
        selected="v60"
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kalita Wave/ }));
    expect(onSelect).toHaveBeenCalledWith("kalita_wave");
  });

  it("calls onClose when dim background tapped", () => {
    const onClose = vi.fn();
    render(
      <DripperPopover
        options={options}
        selected="v60"
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("팝오버 닫기"));
    expect(onClose).toHaveBeenCalled();
  });
});
