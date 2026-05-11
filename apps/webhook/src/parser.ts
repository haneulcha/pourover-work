export type Category = "idea" | "bug" | "research";

export type ParseResult =
  | {
      readonly kind: "ok";
      readonly category: Category;
      readonly title: string;
      readonly body: string;
    }
  | {
      readonly kind: "error";
      readonly reason:
        | "not_a_command"
        | "unknown_command"
        | "empty_content";
    };

const CATEGORIES = new Set<Category>(["idea", "bug", "research"]);
const TITLE_MAX = 80;

export function parseCommand(text: string): ParseResult {
  if (!text.startsWith("/")) return { kind: "error", reason: "not_a_command" };

  const firstSpace = text.search(/\s/);
  const rawCommand = firstSpace === -1 ? text.slice(1) : text.slice(1, firstSpace);
  const command = rawCommand.split("@")[0]?.toLowerCase() ?? "";

  if (!CATEGORIES.has(command as Category)) {
    return { kind: "error", reason: "unknown_command" };
  }

  const rest = (firstSpace === -1 ? "" : text.slice(firstSpace + 1)).trim();
  if (rest.length === 0) return { kind: "error", reason: "empty_content" };

  const [firstLine, ...restLines] = rest.split("\n");
  const firstLineTrimmed = (firstLine ?? "").trim();
  const restBody = restLines.join("\n").trim();

  // If only one line, use it as title; also include full content as body
  // (truncated title still helps the issue list scan, while body keeps the
  // user's original wording).
  if (restBody.length === 0) {
    return {
      kind: "ok",
      category: command as Category,
      title: firstLineTrimmed.slice(0, TITLE_MAX),
      body: firstLineTrimmed.length > TITLE_MAX ? firstLineTrimmed : "",
    };
  }

  return {
    kind: "ok",
    category: command as Category,
    title: firstLineTrimmed.slice(0, TITLE_MAX),
    body: restBody,
  };
}
