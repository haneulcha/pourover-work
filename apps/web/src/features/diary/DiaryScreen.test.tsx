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

  it("groups logs under a day heading and invites a memo when there is none", async () => {
    const today = new Date();
    listLogs.mockResolvedValue([
      { id: "l1", brewedAt: today.toISOString(), durationSec: 200,
        method: "kasuya_4_6", dripper: "v60", coffee: 20, totalWater: 300,
        feeling: "calm", memoSnippet: null },
    ]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "오늘" })).toBeInTheDocument(),
    );
    expect(screen.getByText("한 줄 남겨둘까요")).toBeInTheDocument();
  });

  it("drops the dripper from the meta line when the method name already carries it", async () => {
    listLogs.mockResolvedValue([
      { id: "l1", brewedAt: "2026-06-02T00:00:00.000Z", durationSec: 188,
        method: "hoffmann_v60", dripper: "v60", coffee: 18, totalWater: 288,
        feeling: null, memoSnippet: "무난했다" },
      { id: "l2", brewedAt: "2026-06-02T00:00:00.000Z", durationSec: 240,
        method: "april", dripper: "kalita_wave", coffee: 22, totalWater: 330,
        feeling: null, memoSnippet: "괜찮았다" },
    ]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText("Hoffmann V60 · 18g · 288g · 3:08")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("April · Kalita Wave · 22g · 330g · 4:00"),
    ).toBeInTheDocument();
  });
});
