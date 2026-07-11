import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiaryDetailScreen } from "./DiaryDetailScreen";

const getLog = vi.fn();
vi.mock("./api", () => ({
  getLog: (...args: unknown[]) => getLog(...args),
  patchLog: vi.fn(),
  deleteLog: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

describe("DiaryDetailScreen", () => {
  it("shows error message when getLog rejects", async () => {
    getLog.mockRejectedValue(new Error("network error"));
    render(
      <DiaryDetailScreen id="log-1" onBack={() => {}} onDeleted={() => {}} />,
    );
    await waitFor(() =>
      expect(
        screen.getByText("기록을 불러오지 못했어요."),
      ).toBeInTheDocument(),
    );
  });

  it("delete button is disabled while detail has not loaded", async () => {
    getLog.mockRejectedValue(new Error("404"));
    render(
      <DiaryDetailScreen id="log-1" onBack={() => {}} onDeleted={() => {}} />,
    );
    await waitFor(() =>
      expect(screen.getByText("기록을 불러오지 못했어요.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled();
  });
});
