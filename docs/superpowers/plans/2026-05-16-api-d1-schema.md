# D1 초기 스키마 + 마이그레이션 인프라 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADR 0001 후속 2/6 — `apps/api`에 Cloudflare D1 바인딩 추가, `wrangler d1 migrations` 파이프라인 셋업, 첫 마이그레이션(`0001_init.sql`)으로 better-auth 4개 표준 테이블(`user`/`session`/`account`/`verification`)을 생성한다. 헬스체크가 D1을 한 번 touch하도록 확장. 도메인 테이블은 별도 후속 마이그레이션으로 분리.

**Architecture:** 마이그레이션은 forward-only(ADR D7), `wrangler d1 migrations apply <name> --local|--remote` 표준 명령으로 적용. better-auth는 본 PR에서 *설치하지 않는다* — v1.4.21 CLI dump 출력을 그대로 SQL 파일에 박아 #21에서 라이브러리 도입 시 schema 호환되도록 한다. 테이블/컬럼은 better-auth가 강제하는 camelCase + lowercase 단수 컨벤션을 따른다(D1 SQLite quoted identifier).

**Tech Stack:** Cloudflare D1 (SQLite), wrangler 3, Hono, Vitest 2. 새 의존성 없음.

---

## File Structure

**Modify:**
- `apps/api/wrangler.jsonc` — `d1_databases` 바인딩 추가
- `apps/api/src/index.ts` — `Env`에 `DB: D1Database` 추가, healthz가 `SELECT 1 AS ok` 실행
- `apps/api/src/index.test.ts` — stub D1 binding을 `app.request`의 env로 주입, 성공/실패 두 케이스 검증
- `apps/api/README.md` — D1 셋업/마이그레이션 섹션 추가

**Create:**
- `apps/api/migrations/0001_init.sql` — 4개 테이블 + 인덱스. better-auth CLI v1.4.21 dump 그대로.

각 파일 책임:
- `wrangler.jsonc` — Worker 매니페스트(바인딩 선언)
- `migrations/*.sql` — 스키마 변경 단방향 단위
- `src/index.ts` — HTTP 라우팅, D1 사용
- `src/index.test.ts` — 라우팅·D1 통합 동작 검증
- `README.md` — 사람용 셋업 문서

마이그레이션 SQL은 단일 파일로 충분(5개 테이블, 단일 트랜잭션 가능). 향후 추가 변경은 `0002_*.sql`, `0003_*.sql`로 누적.

---

## Task 1: D1 binding을 wrangler.jsonc에 추가

**Files:**
- Modify: `apps/api/wrangler.jsonc`

- [ ] **Step 1: wrangler.jsonc 수정**

기존 파일을 다음으로 교체:

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
  ]
}
```

- `binding`: Worker 코드에서 `env.DB`로 접근.
- `database_name`: D1 인스턴스 이름(CF dashboard에서 보이는 이름).
- `database_id`: **로컬 모드는 무시되는 값**. 프로덕션 배포 전 `wrangler d1 create pourover-api` 출력으로 사용자가 교체. 명시적 placeholder 문자열을 둬서 실수로 그대로 배포하면 wrangler 단계에서 인지 가능.
- `migrations_dir`: `wrangler d1 migrations apply`가 SQL 파일을 찾는 경로.

- [ ] **Step 2: typecheck 통과 확인 (config-only 변경)**

Run: `bun run --filter @pourover/api typecheck`
Expected: exit 0.

---

## Task 2: 마이그레이션 디렉토리 + 0001_init.sql 작성

**Files:**
- Create: `apps/api/migrations/0001_init.sql`

- [ ] **Step 1: 디렉토리 + SQL 파일 생성**

Run: `mkdir -p apps/api/migrations`

`apps/api/migrations/0001_init.sql`:

```sql
-- Initial schema for @pourover/api.
-- better-auth v1.4.21 표준 4개 테이블 전용. 도메인 테이블은 후속 마이그레이션에서.
-- camelCase 컬럼 + lowercase 단수 테이블명 (better-auth 컨벤션).
-- 모든 식별자 quoted — SQLite에서 case-sensitive 보존.

CREATE TABLE "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
```

**중요한 컨벤션 결정** (subagent가 임의로 바꾸지 말 것):
- 컬럼은 camelCase, 테이블은 lowercase 단수. better-auth가 이 형태를 기본으로 강제하며 override하려면 모든 필드 매핑이 필요해 비효율적.
- `createdAt`/`updatedAt`/`expiresAt`은 TEXT(ISO 8601 string)로 저장. SQLite에는 진짜 datetime 타입이 없고, better-auth가 ISO string으로 직렬화.
- `emailVerified`는 INTEGER(0/1). SQLite boolean은 INTEGER로 표현.
- 외래키는 모두 `ON DELETE CASCADE` — 사용자 삭제 시 모든 종속 데이터 함께 제거.
- 도메인 테이블(`brewLogEntry` 등)은 본 PR에 포함하지 않는다 — 후속 마이그레이션으로 분리(#23). "쓰지 않는 스키마는 만들지 않는다" 원칙.

- [ ] **Step 2: 로컬 마이그레이션 적용**

Run: `cd apps/api && bunx wrangler d1 migrations apply pourover-api --local`
Expected: 출력에 `0001_init.sql` 적용 메시지 + "Migrations applied!" 류 라인. 에러 없음.

(첫 실행 시 wrangler가 `.wrangler/state/v3/d1/`에 로컬 SQLite 파일을 만든다.)

- [ ] **Step 3: 멱등성 확인**

Run: `cd apps/api && bunx wrangler d1 migrations apply pourover-api --local`
Expected: "No migrations to apply!" 또는 동등한 메시지. 같은 마이그레이션이 두 번 적용되지 않음.

- [ ] **Step 4: 테이블 존재 확인**

Run: `cd apps/api && bunx wrangler d1 execute pourover-api --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`
Expected: 출력에 `account`, `d1_migrations`, `session`, `user`, `verification` 5개 이름이 보임 (`d1_migrations`는 wrangler가 자동 생성).

---

## Task 3: healthz용 D1 touch — failing test (TDD RED)

**Files:**
- Modify: `apps/api/src/index.test.ts`

- [ ] **Step 1: 테스트 파일 전체를 다음으로 교체**

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
```

- 모든 테스트가 `makeEnv()`로 stub D1 binding을 주입. `vi.fn`으로 호출 검증 가능.
- 성공 케이스 + 호출 검증 + 실패 케이스 + 404 — 4개 테스트.
- `Env` 타입은 다음 태스크에서 `src/index.ts`가 export한다 (현재는 컴파일 실패).

- [ ] **Step 2: 테스트 실패 확인 (RED)**

Run: `bun run --filter @pourover/api test:run`
Expected: FAIL. `Env`가 `Record<string, never>`라 `DB` 접근이 타입 에러. 런타임에선 `env.DB`가 undefined라 throw.

---

## Task 4: healthz의 D1 touch 구현 (TDD GREEN)

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: index.ts 전체를 다음으로 교체**

```ts
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
```

- `D1Database` 타입은 `@cloudflare/workers-types`가 글로벌로 제공 (이미 dev dep). 별도 import 불필요.
- 정상 행이 안 오거나(`row?.ok !== 1`) 예외 발생 시 503 + `db: "fail"`.
- 정상 경로에서만 200.

- [ ] **Step 2: 테스트 통과 확인 (GREEN)**

Run: `bun run --filter @pourover/api test:run`
Expected: PASS — 4개 테스트 모두 통과.

- [ ] **Step 3: typecheck 통과 확인**

Run: `bun run --filter @pourover/api typecheck`
Expected: exit 0.

- [ ] **Step 4: 전체 워크스페이스 회귀 확인**

Run: `bun run typecheck && bun run test:run`
Expected: 모든 워크스페이스(api/web/domain/webhook) 통과.

---

## Task 5: 로컬 wrangler dev로 실제 D1 통합 검증

**Files:** (없음 — 실행 검증만)

- [ ] **Step 1: wrangler dev 백그라운드 실행**

Run (백그라운드): `bun run --filter @pourover/api dev`
Expected: "Ready on http://localhost:8787" 류 라인 + "Your worker has access to the following bindings: ... DB (pourover-api, local)" 류 라인.

- [ ] **Step 2: healthz 호출**

Run: `curl -s http://localhost:8787/healthz`
Expected: `{"ok":true,"name":"@pourover/api","version":"0.0.0","db":"ok"}`

- [ ] **Step 3: 백그라운드 wrangler dev 종료**

검증 끝나면 stop. 이후 단계는 dev 안 띄움.

---

## Task 6: README에 D1 셋업/마이그레이션 섹션 추가

**Files:**
- Modify: `apps/api/README.md`

- [ ] **Step 1: README 전체를 다음으로 교체**

```markdown
# @pourover/api

영속 데이터(브루 로그, 사용자, 사진)를 다루는 Cloudflare Worker. Hono 위에서
동작. 본 워크스페이스는 [ADR 0001](../../docs/adr/0001-backend-infrastructure.md)의
결정을 구현한다.

현재 상태: **D1 스키마 + 헬스체크**. 인증·도메인 엔드포인트는 후속 이슈에서 붙는다.

## 로컬 개발

\`\`\`bash
bun run --filter @pourover/api dev       # wrangler dev (로컬 워커)
bun run --filter @pourover/api test:run  # vitest 1회
bun run --filter @pourover/api typecheck
\`\`\`

또는 루트에서:

\`\`\`bash
bun run dev:api      # apps/api dev
bun run typecheck    # 전체 워크스페이스 typecheck
bun run test:run     # 전체 워크스페이스 테스트
\`\`\`

헬스체크: `curl http://localhost:8787/healthz`
→ `{"ok":true,"name":"@pourover/api","version":"0.0.0","db":"ok"}`

D1 연결 실패 시 503 + `db: "fail"`.

## D1 셋업

### 처음 한 번만 (프로덕션 DB 생성)

\`\`\`bash
cd apps/api
bunx wrangler d1 create pourover-api
\`\`\`

출력에서 `database_id` UUID를 받아 `apps/api/wrangler.jsonc`의 `d1_databases[0].database_id`
값(`"local-only-replace-before-deploy"`)을 그 UUID로 교체.

### 마이그레이션 적용

\`\`\`bash
cd apps/api

# 로컬 (개발용 SQLite, .wrangler/state/v3/d1/ 안)
bunx wrangler d1 migrations apply pourover-api --local

# 프로덕션 (Cloudflare D1)
bunx wrangler d1 migrations apply pourover-api --remote
\`\`\`

멱등 — 이미 적용된 마이그레이션은 다시 실행되지 않는다.

### 새 마이그레이션 추가

- 파일명: `apps/api/migrations/NNNN_<slug>.sql` (4자리 zero-pad)
- **Forward-only.** down 스크립트 작성하지 않는다. 잘못된 변경은 다음 forward 마이그레이션으로 되돌린다 (ADR D7).
- PR 본문에 마이그레이션 파일을 명시한다.

### 로컬 DB 검사

\`\`\`bash
cd apps/api

# 테이블 목록
bunx wrangler d1 execute pourover-api --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 임의 쿼리
bunx wrangler d1 execute pourover-api --local \
  --command "SELECT count(*) FROM user;"
\`\`\`

## 배포

\`\`\`bash
bun run deploy:api
\`\`\`

전제: `wrangler.jsonc`의 `database_id`가 실제 UUID로 교체되어 있고, `wrangler secret`으로 필요한 시크릿(추후 이슈)이 등록되어 있을 것.

## 후속 작업

- `better-auth` + Google OAuth — issue #21
- R2 presigned PUT + CF Images Transformations — issue #22
- `POST /log`, `GET /log` 엔드포인트 — issue #23
- CLAUDE.md 업데이트 — issue #24

## 디렉토리 구조

\`\`\`
apps/api/
  src/
    index.ts        Hono 진입점 (/healthz, D1 touch)
    index.test.ts   handler 테스트 (stub D1)
  migrations/
    0001_init.sql   user/session/account/verification (better-auth 표준)
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
\`\`\`
```

**중요**: 위 마지막 디렉토리 구조 등의 코드 펜스는 \`\`\` (백틱 3개) 그대로 들어가야 한다. 본 plan에서 escape용 백슬래시를 붙인 건 README가 들어 있는 마크다운 안에서 코드 블록을 안전하게 표현하기 위함. 실제 파일에 백슬래시가 들어가면 안 된다.

- [ ] **Step 2: prettier 통과 확인**

Run: `bunx prettier --check apps/api/README.md apps/api/wrangler.jsonc`
Expected: 둘 다 통과. 안 통과면 `bunx prettier --write apps/api/README.md apps/api/wrangler.jsonc` 후 재확인.

(루트 `format:check`는 #19 PR 시점에 이미 63개 pre-existing drift가 있었으므로 본 PR도 새로 추가/수정한 파일만 검사.)

---

## Task 7: 커밋

**Files:** (없음 — git 작업)

- [ ] **Step 1: 변경 파일 확인**

Run: `git status`
Expected:
- New: `apps/api/migrations/0001_init.sql`
- Modified: `apps/api/wrangler.jsonc`, `apps/api/src/index.ts`, `apps/api/src/index.test.ts`, `apps/api/README.md`
- Untracked but ignored: `apps/api/.wrangler/` (로컬 SQLite — 기존 gitignore의 `*.local`이 잡지 않으면 이 PR에서 `.wrangler/`를 .gitignore에 추가)

- [ ] **Step 2: `.wrangler/` 디렉토리 처리**

Run: `git status --ignored apps/api/.wrangler 2>&1 | head -5`

`.wrangler/`가 untracked로 보이면 (현재 .gitignore에 항목 없음) — 다음을 추가:

루트 `.gitignore`에 `apps/webhook` 섹션 또는 별도 위치에 다음 한 줄을 적절히 추가:
```
# Cloudflare Wrangler local state
.wrangler/
```

(이미 webhook이 dev 한 번 돌면 똑같은 디렉토리를 만들었을 가능성 있음 — `git ls-files apps/webhook | grep wrangler`로 트래킹 여부 확인. webhook이 이미 무시 처리되어 있다면 그 패턴 재사용.)

- [ ] **Step 3: 커밋**

```bash
git add apps/api package.json bun.lock .gitignore
git commit -m "$(cat <<'EOF'
feat(api): D1 binding + 초기 마이그레이션

#20. ADR 0001 후속 2/6. better-auth v1.4.21 표준 4개 테이블
(user/session/account/verification)을
0001_init.sql로 생성. wrangler.jsonc에 D1 바인딩 추가, healthz가
SELECT 1로 D1을 한 번 touch. 실패 시 503 + db: "fail".

better-auth 자체는 본 PR에 도입하지 않는다 — 스키마만 호환되게
박아두고 라이브러리는 #21에서 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: 커밋 후 상태 확인**

Run: `git status && git log -1 --oneline`
Expected: working tree clean, 새 커밋 SHA 출력.

---

## Self-Review

**Spec coverage (issue #20 acceptance criteria):**
1. ✅ `wrangler d1 create pourover-api` → wrangler.jsonc binding 반영 — Task 1 + Task 6의 README가 사용자에게 교체 절차 안내.
2. ✅ `wrangler d1 migrations apply pourover-api --local`이 4개 테이블 + idempotent — Task 2 Step 2-4 (실제로는 5개 테이블 + d1_migrations 메타).
3. ✅ `wrangler dev`에서 헬스체크가 D1 touch — Task 4 + Task 5.
4. ✅ Forward-only, down 스크립트 없음 — `0001_init.sql`만 작성, README의 정책 섹션 명시.
5. ✅ README에 로컬·프로덕션 적용 명령 명시 — Task 6의 "D1 셋업" 섹션.

**Out-of-scope 점검** (이슈가 명시적으로 제외한 항목들):
- better-auth 통합 — 본 PR은 의존성 추가 안 함, 스키마만 호환되게.
- ORM(Drizzle/Kysely) — 본 PR은 raw `c.env.DB.prepare(...)` 사용.
- CI 자동 마이그레이션 — README에 수동 흐름만.

**Placeholder scan:** 모든 SQL/코드 블록은 실행 가능한 완전체. "적절한 에러 핸들링" 류 없음. `database_id`의 placeholder는 의도적이며 README가 사용자에게 교체 절차를 명시.

**Type consistency:**
- `Env` 타입: Task 4에서 `{ readonly DB: D1Database }`로 정의, Task 3 테스트가 `Env["DB"]`로 참조. 일관.
- 테이블/컬럼명: SQL 파일(Task 2) — quoted camelCase 컬럼, lowercase 단수 테이블 (better-auth 컨벤션 따름). 본 PR 안에서 다른 곳에서 컬럼명을 참조하지 않으므로 drift 없음.
- 마이그레이션 파일명 패턴: README와 Task 2 모두 `NNNN_<slug>.sql` 일치.

**한 가지 짚을 것:** wrangler 3.114.17이 compat date 2026-05-16에 대해 경고를 내지만(workerd 번들 max가 2025-07-18) D1 binding 자체는 정상 동작. 본 PR에서 wrangler upgrade는 별도 작업이라 다루지 않음.
