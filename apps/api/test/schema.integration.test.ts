import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("brewLogEntry schema", () => {
  it("has the expected columns", async () => {
    const cols = await env.DB.prepare(
      `SELECT name FROM pragma_table_info('brewLogEntry')`,
    ).all<{ name: string }>();
    const names = cols.results.map((r) => r.name).sort();
    expect(names).toEqual(
      [
        "brewedAt",
        "createdAt",
        "durationSec",
        "feeling",
        "id",
        "memo",
        "recipe",
        "updatedAt",
        "userId",
      ].sort(),
    );
  });
});
