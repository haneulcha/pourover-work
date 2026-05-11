import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders copyright with current year and name", () => {
    const year = new Date().getFullYear();
    render(<Footer />);
    expect(
      screen.getByText(`© ${year} haneulcha`),
    ).toBeInTheDocument();
  });

  it("renders GitHub link pointing to haneulcha profile", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link).toHaveAttribute("href", "https://github.com/haneulcha");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
