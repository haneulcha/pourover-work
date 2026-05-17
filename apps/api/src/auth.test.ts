import { describe, expect, it, vi } from "vitest";
import type { Env } from "./index";
import { createAuth } from "./auth";

function makeEnv(): Env {
  return {
    DB: {
      prepare: vi.fn(() => ({ first: async () => null })),
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

describe("createAuth", () => {
  it("constructs an auth instance with Google provider and bearer plugin", () => {
    const auth = createAuth(makeEnv());
    expect(auth).toBeDefined();
    expect(typeof auth.handler).toBe("function");
  });

  it("exposes a handler that responds to fetch-style Request", async () => {
    const auth = createAuth(makeEnv());
    const res = await auth.handler(
      new Request("http://localhost:8787/api/auth/get-session"),
    );
    expect(res).toBeInstanceOf(Response);
  });
});
