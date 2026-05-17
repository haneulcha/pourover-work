import { describe, expect, it, vi } from "vitest";
import app, { type Env } from "./index";

function makeEnv(overrides?: {
  dbFirst?: () => Promise<unknown>;
}): Env {
  const first =
    overrides?.dbFirst ?? (async () => ({ ok: 1 }));
  return {
    DB: {
      prepare: vi.fn((_sql: string) => ({
        first: first as () => Promise<unknown>,
      })),
    } as unknown as Env["DB"],
    AUTH_KV: {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    } as unknown as Env["AUTH_KV"],
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    AUTH_SECRET: "test-secret-test-secret-test-secret-test",
    WEB_ORIGIN: "http://localhost:5173",
    API_BASE_URL: "http://localhost:8787",
  };
}

describe("GET /healthz", () => {
  it("returns ok with package name, version, and db status when D1 succeeds", async () => {
    const res = await app.request("/healthz", undefined, makeEnv());

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      version: string;
      db: string;
    };
    expect(body).toEqual({
      ok: true,
      name: "@pourover/api",
      version: "0.0.0",
      db: "ok",
    });
  });

  it("reports db: fail with 503 when D1 throws", async () => {
    const env = makeEnv({
      dbFirst: async () => {
        throw new Error("boom");
      },
    });
    const res = await app.request("/healthz", undefined, env);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { db: string };
    expect(body.db).toBe("fail");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/does-not-exist", undefined, makeEnv());
    expect(res.status).toBe(404);
  });
});

describe("/api/auth/*", () => {
  it("mounts better-auth handler — get-session returns 200 with null user when no cookie", async () => {
    const res = await app.request(
      "/api/auth/get-session",
      undefined,
      makeEnv(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // 세션 없는 상태에서 better-auth는 null 또는 빈 객체 반환.
    expect(body).toBeDefined();
    expect((body as { user?: unknown } | null)?.user ?? null).toBeNull();
  });

  it("preflights CORS for the configured WEB_ORIGIN", async () => {
    const res = await app.request(
      "/api/auth/get-session",
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "content-type",
        },
      },
      makeEnv(),
    );

    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
