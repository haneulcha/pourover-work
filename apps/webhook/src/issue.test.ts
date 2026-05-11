import { describe, expect, it } from "vitest";
import { buildIssuePayload } from "./issue";

describe("buildIssuePayload", () => {
  const baseParsed = {
    kind: "ok" as const,
    category: "idea" as const,
    title: "Dark mode toggle",
    body: "Would be nice to have a dark mode toggle in the recipe screen.",
  };

  const baseMeta = {
    senderName: "haneul",
    sentAtIso: "2026-05-12T10:30:00.000Z",
    telegramMessageId: 42,
  };

  it("uses parsed title verbatim", () => {
    const payload = buildIssuePayload(baseParsed, baseMeta);
    expect(payload.title).toBe("Dark mode toggle");
  });

  it("includes body + telegram source footer", () => {
    const payload = buildIssuePayload(baseParsed, baseMeta);
    expect(payload.body).toContain(baseParsed.body);
    expect(payload.body).toContain("haneul");
    expect(payload.body).toContain("2026-05-12T10:30:00.000Z");
  });

  it("labels the issue with its category", () => {
    expect(buildIssuePayload(baseParsed, baseMeta).labels).toEqual(["idea"]);
    expect(
      buildIssuePayload({ ...baseParsed, category: "bug" }, baseMeta).labels,
    ).toEqual(["bug"]);
    expect(
      buildIssuePayload({ ...baseParsed, category: "research" }, baseMeta)
        .labels,
    ).toEqual(["research"]);
  });

  it("handles empty body gracefully (footer-only body)", () => {
    const payload = buildIssuePayload({ ...baseParsed, body: "" }, baseMeta);
    expect(payload.body).toContain("haneul");
    expect(payload.body.startsWith("\n")).toBe(false);
  });
});
