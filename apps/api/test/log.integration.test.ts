import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const now = "2026-07-01T00:00:00.000Z";

// 실 D1에 user + session 행을 심고, 그 세션 토큰을 쿠키로 반환.
async function seedSession(userId: string): Promise<string> {
  const token = `tok_${userId}`;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?)`,
  )
    .bind(userId, "Test", `${userId}@test.dev`, 1, now, now)
    .run();
  await env.DB.prepare(
    `INSERT OR REPLACE INTO "session"
       ("id","expiresAt","token","createdAt","updatedAt","userId")
     VALUES (?,?,?,?,?,?)`,
  )
    .bind(`sess_${userId}`, "2099-01-01T00:00:00.000Z", token, now, now, userId)
    .run();
  // better-auth 기본 세션 쿠키명.
  return `better-auth.session_token=${token}`;
}

const validRecipe = JSON.stringify({
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: 20,
  totalWater: 300,
  ratio: 15,
  temperature: 92,
  pours: [{ index: 0, atSec: 0, pourAmount: 300, cumulativeWater: 300 }],
  totalTimeSec: 210,
  grindHint: "medium",
  notes: [],
});

function createBody(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "log_1",
    recipe: validRecipe,
    brewedAt: now,
    durationSec: 200,
    ...over,
  });
}

async function post(cookie: string | null, body: string) {
  return SELF.fetch("https://api.test/api/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
}

describe("POST /api/log", () => {
  it("401 without a session", async () => {
    const res = await post(null, createBody());
    expect(res.status).toBe(401);
  });

  it("creates a log for the authed user", async () => {
    const cookie = await seedSession("u_a");
    const res = await post(cookie, createBody());
    expect(res.status).toBe(201);
    const row = await env.DB.prepare(
      `SELECT "userId","feeling" FROM "brewLogEntry" WHERE "id"=?`,
    )
      .bind("log_1")
      .first<{ userId: string; feeling: string | null }>();
    expect(row?.userId).toBe("u_a");
  });

  it("is idempotent — same id twice yields one row", async () => {
    const cookie = await seedSession("u_b");
    await post(cookie, createBody({ id: "log_dup" }));
    await post(cookie, createBody({ id: "log_dup", memo: "second" }));
    const rows = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM "brewLogEntry" WHERE "id"=?`,
    )
      .bind("log_dup")
      .first<{ n: number }>();
    expect(rows?.n).toBe(1);
  });

  it("400 on memo over 280 chars", async () => {
    const cookie = await seedSession("u_c");
    const res = await post(cookie, createBody({ id: "log_x", memo: "x".repeat(281) }));
    expect(res.status).toBe(400);
  });

  it("400 on invalid feeling", async () => {
    const cookie = await seedSession("u_c");
    const res = await post(cookie, createBody({ id: "log_y", feeling: "angry" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/log", () => {
  it("returns only the caller's entries as summaries, newest first", async () => {
    const a = await seedSession("u_list_a");
    const b = await seedSession("u_list_b");
    await post(a, createBody({ id: "l_old", brewedAt: "2026-06-01T00:00:00.000Z" }));
    await post(a, createBody({ id: "l_new", brewedAt: "2026-06-02T00:00:00.000Z" }));
    await post(b, createBody({ id: "l_other" }));

    const res = await SELF.fetch("https://api.test/api/log", { headers: { Cookie: a } });
    expect(res.status).toBe(200);
    const list = (await res.json()) as { id: string; method: string; totalWater: number }[];
    expect(list.map((e) => e.id)).toEqual(["l_new", "l_old"]);
    expect(list[0]!.method).toBe("kasuya_4_6");
    expect(list[0]!.totalWater).toBe(300);
    expect(list.some((e) => e.id === "l_other")).toBe(false);
  });
});

describe("GET /api/log/:id", () => {
  it("returns full detail incl. recipe json for owner, 404 for others", async () => {
    const a = await seedSession("u_get_a");
    const b = await seedSession("u_get_b");
    await post(a, createBody({ id: "g_1", memo: "hi" }));

    const ok = await SELF.fetch("https://api.test/api/log/g_1", { headers: { Cookie: a } });
    expect(ok.status).toBe(200);
    const detail = (await ok.json()) as { recipe: string; memo: string | null };
    expect(JSON.parse(detail.recipe).method).toBe("kasuya_4_6");
    expect(detail.memo).toBe("hi");

    const forbidden = await SELF.fetch("https://api.test/api/log/g_1", { headers: { Cookie: b } });
    expect(forbidden.status).toBe(404);
  });
});

describe("PATCH /api/log/:id", () => {
  it("updates only provided fields; null clears feeling", async () => {
    const a = await seedSession("u_patch");
    await post(a, createBody({ id: "p_1", feeling: "calm", memo: "orig" }));

    // memo만 변경 — feeling 유지
    await SELF.fetch("https://api.test/api/log/p_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: a },
      body: JSON.stringify({ memo: "updated" }),
    });
    let row = await env.DB.prepare(`SELECT "feeling","memo" FROM "brewLogEntry" WHERE "id"=?`)
      .bind("p_1").first<{ feeling: string | null; memo: string | null }>();
    expect(row).toEqual({ feeling: "calm", memo: "updated" });

    // feeling: null — 지우기
    await SELF.fetch("https://api.test/api/log/p_1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: a },
      body: JSON.stringify({ feeling: null }),
    });
    row = await env.DB.prepare(`SELECT "feeling","memo" FROM "brewLogEntry" WHERE "id"=?`)
      .bind("p_1").first<{ feeling: string | null; memo: string | null }>();
    expect(row).toEqual({ feeling: null, memo: "updated" });
  });

  it("404 patching someone else's entry", async () => {
    const a = await seedSession("u_patch_a");
    const b = await seedSession("u_patch_b");
    await post(a, createBody({ id: "p_owned" }));
    const res = await SELF.fetch("https://api.test/api/log/p_owned", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: b },
      body: JSON.stringify({ memo: "hijack" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/log/:id", () => {
  it("deletes own entry; 404 and survives for others", async () => {
    const a = await seedSession("u_del_a");
    const b = await seedSession("u_del_b");
    await post(a, createBody({ id: "d_1" }));

    const forbidden = await SELF.fetch("https://api.test/api/log/d_1", {
      method: "DELETE", headers: { Cookie: b },
    });
    expect(forbidden.status).toBe(404);
    let row = await env.DB.prepare(`SELECT "id" FROM "brewLogEntry" WHERE "id"=?`).bind("d_1").first();
    expect(row).not.toBeNull();

    const ok = await SELF.fetch("https://api.test/api/log/d_1", {
      method: "DELETE", headers: { Cookie: a },
    });
    expect(ok.status).toBe(204);
    row = await env.DB.prepare(`SELECT "id" FROM "brewLogEntry" WHERE "id"=?`).bind("d_1").first();
    expect(row).toBeNull();
  });
});
