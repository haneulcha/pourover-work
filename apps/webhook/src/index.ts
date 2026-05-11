import { Hono } from "hono";
import { createGitHubIssue } from "./github";
import { buildIssuePayload } from "./issue";
import { parseCommand } from "./parser";
import { sendTelegramMessage } from "./telegram";

export type Env = {
  readonly TELEGRAM_BOT_TOKEN: string;
  readonly TELEGRAM_WEBHOOK_SECRET: string;
  readonly ALLOWED_CHAT_IDS: string;
  readonly GITHUB_TOKEN: string;
  readonly GITHUB_REPO: string;
};

type TelegramUpdate = {
  readonly message?: {
    readonly message_id: number;
    readonly date: number;
    readonly chat: { readonly id: number };
    readonly from?: { readonly username?: string; readonly first_name?: string };
    readonly text?: string;
  };
};

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.text("ok"));

app.post("/telegram", async (c) => {
  // (1) Verify Telegram's secret token header — set when registering the
  // webhook so unauthenticated POSTs are rejected immediately.
  const secret = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.text("unauthorized", 401);
  }

  const update = (await c.req.json()) as TelegramUpdate;
  const msg = update.message;
  if (!msg || !msg.text) return c.json({ ok: true, skipped: "no_message" });

  // (2) Allowlist by chat_id — only the owner's chat is accepted.
  const allowed = new Set(
    c.env.ALLOWED_CHAT_IDS.split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n)),
  );
  if (!allowed.has(msg.chat.id)) {
    return c.json({ ok: true, skipped: "chat_not_allowed" });
  }

  // (3) Parse the command. Non-commands and unknown commands get a quiet
  // bot reply explaining the supported set; nothing is logged to GitHub.
  const parsed = parseCommand(msg.text);
  if (parsed.kind === "error") {
    await sendTelegramMessage({
      botToken: c.env.TELEGRAM_BOT_TOKEN,
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      text: replyForParseError(parsed.reason),
    });
    return c.json({ ok: true, parse_error: parsed.reason });
  }

  // (4) Build + create the GitHub issue.
  const payload = buildIssuePayload(parsed, {
    senderName: msg.from?.username ?? msg.from?.first_name ?? "unknown",
    sentAtIso: new Date(msg.date * 1000).toISOString(),
    telegramMessageId: msg.message_id,
  });

  try {
    const issue = await createGitHubIssue({
      repo: c.env.GITHUB_REPO,
      token: c.env.GITHUB_TOKEN,
      payload,
    });
    await sendTelegramMessage({
      botToken: c.env.TELEGRAM_BOT_TOKEN,
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      text: `✅ #${issue.number} (${parsed.category})\n${issue.htmlUrl}`,
    });
    return c.json({ ok: true, issue: issue.number });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await sendTelegramMessage({
      botToken: c.env.TELEGRAM_BOT_TOKEN,
      chatId: msg.chat.id,
      replyToMessageId: msg.message_id,
      text: `⚠️ Failed to create issue: ${detail}`,
    });
    return c.json({ ok: false, error: detail }, 500);
  }
});

function replyForParseError(
  reason: "not_a_command" | "unknown_command" | "empty_content",
): string {
  if (reason === "empty_content") {
    return "내용이 비어있어요. `/idea <제목>` 형식으로 보내주세요.";
  }
  return "사용 가능한 명령: `/idea`, `/bug`, `/research` <제목><newline><본문>";
}

export default app;
