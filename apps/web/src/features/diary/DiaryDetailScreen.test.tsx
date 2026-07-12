import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recipeToJSON } from "@pourover/domain/serialize";
import { brewMethods } from "@pourover/domain/methods";
import { g } from "@pourover/domain/units";
import { DiaryDetailScreen } from "./DiaryDetailScreen";

const getLog = vi.fn();
const deleteLog = vi.fn();
vi.mock("./api", () => ({
  getLog: (...args: unknown[]) => getLog(...args),
  patchLog: vi.fn(),
  deleteLog: (...args: unknown[]) => deleteLog(...args),
}));
afterEach(() => vi.restoreAllMocks());

const loadedLog = () => ({
  id: "log-1",
  brewedAt: new Date().toISOString(),
  durationSec: 205,
  feeling: "calm" as const,
  memo: "산미가 좋았다",
  recipe: recipeToJSON(
    brewMethods.kasuya_4_6.compute({
      method: "kasuya_4_6",
      dripper: "v60",
      coffee: g(20),
      roast: "medium",
      taste: { sweetness: "balanced", strength: "medium" },
    }),
  ),
});

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

  it("shows how the brew felt", async () => {
    getLog.mockResolvedValue(loadedLog());
    render(
      <DiaryDetailScreen id="log-1" onBack={() => {}} onDeleted={() => {}} />,
    );
    await waitFor(() =>
      expect(screen.getByText("만족스러워요")).toBeInTheDocument(),
    );
  });

  it("asks once before deleting, and only deletes on the second tap", async () => {
    const onDeleted = vi.fn();
    deleteLog.mockResolvedValue(undefined);
    getLog.mockResolvedValue(loadedLog());
    render(
      <DiaryDetailScreen id="log-1" onBack={() => {}} onDeleted={onDeleted} />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "삭제" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("삭제할까요?")).toBeInTheDocument();
    expect(deleteLog).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByText("삭제할까요?")).not.toBeInTheDocument();
    expect(deleteLog).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(deleteLog).toHaveBeenCalledWith("log-1");
  });

  it("keeps the log and says so when deleting fails", async () => {
    const onDeleted = vi.fn();
    deleteLog.mockRejectedValue(new Error("500"));
    getLog.mockResolvedValue(loadedLog());
    render(
      <DiaryDetailScreen id="log-1" onBack={() => {}} onDeleted={onDeleted} />,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "삭제" })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("삭제하지 못했어요"),
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
