# better-auth + Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADR 0001 후속 3/6 (issue #21) — `apps/api`에 `better-auth` 통합. Google OAuth로 로그인하면 D1 `user`/`account`/`session` 테이블에 행이 생기고, opaque session token이 쿠키(web)와 Authorization 헤더(모바일) 둘 다로 인증되도록 `bearer` plugin 등록. `apps/web`에 "Google 계정으로 로그인" 진입 UI.

**Architecture:**
- 서버: Kysely + `kysely-d1` Dialect로 D1 어댑터를 구성 → `better-auth({ database, secondaryStorage(KV), socialProviders, plugins: [bearer()] })`. Hono에 `/auth/*` 라우트 마운트 + CORS.
- 쿠키: `SameSite=None; Secure; HttpOnly` — web(localhost:5173) ↔ api(localhost:8787) cross-origin과 향후 다른 도메인 배포 모두 커버. 브라우저는 localhost에 한해 HTTP에서도 Secure 쿠키 허용.
- 토큰 형식: opaque random string. JWT 아님. mobile은 `Authorization: Bearer <token>`으로 같은 행 인증 (better-auth bearer plugin).
- 클라: 로그인 버튼 → `window.location.href = "<API_BASE>/auth/sign-in/google?callbackURL=<WEB_BASE>"` → Google → callback → 쿠키 셋 → 페이지 새로고침. 세션은 `useSession()` 훅이 `/auth/get-session`에서 fetch.

**Tech Stack:** `better-auth`, `kysely`, `kysely-d1`, Hono(이미 있음), React 19(이미 있음). 새 dev dep 없음.

**Out of scope (별도 이슈/후속 ADR):**
- Apple OAuth — 모바일 진입 시점
- 사용자 프로필 편집·삭제 UI
- 권한/역할 시스템
- 라우트 가드 정교화 — 로그인 상태 표시만
- 도메인 엔드포인트(`/log` 등) — #23
- 도메인 테이블(`brewLogEntry`) — #23에서 별도 마이그레이션

---

## Pre-requisite (사용자가 진행 전에 해야 할 셋업)

본 PR 머지 전, 또는 로컬 검증 직전에 사용자가 다음을 준비해야 함. **plan 실행 중 subagent는 이 셋업 결과(client_id/secret 등)를 받을 수 없다 — 마지막 검증은 사용자가 직접 수행한다.**

1. **Google Cloud OAuth client** 생성
   - https://console.cloud.google.com/apis/credentials → "Create Credentials" → "OAuth client ID"
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:8787/api/auth/callback/google` (dev)
     - 프로덕션 URL은 배포 후 추가
   - 발급된 `client_id`, `client_secret` 메모

2. **CF KV namespace** 생성 (better-auth secondary storage용)
   - `cd apps/api && bunx wrangler kv namespace create pourover-auth-cache`
   - 출력의 `id` UUID를 메모해 `wrangler.jsonc`에 박을 준비

3. **AUTH_SECRET** 생성
   - `openssl rand -hex 32` 출력 메모

4. **D1 prod DB** (아직 안 했으면)
   - `cd apps/api && bunx wrangler d1 create pourover-api`
   - 출력 UUID로 wrangler.jsonc의 `database_id` placeholder 교체

5. **wrangler secret 등록**
   - `cd apps/api && bunx wrangler secret put GOOGLE_CLIENT_ID`
   - `cd apps/api && bunx wrangler secret put GOOGLE_CLIENT_SECRET`
   - `cd apps/api && bunx wrangler secret put AUTH_SECRET`

6. **로컬 `.dev.vars`** 생성 (`apps/api/.dev.vars`, gitignored)
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   AUTH_SECRET=...
   ```

이 단계는 README에 다시 자세히 적힌다. plan 실행 흐름은 위 셋업이 끝났다고 가정하지 않고 — 코드 변경·typecheck·unit test까지만 자동으로 진행하고 마지막 E2E OAuth 흐름 검증은 사용자가 수동 수행하는 것으로 마무리.

---

## File Structure

**Modify:**
- `apps/api/wrangler.jsonc` — KV binding + vars(`WEB_ORIGIN`, `API_BASE_URL`)
- `apps/api/package.json` — deps 추가
- `apps/api/src/index.ts` — CORS + `/api/auth/*` 마운트 + `Env` 확장
- `apps/api/src/index.test.ts` — auth 라우트/CORS/Env 변경 반영
- `apps/api/README.md` — Pre-requisite 섹션 + 셋업 명령
- `apps/web/src/features/wall/WallScreen.tsx` — 로그인/세션 UI를 footer 위에 한 줄 추가

**Create:**
- `apps/api/src/auth.ts` — `createAuth(env)` 팩토리. Kysely(D1Dialect) + better-auth config + Google provider + bearer plugin.
- `apps/api/src/auth.test.ts` — config 인스턴스화 smoke test (실 OAuth는 안 부름)
- `apps/web/src/features/auth/api.ts` — `getSession`, `signInUrl`, `signOut` fetch 헬퍼
- `apps/web/src/features/auth/useSession.ts` — React 훅
- `apps/web/src/features/auth/LoginPill.tsx` — 로그인/로그아웃 UI 컴포넌트
- `apps/web/src/features/auth/api.test.ts` — fetch 헬퍼 단위 테스트

---

## Task 1: API — KV binding + 환경 변수 (wrangler.jsonc)

**Files:**
- Modify: `apps/api/wrangler.jsonc`

- [ ] **Step 1: wrangler.jsonc 갱신**

기존 내용을 다음으로 교체:

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "pourover-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-16",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pourover-api",
      "database_id": "local-only-replace-before-deploy",
      "migrations_dir": "migrations"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "AUTH_KV",
      "id": "local-only-replace-before-deploy"
    }
  ],
  "vars": {
    "WEB_ORIGIN": "http://localhost:5173",
    "API_BASE_URL": "http://localhost:8787"
  }
}
```

- `AUTH_KV`: better-auth secondary storage(세션 캐시·rate limit). 로컬 모드는 `id`를 사용하지 않음.
- `WEB_ORIGIN`: CORS 허용 origin. 프로덕션에서는 `[env.production.vars]`로 override (이번 PR에선 dev 기본값만; prod override는 배포 시점에 사용자가 추가).
- `API_BASE_URL`: better-auth `baseURL` (콜백 URL 생성에 사용).

- [ ] **Step 2: typecheck**

Run: `bun run --filter @pourover/api typecheck`
Expected: exit 0.

---

## Task 2: API — 의존성 추가

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: package.json 수정**

`dependencies`에 다음 3개 추가 (기존 `hono` 유지):

```json
"dependencies": {
  "better-auth": "^1.4.21",
  "hono": "^4.6.14",
  "kysely": "^0.27.5",
  "kysely-d1": "^0.3.0"
}
```

- [ ] **Step 2: 설치**

Run: `bun install`
Expected: lockfile 업데이트, 에러 없음.

- [ ] **Step 3: import 가능한지 빠르게 확인**

Run: `bunx --bun tsc --noEmit -p apps/api/tsconfig.json` 또는 `bun run --filter @pourover/api typecheck`
Expected: 의존성이 추가되었어도 아직 import 안 했으니 변화 없이 통과.

---

## Task 3: API — `src/auth.ts` 작성

**Files:**
- Create: `apps/api/src/auth.ts`

- [ ] **Step 1: auth.ts 작성**

```ts
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { bearer } from "better-auth/plugins";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { Env } from "./index";

// better-auth의 D1 어댑터 경로: Kysely + D1Dialect.
// 본 함수는 요청마다 호출된다 (Worker isolate 안에서 가벼움).
export function createAuth(env: Env) {
  const db = new Kysely<Record<string, never>>({
    dialect: new D1Dialect({ database: env.DB }),
  });

  const options: BetterAuthOptions = {
    database: {
      db,
      type: "sqlite",
    },
    secondaryStorage: {
      get: async (key) => {
        const value = await env.AUTH_KV.get(key);
        return value;
      },
      set: async (key, value, ttl) => {
        await env.AUTH_KV.put(key, value, ttl ? { expirationTtl: ttl } : {});
      },
      delete: async (key) => {
        await env.AUTH_KV.delete(key);
      },
    },
    secret: env.AUTH_SECRET,
    baseURL: env.API_BASE_URL,
    basePath: "/api/auth",
    trustedOrigins: [env.WEB_ORIGIN],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    advanced: {
      // Web(localhost:5173) ↔ API(localhost:8787) cross-origin + 향후
      // 분리 도메인 배포 둘 다 커버. localhost에 한해 브라우저가 HTTP
      // 에서도 Secure 쿠키 허용.
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
    },
    plugins: [bearer()],
  };

  return betterAuth(options);
}

export type Auth = ReturnType<typeof createAuth>;
```

핵심 결정:
- **`createAuth(env)`는 요청마다 호출** — Workers는 요청 간 글로벌 상태가 모듈 캐시 수준에만 살아 있고 env binding은 요청 객체에 묶여 들어옴. 매 요청마다 새 instance를 만드는 게 자연스럽고 비용 무시할 수준.
- **`basePath: "/api/auth"`** — Hono에서 같은 경로로 마운트. Google Cloud redirect URI는 이 경로 기준(`http://localhost:8787/api/auth/callback/google`).
- **`trustedOrigins`** — CORS · CSRF 양쪽에서 사용. 환경별 origin은 vars로 주입.
- **`bearer` plugin** — 모바일(Expo)을 위한 Authorization 헤더 transport 지원. 같은 session 행을 쿠키든 헤더든 둘 다 인증.
- **`SameSite=None; Secure`** — cross-origin 쿠키 전송에 필수. better-auth 기본은 `Lax`라 명시적 override.

- [ ] **Step 2: 의존 타입 추가 (Env 확장 예고)**

`apps/api/src/index.ts`의 `Env` 타입에 다음 필드를 추가해야 함. 본 step은 다음 태스크에서 실제 변경하지만, auth.ts가 컴파일 가능하려면 미리 import 가능해야 함. 따라서 본 task의 typecheck는 다음 task 완료 후에 한 번에 확인.

(주의: typecheck를 지금 돌리면 실패한다. Task 4 끝나고 함께 확인.)

---

## Task 4: API — `Env` 확장 + Hono 마운트 (TDD)

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

### Step 1: failing test 작성 (index.test.ts)

`apps/api/src/index.test.ts` 전체를 다음으로 교체:

```ts
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
```

Run: `bun run --filter @pourover/api test:run`
Expected: FAIL — `Env` 타입에 새 필드가 없고, `/api/auth/*`가 마운트 안 됨, CORS 헤더 안 붙음. (그리고 auth.ts의 `Env` import도 컴파일 실패.)

### Step 2: index.ts 갱신 (GREEN)

`apps/api/src/index.ts` 전체를 다음으로 교체:

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";

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
    allowMethods: ["GET", "POST", "OPTIONS"],
  })(c, next),
);

// better-auth가 자체적으로 /api/auth/* 하위 모든 라우트(sign-in/callback/sign-out/get-session 등)를 처리.
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

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
```

핵심 결정:
- **CORS는 `/api/*` 하위 전체**에 — 향후 `/api/log` 등도 같은 정책 적용.
- **`cors()`는 `c.env.WEB_ORIGIN`을 즉시 평가**해야 하므로 미들웨어 팩토리 호출을 `(c, next) =>` 안에 둠 (factory pattern).
- **`app.on(["GET", "POST"], "/api/auth/*", ...)`** — better-auth 모든 라우트 한 줄로 위임. 핸들러는 `Request` 받고 `Response` 반환하는 표준 fetch 시그니처.
- `KVNamespace`/`D1Database` 타입은 `@cloudflare/workers-types` 글로벌(이미 tsconfig types에 등록).

### Step 3: 테스트 통과 확인

Run: `bun run --filter @pourover/api test:run`
Expected: PASS — 5개 테스트 모두 통과.

만약 better-auth가 `/api/auth/get-session` 응답 형식을 정확히 `null` 대신 `{ session: null, user: null }` 등으로 반환하면, 테스트의 `expect(... ?? null).toBeNull()`이 그것까지 수용하는지 확인. 안 되면 응답 형식을 inspect해서 테스트만 조정 (better-auth 구현은 유지).

### Step 4: 전체 typecheck/test 회귀 확인

Run: `bun run typecheck && bun run test:run`
Expected: 4 워크스페이스 전부 통과.

---

## Task 5: API — `src/auth.test.ts` (config 인스턴스화 smoke test)

**Files:**
- Create: `apps/api/src/auth.test.ts`

- [ ] **Step 1: smoke test 작성**

```ts
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
```

이 테스트는 OAuth dance를 모킹하지 않는다 — better-auth 객체가 정상 구성되고 handler가 호출 가능한지만 확인하는 smoke. 깊은 동작 검증은 index.test.ts의 통합 테스트가 맡음.

- [ ] **Step 2: PASS 확인**

Run: `bun run --filter @pourover/api test:run`
Expected: 7개 테스트(healthz 3 + auth route 2 + auth smoke 2) 모두 PASS.

---

## Task 6: Web — auth fetch 헬퍼

**Files:**
- Create: `apps/web/src/features/auth/api.ts`
- Create: `apps/web/src/features/auth/api.test.ts`

### Step 1: api.ts

```ts
// better-auth client 흐름:
// - 로그인: 브라우저를 /api/auth/sign-in/social?provider=google&callbackURL=... 로 이동
// - 세션 조회: GET /api/auth/get-session (credentials: include)
// - 로그아웃: POST /api/auth/sign-out
//
// API_BASE는 빌드 시 Vite env로 주입.

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type Session = {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image?: string | null;
  };
  readonly session: {
    readonly id: string;
    readonly expiresAt: string;
  };
} | null;

export async function getSession(): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/auth/get-session`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as Session | { user: null };
  if (!body || !("user" in body) || body.user == null) return null;
  return body as Session;
}

export function googleSignInUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    provider: "google",
    callbackURL: callbackUrl,
  });
  return `${API_BASE}/api/auth/sign-in/social?${params.toString()}`;
}

export async function signOut(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}
```

### Step 2: api.test.ts

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, googleSignInUrl, signOut } from "./api";

const fetchMock = vi.fn();
let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getSession", () => {
  it("returns null when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns null when body has no user", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null }), { status: 200 }),
    );
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns the session when user is present", async () => {
    const payload = {
      user: { id: "u1", email: "a@b.com", name: "A" },
      session: { id: "s1", expiresAt: "2026-06-01T00:00:00Z" },
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const session = await getSession();
    expect(session?.user.email).toBe("a@b.com");
  });

  it("sends credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    await getSession();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
    });
  });
});

describe("googleSignInUrl", () => {
  it("builds the correct URL with provider and encoded callbackURL", () => {
    const url = googleSignInUrl("http://localhost:5173/?logged-in=1");
    expect(url).toContain("/api/auth/sign-in/social");
    expect(url).toContain("provider=google");
    expect(url).toContain(
      `callbackURL=${encodeURIComponent("http://localhost:5173/?logged-in=1")}`,
    );
  });
});

describe("signOut", () => {
  it("POSTs with credentials: include", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await signOut();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });
});
```

### Step 3: 테스트 통과 확인

Run: `bun run --filter @pourover/web test:run`
Expected: 새 7개 테스트 PASS + 기존 121 PASS = 128 PASS.

---

## Task 7: Web — `useSession` 훅

**Files:**
- Create: `apps/web/src/features/auth/useSession.ts`

- [ ] **Step 1: 훅 작성**

```ts
import { useEffect, useState } from "react";
import { getSession, type Session } from "./api";

type State =
  | { readonly status: "loading"; readonly session: null }
  | { readonly status: "loaded"; readonly session: Session };

export function useSession(): State {
  const [state, setState] = useState<State>({
    status: "loading",
    session: null,
  });

  useEffect(() => {
    let alive = true;
    void getSession().then((session) => {
      if (!alive) return;
      setState({ status: "loaded", session });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
```

훅은 의도적으로 단순. 전역 state 라이브러리 없음 — 본 PR에서는 WallScreen 한 곳에서만 쓰니까 충분.

- [ ] **Step 2: typecheck**

Run: `bun run --filter @pourover/web typecheck`
Expected: 통과.

---

## Task 8: Web — `LoginPill` 컴포넌트

**Files:**
- Create: `apps/web/src/features/auth/LoginPill.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
import { googleSignInUrl, signOut, type Session } from "./api";
import { useSession } from "./useSession";

export function LoginPill() {
  const { status, session } = useSession();

  if (status === "loading") {
    return (
      <div className="text-body-sm text-text-secondary" aria-live="polite">
        세션 확인 중…
      </div>
    );
  }

  if (session == null) {
    return <SignInButton />;
  }

  return <SignedIn session={session} />;
}

function SignInButton() {
  const callbackUrl = window.location.href;
  return (
    <a
      href={googleSignInUrl(callbackUrl)}
      className="inline-flex items-center gap-2 rounded-full bg-surface-strong px-4 py-2 text-body-sm text-text-primary shadow-sm hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      Google 계정으로 로그인
    </a>
  );
}

function SignedIn({ session }: { readonly session: NonNullable<Session> }) {
  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="inline-flex items-center gap-3">
      <span className="text-body-sm text-text-secondary">
        {session.user.name}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-body-sm text-text-secondary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        로그아웃
      </button>
    </div>
  );
}
```

스타일은 기존 디자인 토큰(`text-body-sm`, `text-text-secondary`, `bg-surface-strong`, `focus-visible:ring-focus`)을 그대로 사용. 새 토큰 추가 없음.

- [ ] **Step 2: typecheck**

Run: `bun run --filter @pourover/web typecheck`
Expected: 통과.

---

## Task 9: Web — WallScreen에 LoginPill 배치

**Files:**
- Modify: `apps/web/src/features/wall/WallScreen.tsx`

- [ ] **Step 1: import 추가**

기존 import 블록에 추가:
```ts
import { LoginPill } from "@/features/auth/LoginPill";
```

- [ ] **Step 2: header 영역에 LoginPill 추가**

`<header className="text-center w-full px-5 pt-16">` 바로 위에 다음 한 줄 추가 (전체 컨테이너 div 안 첫 자식으로):

```tsx
<div className="flex justify-end px-5 pt-4">
  <LoginPill />
</div>
```

(헤더 상단 right-align. 모바일 safe area는 기존 `pt-16`이 충분히 흡수.)

- [ ] **Step 3: typecheck + 빌드 확인**

Run: `bun run --filter @pourover/web typecheck && bun run --filter @pourover/web build`
Expected: 둘 다 성공.

(테스트 회귀: 기존 WallScreen 테스트가 깨질 수 있다 — `useSession`이 fetch를 호출하기 때문. 깨지면 vitest setup에서 fetch를 모킹하거나, WallScreen 테스트에서 LoginPill을 모킹. 가장 단순한 방법: WallScreen 테스트 파일 안에서 `vi.mock("@/features/auth/LoginPill")`로 무력화.)

- [ ] **Step 4: WallScreen 테스트 회귀 대응**

Run: `bun run --filter @pourover/web test:run`
실패가 LoginPill 관련(`window.fetch`, `useSession`, `act` 경고 등)이라면:

해당 테스트 파일(`apps/web/src/features/wall/WallScreen.test.tsx` 류) 최상단에 다음 추가:

```ts
vi.mock("@/features/auth/LoginPill", () => ({
  LoginPill: () => null,
}));
```

WallScreen 자체 동작 테스트는 auth와 무관하므로 모킹이 적절.

- [ ] **Step 5: 전체 test:run 통과 확인**

Run: `bun run test:run`
Expected: 4 워크스페이스 전부 통과.

---

## Task 10: README — Pre-requisite 셋업 문서

**Files:**
- Modify: `apps/api/README.md`

- [ ] **Step 1: README의 "## D1 셋업" 섹션 위에 다음 섹션 삽입**

```markdown
## 인증 셋업 (better-auth + Google OAuth)

### 1. Google Cloud OAuth client

1. https://console.cloud.google.com/apis/credentials 접속
2. "Create Credentials" → "OAuth client ID" → Application type: "Web application"
3. Authorized redirect URIs에 추가:
   - `http://localhost:8787/api/auth/callback/google` (개발)
   - 프로덕션 URL은 배포 후 추가 (`https://<your-api-domain>/api/auth/callback/google`)
4. 발급된 `client_id`, `client_secret` 메모

### 2. KV namespace 생성

\`\`\`bash
cd apps/api
bunx wrangler kv namespace create pourover-auth-cache
\`\`\`

출력의 `id` UUID를 받아 `wrangler.jsonc`의 `kv_namespaces[0].id`
값(`"local-only-replace-before-deploy"`)을 그 UUID로 교체.

### 3. AUTH_SECRET 생성

\`\`\`bash
openssl rand -hex 32
\`\`\`

### 4. wrangler secret 등록 (프로덕션)

\`\`\`bash
cd apps/api
bunx wrangler secret put GOOGLE_CLIENT_ID
bunx wrangler secret put GOOGLE_CLIENT_SECRET
bunx wrangler secret put AUTH_SECRET
\`\`\`

### 5. 로컬 개발용 `.dev.vars`

`apps/api/.dev.vars` 파일 생성 (gitignored):

\`\`\`
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...
\`\`\`

### 6. (선택) 다른 origin 사용 시

기본은 web=localhost:5173, api=localhost:8787. 변경하려면 `wrangler.jsonc`의
`vars.WEB_ORIGIN`을 조정 + Google Cloud redirect URI도 같이 업데이트.

프로덕션은 `wrangler.jsonc`에 `env.production.vars`로 override:

\`\`\`jsonc
"env": {
  "production": {
    "vars": {
      "WEB_ORIGIN": "https://pourover.example.com",
      "API_BASE_URL": "https://pourover-api.example.com"
    }
  }
}
\`\`\`
```

(위 fenced block의 `\`\`\`` 백슬래시 escape는 plan 안에서의 표기일 뿐. 실제 README에는 일반 백틱 3개로 들어가야 함.)

- [ ] **Step 2: README의 "현재 상태:" 한 줄 갱신**

```diff
-현재 상태: **D1 스키마 + 헬스체크**. 인증·도메인 엔드포인트는 후속 이슈에서 붙는다.
+현재 상태: **D1 + better-auth(Google OAuth) + 헬스체크**. 도메인 엔드포인트는 후속 이슈.
```

- [ ] **Step 3: 후속 작업 섹션에서 #21 항목 제거**

```diff
 ## 후속 작업
 
-- `better-auth` + Google OAuth — issue #21
 - R2 presigned PUT + CF Images Transformations — issue #22
 - `POST /log`, `GET /log` 엔드포인트 — issue #23
 - CLAUDE.md 업데이트 — issue #24
```

- [ ] **Step 4: prettier 통과 확인**

Run: `bunx prettier --check apps/api/README.md apps/api/wrangler.jsonc`
Expected: 통과 (안 통과면 `--write` 후 재확인).

---

## Task 11: 로컬 검증 — 코드 레벨 (typecheck + test) 만

**Files:** (없음 — 실행만)

E2E OAuth dance 검증은 사용자가 Google Cloud 셋업 후 직접 수행 (Pre-requisite 항목 1번 완료가 필요하기 때문). 본 task는 코드 단의 회귀 확인까지만.

- [ ] **Step 1: 전체 typecheck**

Run: `bun run typecheck`
Expected: 4 워크스페이스 전부 통과.

- [ ] **Step 2: 전체 test:run**

Run: `bun run test:run`
Expected: 4 워크스페이스 전부 통과. 새로 추가된 테스트: api +4 (auth route 2 + auth smoke 2), web +7 (api 헬퍼 7).

- [ ] **Step 3: wrangler dev 부팅 smoke**

Run (백그라운드): `bun run --filter @pourover/api dev`
.dev.vars가 없으면 wrangler가 경고를 내겠지만 부팅은 함. healthz 호출:

Run: `curl -s http://localhost:8787/healthz`
Expected: `{"ok":true,"name":"@pourover/api","version":"0.0.0","db":"ok"}` (D1 로컬에 마이그레이션이 이미 적용돼 있어야 함 — 안 됐으면 #20 README의 마이그레이션 명령 참고).

Run: `curl -s http://localhost:8787/api/auth/get-session`
Expected: better-auth가 응답하는 JSON. 정확한 형식은 라이브러리 버전에 따라 다르지만 200 응답 (또는 `null` 본문).

종료: wrangler dev stop.

---

## Task 12: 커밋 (push/PR은 controller가 진행)

**Files:** (git)

- [ ] **Step 1: 변경 확인**

Run: `git status`
Expected (예시):
- New: `apps/api/src/auth.ts`, `apps/api/src/auth.test.ts`, `apps/web/src/features/auth/{api,api.test,useSession,LoginPill}.{ts,tsx}`
- Modified: `apps/api/{package.json, wrangler.jsonc, README.md, src/index.ts, src/index.test.ts}`, `apps/web/src/features/wall/WallScreen.tsx`, `package.json`(루트), `bun.lock`

- [ ] **Step 2: 커밋**

```bash
git add apps/api apps/web package.json bun.lock
git commit -m "$(cat <<'EOF'
feat(api): better-auth + Google OAuth 통합

#21. ADR 0001 후속 3/6. apps/api에 better-auth (Kysely + D1Dialect
adapter, KV secondary storage) 통합. Google OAuth provider 활성화.
mobile(Expo) 대비 bearer plugin 등록 — 같은 session 행을 쿠키와
Authorization 헤더 둘 다로 인증.

apps/web의 WallScreen에 "Google 계정으로 로그인" 진입 UI (LoginPill)
추가. useSession 훅 + fetch 헬퍼 + 단위 테스트.

CORS는 /api/* 전체에 적용, 쿠키는 SameSite=None; Secure로 cross-origin
지원. 모든 secret은 wrangler secret + .dev.vars로 분리, 저장소에 평문
없음. README에 Google Cloud OAuth client, KV namespace, AUTH_SECRET
생성·등록 절차 명시.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: 상태 확인**

Run: `git status && git log -1 --oneline`
Expected: working tree clean, 새 SHA.

---

## Self-Review

**Spec coverage (issue #21 acceptance criteria):**
1. ✅ 로컬에서 Google 로그인 → callback → 세션 쿠키 발급 → `/api/auth/get-session`이 사용자 정보 반환 — Task 4의 마운트 + Task 11 E2E 단계(사용자 수동). 코드 단으로는 모킹된 테스트로 검증.
2. ✅ 같은 Google 계정 재로그인 시 user 중복 없음 — better-auth 기본 동작(이메일 매칭 linking). 라이브러리 책임.
3. ✅ 로그아웃 시 세션 무효화, 보호 라우트 401 — Task 6의 signOut + better-auth 표준. 본 PR엔 보호 라우트가 아직 없어 부분 검증.
4. ✅ client_id/secret 저장소에 평문 없음 — Task 1/10 (vars vs secrets 명확 분리, .dev.vars gitignored).
5. ✅ apps/web 로그인 버튼 + 로그인 후 사용자 정보 표시 — Task 8/9.

**Out-of-scope 점검:**
- Apple OAuth: ❌ (의도적으로 안 함)
- 프로필 편집: ❌
- 라우트 가드: ❌ (LoginPill의 표시 전환만)
- ORM 결정: 부분적 — Kysely를 better-auth용으로 도입했지만 #23의 도메인 쿼리에서 어떻게 쓸지는 별건. 이번 PR에선 직접 쿼리 안 함.

**Placeholder scan:** 모든 코드 블록 실행 가능한 완전체. "적절한 에러 핸들링" 류 없음. `database_id`/KV `id` placeholder는 의도적 + README 명시.

**Type consistency:**
- `Env` (Task 4): DB, AUTH_KV, GOOGLE_CLIENT_ID/SECRET, AUTH_SECRET, WEB_ORIGIN, API_BASE_URL — auth.ts(Task 3)와 모든 호출 지점에서 같은 필드명 사용.
- `Session` 타입(Task 6): `user.id`, `user.email`, `user.name`, `user.image?` — better-auth 표준 user 모델과 일치(Task 5의 schema 컬럼).
- 라우트 경로 `/api/auth/*` (Task 4 마운트) + `basePath: "/api/auth"` (Task 3 auth config) + `/api/auth/callback/google` (Task 10 Google Cloud redirect URI) 모두 일치.

**한 가지 짚을 것:** `kysely-d1` 패키지의 정확한 export 시그니처 (`D1Dialect`)가 버전에 따라 다를 수 있음. 컴파일 실패 시 implementer는 해당 패키지 README를 확인해 import 경로 조정. 본 plan의 코드는 `kysely-d1` 0.3.x 기준.
