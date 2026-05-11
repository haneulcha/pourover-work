import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app, { type Env } from "./index";

const ENV: Env = {
  TELEGRAM_BOT_TOKEN: "BOT",
  TELEGRAM_WEBHOOK_SECRET: "S3CRET",
  ALLOWED_CHAT_IDS: "100,200",
  GITHUB_TOKEN: "ghp_x",
  GITHUB_REPO: "owner/repo",
};

function makeUpdate(overrides?: {
  text?: string;
  chatId?: number;
  messageId?: number;
  username?: string;
  dateSec?: number;
}) {
  return {
    message: {
      message_id: overrides?.messageId ?? 5,
      date: overrides?.dateSec ?? 1_780_000_000,
      chat: { id: overrides?.chatId ?? 100 },
      from: { username: overrides?.username ?? "haneul" },
      text: overrides?.text ?? "/idea New feature idea",
    },
  };
}

function post(body: unknown, secret = "S3CRET") {
  return app.request(
    "/telegram",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": secret,
      },
      body: JSON.stringify(body),
    },
    ENV,
  );
}

let originalFetch: typeof fetch;
const fetchSpy = vi.fn(
  async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response("{}", { status: 200 }),
);

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchSpy.mockReset();
  fetchSpy.mockImplementation(async (url) => {
    const u = String(url);
    if (u.startsWith("https://api.github.com/")) {
      return new Response(
        JSON.stringify({ number: 99, html_url: "https://gh/i/99" }),
        { status: 201 },
      );
    }
    if (u.startsWith("https://api.telegram.org/")) {
      return new Response("{}", { status: 200 });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("POST /telegram", () => {
  it("rejects requests without the secret token header", async () => {
    const res = await post(makeUpdate(), "wrong");
    expect(res.status).toBe(401);
  });

  it("skips updates from non-allowlisted chats without creating issues", async () => {
    const res = await post(makeUpdate({ chatId: 999 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: "chat_not_allowed" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("creates a GitHub issue and replies with the issue URL on a valid command", async () => {
    const res = await post(
      makeUpdate({ text: "/idea Dark mode\n\nWould be nice." }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, issue: 99 });

    const ghCall = fetchSpy.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.github.com/"),
    );
    expect(ghCall).toBeDefined();
    const ghBody = JSON.parse(String((ghCall![1] as RequestInit).body));
    expect(ghBody).toMatchObject({
      title: "Dark mode",
      labels: ["idea"],
    });
    expect(ghBody.body).toContain("Would be nice.");

    const tgCall = fetchSpy.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.telegram.org/"),
    );
    const tgBody = JSON.parse(String((tgCall![1] as RequestInit).body));
    expect(tgBody.text).toContain("#99");
    expect(tgBody.text).toContain("https://gh/i/99");
  });

  it("replies with a help message on unknown command without calling GitHub", async () => {
    const res = await post(makeUpdate({ text: "/foo bar" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ parse_error: "unknown_command" });

    expect(
      fetchSpy.mock.calls.some(([u]) =>
        String(u).startsWith("https://api.github.com/"),
      ),
    ).toBe(false);
    const tgCall = fetchSpy.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.telegram.org/"),
    );
    expect(JSON.parse(String((tgCall![1] as RequestInit).body)).text).toMatch(
      /\/idea/,
    );
  });

  it("replies with an empty-content hint when command has no body", async () => {
    const res = await post(makeUpdate({ text: "/idea" }));
    expect(await res.json()).toMatchObject({ parse_error: "empty_content" });
    const tgCall = fetchSpy.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.telegram.org/"),
    );
    expect(JSON.parse(String((tgCall![1] as RequestInit).body)).text).toMatch(
      /비어있어요/,
    );
  });

  it("returns 500 and notifies the user when GitHub fails", async () => {
    fetchSpy.mockImplementation(async (url) => {
      if (String(url).startsWith("https://api.github.com/")) {
        return new Response("nope", { status: 422 });
      }
      return new Response("{}", { status: 200 });
    });

    const res = await post(makeUpdate());
    expect(res.status).toBe(500);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/422/);

    const tgCall = fetchSpy.mock.calls.find(([u]) =>
      String(u).startsWith("https://api.telegram.org/"),
    );
    expect(JSON.parse(String((tgCall![1] as RequestInit).body)).text).toMatch(
      /Failed/,
    );
  });

  it("ignores updates without a message body", async () => {
    const res = await post({ update_id: 1 });
    expect(await res.json()).toEqual({ ok: true, skipped: "no_message" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
