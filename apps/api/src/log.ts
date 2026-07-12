import { Hono } from "hono";
import { createAuth } from "./auth";
import type { Env } from "./index";

const FEELINGS = new Set(["calm", "neutral", "wave"]);
const MEMO_MAX = 280;

type Vars = { userId: string };

const logRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

// 세션 가드 — better-auth의 getSession()으로 세션을 해석한다.
// 웹 클라이언트가 보내는 서명된 세션 쿠키(__Secure- 프리픽스, KV secondaryStorage
// 조회, HMAC 서명 검증)를 모두 better-auth가 처리한다. 통합 테스트는 bearer
// 플러그인을 통해 Authorization: Bearer <rawToken> 로 같은 경로를 태운다.
// 절대 D1 "session" 테이블을 직접 조회하지 않는다 — 프로덕션에서 세션은 KV에만
// 저장되고(D1 미기록), 쿠키 값도 서명되어 있어 raw 토큰 매칭이 불가능하다.
logRoutes.use("*", async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.user.id);
  await next();
});

// D3: 부분 갱신 검증. undefined면 미제공(유지), null 허용.
function validateFeeling(v: unknown): v is string | null {
  return v === null || (typeof v === "string" && FEELINGS.has(v));
}
function validateMemo(v: unknown): v is string | null {
  return v === null || (typeof v === "string" && v.length <= MEMO_MAX);
}

logRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.id !== "string" ||
    typeof body.recipe !== "string" ||
    typeof body.brewedAt !== "string" ||
    typeof body.durationSec !== "number"
  ) {
    return c.json({ error: "bad_request" }, 400);
  }
  const feeling = body.feeling ?? null;
  const memo = body.memo ?? null;
  if (!validateFeeling(feeling) || !validateMemo(memo)) {
    return c.json({ error: "bad_request" }, 400);
  }
  try {
    JSON.parse(body.recipe); // recipe는 파싱 가능한 JSON이어야 함
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }

  const ts = new Date().toISOString();
  // 멱등: 같은 id 재요청은 무시(D1).
  await c.env.DB.prepare(
    `INSERT INTO "brewLogEntry"
       ("id","userId","brewedAt","durationSec","feeling","memo","recipe","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT("id") DO NOTHING`,
  )
    .bind(body.id, userId, body.brewedAt, body.durationSec, feeling, memo, body.recipe, ts, ts)
    .run();

  return c.json({ id: body.id }, 201);
});

logRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await c.env.DB.prepare(
    `SELECT "id","brewedAt","durationSec","feeling","memo","recipe"
       FROM "brewLogEntry" WHERE "userId"=? ORDER BY "brewedAt" DESC LIMIT 200`,
  )
    .bind(userId)
    .all<{
      id: string;
      brewedAt: string;
      durationSec: number;
      feeling: string | null;
      memo: string | null;
      recipe: string;
    }>();

  const summaries = rows.results.map((r) => {
    const recipe = JSON.parse(r.recipe) as {
      method: string;
      dripper: string;
      coffee: number;
      totalWater: number;
    };
    return {
      id: r.id,
      brewedAt: r.brewedAt,
      durationSec: r.durationSec,
      method: recipe.method,
      dripper: recipe.dripper,
      coffee: recipe.coffee,
      totalWater: recipe.totalWater,
      feeling: r.feeling,
      memoSnippet: r.memo ? r.memo.slice(0, 60) : null,
    };
  });
  return c.json(summaries);
});

logRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const row = await c.env.DB.prepare(
    `SELECT "id","brewedAt","durationSec","feeling","memo","recipe"
       FROM "brewLogEntry" WHERE "id"=? AND "userId"=?`,
  )
    .bind(c.req.param("id"), userId)
    .first();
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json(row);
});

logRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return c.json({ error: "bad_request" }, 400);

  const sets: string[] = [];
  const vals: unknown[] = [];
  if ("feeling" in body) {
    if (!validateFeeling(body.feeling)) return c.json({ error: "bad_request" }, 400);
    sets.push(`"feeling"=?`);
    vals.push(body.feeling);
  }
  if ("memo" in body) {
    if (!validateMemo(body.memo)) return c.json({ error: "bad_request" }, 400);
    sets.push(`"memo"=?`);
    vals.push(body.memo);
  }
  if (sets.length === 0) return c.json({ id: c.req.param("id") }); // 무변경

  sets.push(`"updatedAt"=?`);
  vals.push(new Date().toISOString());

  const res = await c.env.DB.prepare(
    `UPDATE "brewLogEntry" SET ${sets.join(", ")} WHERE "id"=? AND "userId"=?`,
  )
    .bind(...vals, c.req.param("id"), userId)
    .run();

  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ id: c.req.param("id") });
});

logRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const res = await c.env.DB.prepare(
    `DELETE FROM "brewLogEntry" WHERE "id"=? AND "userId"=?`,
  )
    .bind(c.req.param("id"), userId)
    .run();
  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});

export { logRoutes };
