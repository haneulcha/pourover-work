import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { logRoutes } from "./log";

export type Env = {
  readonly DB: D1Database;
  readonly AUTH_KV: KVNamespace;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly AUTH_SECRET: string;
  readonly WEB_ORIGIN: string;
  readonly API_BASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

// CORS: web(localhost:5173 등) ↔ api 분리 origin 흐름에 필수.
// 쿠키를 함께 보내려면 credentials: true + 정확한 origin 매칭.
app.use("/api/*", (c, next) =>
  cors({
    origin: c.env.WEB_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })(c, next),
);

// better-auth가 자체적으로 /api/auth/* 하위 모든 라우트(sign-in/callback/sign-out/get-session 등)를 처리.
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/api/log", logRoutes);

app.get("/healthz", async (c) => {
  try {
    const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{
      ok: number;
    }>();
    if (row?.ok !== 1) {
      return c.json(
        {
          ok: false,
          name: "@pourover/api",
          version: "0.0.0",
          db: "fail",
        },
        503,
      );
    }
  } catch {
    return c.json(
      {
        ok: false,
        name: "@pourover/api",
        version: "0.0.0",
        db: "fail",
      },
      503,
    );
  }

  return c.json({
    ok: true,
    name: "@pourover/api",
    version: "0.0.0",
    db: "ok",
  });
});

export default app;
