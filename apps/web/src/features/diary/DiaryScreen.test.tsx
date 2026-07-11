import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiaryScreen } from "./DiaryScreen";

const listLogs = vi.fn();
vi.mock("./api", () => ({ listLogs: () => listLogs() }));
afterEach(() => vi.restoreAllMocks());

describe("DiaryScreen", () => {
  it("renders a row per log summary", async () => {
    listLogs.mockResolvedValue([
      { id: "l1", brewedAt: "2026-06-02T00:00:00.000Z", durationSec: 200,
        method: "kasuya_4_6", dripper: "v60", coffee: 20, totalWater: 300,
        feeling: "calm", memoSnippet: "좋았음" },
    ]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText("좋았음")).toBeInTheDocument());
  });

  it("shows an empty state when there are no logs", async () => {
    listLogs.mockResolvedValue([]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument());
  });
});
