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
  };
}

describe("GET /healthz", () => {
  it("returns ok with package name, version, and db status when D1 succeeds", async () => {
    const env = makeEnv();
    const res = await app.request("/healthz", undefined, env);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

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

  it("issues SELECT 1 against D1 binding", async () => {
    const env = makeEnv();
    await app.request("/healthz", undefined, env);

    const prepare = env.DB.prepare as ReturnType<typeof vi.fn>;
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[0]).toMatch(/select\s+1/i);
  });

  it("reports db: fail with 503 when D1 throws", async () => {
    const env = makeEnv({
      dbFirst: async () => {
        throw new Error("boom");
      },
    });
    const res = await app.request("/healthz", undefined, env);

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      ok: boolean;
      db: string;
    };
    expect(body.ok).toBe(false);
    expect(body.db).toBe("fail");
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/does-not-exist", undefined, makeEnv());
    expect(res.status).toBe(404);
  });
});
