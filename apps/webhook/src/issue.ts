import type { Category } from "./parser";

export type TelegramMeta = {
  readonly senderName: string;
  readonly sentAtIso: string;
  readonly telegramMessageId: number;
};

export type IssuePayload = {
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
};

type ParsedOk = {
  readonly kind: "ok";
  readonly category: Category;
  readonly title: string;
  readonly body: string;
};

export function buildIssuePayload(
  parsed: ParsedOk,
  meta: TelegramMeta,
): IssuePayload {
  const footer = [
    "",
    "---",
    `_via Telegram · ${meta.senderName} · ${meta.sentAtIso} · msg ${meta.telegramMessageId}_`,
  ].join("\n");

  const body = parsed.body.length > 0 ? `${parsed.body}\n${footer}` : footer.trimStart();

  return {
    title: parsed.title,
    body,
    labels: [parsed.category],
  };
}
