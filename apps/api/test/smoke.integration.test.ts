import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("D1 harness smoke", () => {
  it("applies migrations and executes real SQL", async () => {
    await env.DB.prepare(
      `INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?)`,
    )
      .bind("u_smoke", "Smoke", "smoke@test.dev", 1, "2026-01-01", "2026-01-01")
      .run();

    const row = await env.DB.prepare(
      `SELECT "email" FROM "user" WHERE "id" = ?`,
    )
      .bind("u_smoke")
      .first<{ email: string }>();

    expect(row?.email).toBe("smoke@test.dev");
  });
});
