import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("기본값: primary variant, md size, type=button", () => {
    render(<Button>시작</Button>);
    const btn = screen.getByRole("button", { name: "시작" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn.className).toContain("bg-btn-primary-bg");
  });

  it("variant별 클래스 적용", () => {
    render(
      <>
        <Button variant="secondary">보조</Button>
        <Button variant="ghost">취소</Button>
      </>,
    );
    expect(
      screen.getByRole("button", { name: "보조" }).className,
    ).toContain("border-btn-secondary-border");
    expect(screen.getByRole("button", { name: "취소" }).className).toContain(
      "text-btn-ghost-fg",
    );
  });

  it("size=sm 클래스 적용", () => {
    render(<Button size="sm">작게</Button>);
    expect(screen.getByRole("button", { name: "작게" }).className).toContain(
      "text-body-sm",
    );
  });

  it("className 병합", () => {
    render(<Button className="w-full">시작</Button>);
    expect(screen.getByRole("button").className).toContain("w-full");
  });

  it("native props 전달 (disabled, onClick)", async () => {
    render(<Button disabled>시작</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
