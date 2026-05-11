import { describe, expect, it } from "vitest";
import { parseCommand } from "./parser";

describe("parseCommand", () => {
  it("parses /idea with single-line content as title-only", () => {
    expect(parseCommand("/idea Add dark mode toggle")).toEqual({
      kind: "ok",
      category: "idea",
      title: "Add dark mode toggle",
      body: "",
    });
  });

  it("splits multi-line content into title + body", () => {
    expect(
      parseCommand("/bug Timer drifts after 5 min\n\nDetails about the bug"),
    ).toEqual({
      kind: "ok",
      category: "bug",
      title: "Timer drifts after 5 min",
      body: "Details about the bug",
    });
  });

  it("accepts /research", () => {
    const r = parseCommand("/research compare hoffmann vs scott rao");
    expect(r).toMatchObject({ kind: "ok", category: "research" });
  });

  it("strips bot username from command (e.g. /idea@MyBot)", () => {
    expect(parseCommand("/idea@PouroverBot Something cool")).toMatchObject({
      kind: "ok",
      category: "idea",
      title: "Something cool",
    });
  });

  it("rejects unknown command", () => {
    expect(parseCommand("/foo whatever")).toEqual({
      kind: "error",
      reason: "unknown_command",
    });
  });

  it("rejects message without leading slash", () => {
    expect(parseCommand("just some text")).toEqual({
      kind: "error",
      reason: "not_a_command",
    });
  });

  it("rejects empty command body", () => {
    expect(parseCommand("/idea")).toEqual({
      kind: "error",
      reason: "empty_content",
    });
    expect(parseCommand("/idea   ")).toEqual({
      kind: "error",
      reason: "empty_content",
    });
  });

  it("trims surrounding whitespace from title and body", () => {
    expect(parseCommand("/idea  hello \n\n  world  ")).toEqual({
      kind: "ok",
      category: "idea",
      title: "hello",
      body: "world",
    });
  });

  it("title is truncated to 80 chars when only one long line is given", () => {
    const long = "a".repeat(120);
    const r = parseCommand(`/idea ${long}`);
    expect(r).toEqual({
      kind: "ok",
      category: "idea",
      title: "a".repeat(80),
      body: long,
    });
  });

  it("preserves body line breaks", () => {
    const r = parseCommand("/bug Title\n\nline1\nline2");
    expect(r).toMatchObject({ body: "line1\nline2" });
  });
});
