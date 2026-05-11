export async function sendTelegramMessage(opts: {
  readonly botToken: string;
  readonly chatId: number;
  readonly text: string;
  readonly replyToMessageId?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(
    `https://api.telegram.org/bot${opts.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: opts.chatId,
        text: opts.text,
        ...(opts.replyToMessageId !== undefined
          ? { reply_to_message_id: opts.replyToMessageId }
          : {}),
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram API ${res.status}: ${detail}`);
  }
}
