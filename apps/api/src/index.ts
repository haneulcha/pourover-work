import { Hono } from "hono";

export type Env = {
  readonly DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

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
