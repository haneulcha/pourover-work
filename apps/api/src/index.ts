import { Hono } from "hono";

export type Env = Record<string, never>;

const app = new Hono<{ Bindings: Env }>();

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    name: "@pourover/api",
    version: "0.0.0",
  }),
);

export default app;
