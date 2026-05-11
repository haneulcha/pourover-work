import { describe, expect, it, vi } from "vitest";
import { sendTelegramMessage } from "./telegram";

describe("sendTelegramMessage", () => {
  it("POSTs to bot sendMessage endpoint with chat_id and text", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response("{}", { status: 200 }),
    );

    await sendTelegramMessage({
      botToken: "BOT:TOKEN",
      chatId: 123,
      text: "ok",
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.telegram.org/botBOT:TOKEN/sendMessage");
    expect(JSON.parse(init?.body as string)).toEqual({
      chat_id: 123,
      text: "ok",
    });
  });

  it("includes reply_to_message_id when provided", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response("{}", { status: 200 }),
    );
    await sendTelegramMessage({
      botToken: "T",
      chatId: 1,
      text: "x",
      replyToMessageId: 42,
      fetchImpl,
    });
    expect(JSON.parse(fetchImpl.mock.calls[0]![1]?.body as string)).toMatchObject(
      { reply_to_message_id: 42 },
    );
  });

  it("throws on non-2xx", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response("nope", { status: 500 }),
    );
    await expect(
      sendTelegramMessage({
        botToken: "T",
        chatId: 1,
        text: "x",
        fetchImpl,
      }),
    ).rejects.toThrow(/500.*nope/);
  });
});
