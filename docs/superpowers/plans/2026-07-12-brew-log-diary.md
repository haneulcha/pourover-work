# 커피 로그 일기 (#14 v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 유저가 브루를 완료하면 그 세션이 자동으로 계정에 영속 저장되고, 나중에 일기처럼 목록·상세로 다시 볼 수 있게 한다.

**Architecture:** 도메인에 Recipe JSON 직렬화(브랜드 보존)를 추가하고, `apps/api`에 D1 백엔드 로그 엔드포인트(세션 가드 + 멱등 저장)를 붙인다. 웹은 CompleteScreen에서 완료 시 자동 저장 + 선택 메모, 새 diary 화면에서 조회/삭제. 저장 id는 클라이언트 생성 UUID라 재진입·재시도·오프라인이 멱등.

**Tech Stack:** Bun workspaces · TypeScript(strict, `noUncheckedIndexedAccess`) · Cloudflare Workers + Hono + D1 · better-auth · Vitest 2 · `@cloudflare/vitest-pool-workers`(신규, 실 D1 검증) · React 19 + Tailwind 3.

## Global Constraints

- **도메인 순수**: `packages/domain/**`에 React/DOM/localStorage/Node-only API 금지. 순수 함수만. (CLAUDE.md Principle 1)
- **Branded types 강제**: `Grams/Celsius/Seconds/Ratio`는 `@pourover/domain/units`의 `g/c/s/ratio`로만 생성. `as Grams` 직접 캐스팅 금지. (Principle 2)
- **Design token 단일 출처**: 새 UI의 색·스페이싱·폰트·반경은 하드코딩 금지, 기존 `text-*/bg-*/rounded-*` 토큰 클래스만. (Principle 4)
- **API 타입 경계**: 요청/응답 DTO는 `apps/api/src/`에 둔다. 도메인에 끌어들이지 않는다. 웹은 필요한 최소 타입을 자체 복제(ADR D5, 아직 `api-contract` 패키지 만들지 않음).
- **마이그레이션**: `apps/api/migrations/NNNN_<slug>.sql`, forward-only, down 스크립트 금지.
- **테이블/컬럼 컨벤션**: better-auth 스타일 — 테이블명 lowercase 단수 quoted, 컬럼 camelCase quoted.
- **커밋 트레일러**: 모든 커밋 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **작업 브랜치**: `feat/brew-log-diary` (이미 존재, 스펙 커밋 포함).

**참조 스펙**: `docs/superpowers/specs/2026-07-12-brew-log-diary-design.md` (D1~D8 결정값 포함).

---

## 파일 구조

**PR 1 — 도메인 직렬화**
- Create `packages/domain/src/serialize.ts` — `recipeToJSON` / `recipeFromJSON`
- Create `packages/domain/src/serialize.test.ts`
- Modify `packages/domain/package.json` — exports에 `"./serialize"` 추가

**PR 2 — D1 스키마 + API**
- Create `apps/api/migrations/0002_brew_log.sql`
- Create `apps/api/src/log.ts` — 라우터·핸들러·검증·세션 가드
- Modify `apps/api/src/index.ts` — 라우트 마운트 + CORS에 PATCH/DELETE 추가
- Create `apps/api/test/apply-migrations.ts` — pool-workers 셋업
- Create `apps/api/vitest.workspace.ts` — node 유닛 + workers 통합 2 프로젝트
- Modify `apps/api/vitest.config.ts` — node 유닛 프로젝트 전용으로 정리
- Create `apps/api/test/log.integration.test.ts`
- Modify `apps/api/package.json` — devDep 추가

**PR 3 — 웹 저장 경로**
- Create `apps/web/src/features/diary/api.ts` — fetch 래퍼 + DTO 타입
- Create `apps/web/src/features/diary/localStash.ts` — 실패 시 조용한 보관
- Create `apps/web/src/features/complete/BrewSummary.tsx` — 요약 카드 추출
- Modify `apps/web/src/features/complete/CompleteScreen.tsx` — BrewSummary 사용 + 자동저장/메모/속삭임
- Create `apps/web/src/features/complete/CompleteScreen.test.tsx`

**PR 4 — 웹 일기**
- Modify `apps/web/src/features/app/state.ts` — `"diary"` screen + `selectedLogId`
- Create `apps/web/src/features/diary/DiaryScreen.tsx` — 목록
- Create `apps/web/src/features/diary/DiaryDetailScreen.tsx` — 상세(메모 편집 + 삭제)
- Create `apps/web/src/features/diary/DiaryLink.tsx` — Wall의 "내 기록" 진입(세션 인지)
- Modify `apps/web/src/features/wall/WallScreen.tsx` — DiaryLink 배치 + `onOpenDiary`
- Modify `apps/web/src/features/app/AppRoot.tsx` — diary 라우팅
- Create `apps/web/src/features/diary/DiaryScreen.test.tsx`

---

## PR 1 — 도메인 Recipe 직렬화

### Task 1: `recipeToJSON` / `recipeFromJSON`

**Files:**
- Create: `packages/domain/src/serialize.ts`
- Test: `packages/domain/src/serialize.test.ts`
- Modify: `packages/domain/package.json`

**Interfaces:**
- Consumes: `Recipe`, `Pour` from `./types`; `g/c/s/ratio` from `./units`.
- Produces:
  - `recipeToJSON(recipe: Recipe): string`
  - `recipeFromJSON(json: string): Recipe` — 브랜드 재부여, custom 메서드 포함. 파싱 실패/필드 누락 시 `throw new Error`.

- [ ] **Step 1: exports 등록**

`packages/domain/package.json`의 `exports`에 한 줄 추가(마지막 항목 뒤, 쉼표 주의):

```json
    "./methods/*": "./src/methods/*.ts",
    "./serialize": "./src/serialize.ts"
```

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/domain/src/serialize.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { recipeFromJSON, recipeToJSON } from "./serialize";
import { brewMethods } from "./methods";
import { g } from "./units";

const sample = brewMethods.kasuya_4_6.compute({
  method: "kasuya_4_6",
  dripper: "v60",
  coffee: g(20),
  roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
});

describe("recipe serialize round-trip", () => {
  it("preserves all fields through JSON round-trip", () => {
    const back = recipeFromJSON(recipeToJSON(sample));
    expect(back).toEqual(sample);
  });

  it("re-branded numeric values survive (totalWater === sum of pours)", () => {
    const back = recipeFromJSON(recipeToJSON(sample));
    const sum = back.pours.reduce((acc, p) => acc + p.pourAmount, 0);
    expect(sum).toBe(back.totalWater);
    expect(back.pours[0]!.atSec).toBe(0);
  });

  it("handles a custom-method recipe snapshot", () => {
    const custom = { ...sample, method: "custom" as const };
    expect(recipeFromJSON(recipeToJSON(custom)).method).toBe("custom");
  });

  it("throws on malformed json", () => {
    expect(() => recipeFromJSON("{not json")).toThrow();
    expect(() => recipeFromJSON('{"method":"v60"}')).toThrow();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `bun run --filter @pourover/domain test:run serialize`
Expected: FAIL — `recipeFromJSON`/`recipeToJSON` 미정의.

- [ ] **Step 4: 최소 구현**

`packages/domain/src/serialize.ts`:

```typescript
import type { Pour, Recipe } from "./types";
import { c, g, ratio, s } from "./units";

// Recipe는 branded number들을 담는다. JSON.stringify는 브랜드를 벗겨
// 평범한 number로 만들므로, 역직렬화 시 도메인 생성자로 재부여해
// Principle 2(branded types 강제)를 지킨다.

export function recipeToJSON(recipe: Recipe): string {
  return JSON.stringify(recipe);
}

export function recipeFromJSON(json: string): Recipe {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (
    typeof raw.method !== "string" ||
    typeof raw.dripper !== "string" ||
    !Array.isArray(raw.pours)
  ) {
    throw new Error("recipeFromJSON: malformed recipe payload");
  }

  const pours: Pour[] = (raw.pours as Record<string, unknown>[]).map((p) => ({
    index: p.index as number,
    atSec: s(p.atSec as number),
    pourAmount: g(p.pourAmount as number),
    cumulativeWater: g(p.cumulativeWater as number),
    ...(p.label === "bloom" ? { label: "bloom" as const } : {}),
  }));

  return {
    method: raw.method as Recipe["method"],
    dripper: raw.dripper as Recipe["dripper"],
    coffee: g(raw.coffee as number),
    totalWater: g(raw.totalWater as number),
    ratio: ratio(raw.ratio as number),
    temperature: c(raw.temperature as number),
    pours,
    totalTimeSec: s(raw.totalTimeSec as number),
    grindHint: raw.grindHint as Recipe["grindHint"],
    notes: (raw.notes as string[]) ?? [],
  };
}
```

- [ ] **Step 5: 테스트 통과 확인 + 타입체크**

Run: `bun run --filter @pourover/domain test:run serialize && bun run --filter @pourover/domain typecheck`
Expected: PASS, 타입 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add packages/domain/src/serialize.ts packages/domain/src/serialize.test.ts packages/domain/package.json
git commit -m "feat(domain): Recipe JSON 직렬화 (브랜드 보존)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## PR 2 — D1 스키마 + 로그 API

### Task 2: D1 테스트 하베스트 (pool-workers)

이 태스크는 **실 D1에서 도는 통합 테스트 인프라**를 세운다. 기존 유닛 테스트(목킹)는 node 프로젝트로 유지하고, D1 통합 테스트는 workers 프로젝트로 분리한다. pool-workers는 버전 민감하므로 **스모크 테스트 그린을 게이트로** 삼는다.

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/vitest.config.ts`
- Create: `apps/api/vitest.workspace.ts`
- Create: `apps/api/test/apply-migrations.ts`
- Create: `apps/api/test/smoke.integration.test.ts`

**Interfaces:**
- Produces: workers 프로젝트에서 `import { env, applyD1Migrations } from "cloudflare:test"`로 실 `env.DB`(D1) 접근. 통합 테스트 파일 글롭 `test/**/*.integration.test.ts`.

- [ ] **Step 1: devDependency 설치**

```bash
cd apps/api && bun add -D @cloudflare/vitest-pool-workers && cd ../..
```

설치 후 `apps/api/node_modules/@cloudflare/vitest-pool-workers`의 README 또는 `dist`의 export를 1분간 확인해 이 버전이 `readD1Migrations`를 `@cloudflare/vitest-pool-workers`에서 export하는지(신 API) 아니면 `defineWorkersConfig`를 `@cloudflare/vitest-pool-workers/config`에서 export하는지(구 API) 파악한다. 아래 config는 구 API(`/config`) 기준 — export 이름이 다르면 그에 맞춰 import만 교정하고 구조는 유지한다.

- [ ] **Step 2: 기존 config를 node 유닛 전용으로 정리**

`apps/api/vitest.config.ts`를 워크스페이스 참조로 대체:

```typescript
// 이 파일은 워크스페이스 프로젝트 정의로 위임한다. vitest.workspace.ts 참조.
export { default } from "./vitest.workspace";
```

- [ ] **Step 3: 워크스페이스 2 프로젝트 정의**

`apps/api/vitest.workspace.ts` (구 API 기준):

```typescript
import path from "node:path";
import { defineWorkspace } from "vitest/config";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkspace([
  // 1) node 유닛: 기존 목킹 테스트 (healthz, auth, log 핸들러 로직)
  {
    test: {
      name: "unit",
      globals: true,
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  },
  // 2) workers 통합: 실 D1 바인딩 + 마이그레이션 적용
  defineWorkersProject(async () => {
    const migrations = await readD1Migrations(
      path.join(__dirname, "migrations"),
    );
    return {
      test: {
        name: "integration",
        include: ["test/**/*.integration.test.ts"],
        setupFiles: ["./test/apply-migrations.ts"],
        poolOptions: {
          workers: {
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: { TEST_MIGRATIONS: migrations },
            },
          },
        },
      },
    };
  }),
]);
```

- [ ] **Step 4: 마이그레이션 setup 파일**

`apps/api/test/apply-migrations.ts`:

```typescript
import { applyD1Migrations, env } from "cloudflare:test";

// 각 테스트 워커 시작 시 migrations/*.sql 을 실 D1(env.DB)에 적용.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

declare module "cloudflare:test" {
  interface ProvidedEnv {
    TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
  }
}
```

- [ ] **Step 5: 스모크 통합 테스트 (0001 스키마 대상)**

`apps/api/test/smoke.integration.test.ts` — 0001의 `user` 테이블에 insert/select가 실제로 도는지:

```typescript
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("D1 harness smoke", () => {
  it("applies migrations and executes real SQL", async () => {
    await env.DB.prepare(
      `INSERT INTO "user" ("id","name","email","emailVerified","createdAt","updatedAt")
       VALUES (?,?,?,?,?,?)`,
    )
      .bind("u_smoke", "Smoke", "smoke@test.dev", 1, "2026-01-01", "2026-01-01")
      .run();

    const row = await env.DB.prepare(
      `SELECT "email" FROM "user" WHERE "id" = ?`,
    )
      .bind("u_smoke")
      .first<{ email: string }>();

    expect(row?.email).toBe("smoke@test.dev");
  });
});
```

- [ ] **Step 6: 두 프로젝트 모두 그린 확인**

Run: `bun run --filter @pourover/api test:run`
Expected: `unit` 프로젝트(기존 healthz/auth) PASS + `integration` 프로젝트(smoke) PASS. 만약 pool-workers config import가 어긋나면 Step 1의 export 확인으로 돌아가 import만 교정.

- [ ] **Step 7: 커밋**

```bash
git add apps/api/package.json apps/api/vitest.config.ts apps/api/vitest.workspace.ts apps/api/test/apply-migrations.ts apps/api/test/smoke.integration.test.ts
git commit -m "test(api): 실 D1 통합 테스트 하베스트 (vitest-pool-workers)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 3: `0002_brew_log.sql` 마이그레이션

**Files:**
- Create: `apps/api/migrations/0002_brew_log.sql`
- Test: `apps/api/test/schema.integration.test.ts`

**Interfaces:**
- Produces: `brewLogEntry` 테이블 (컬럼: id, userId, brewedAt, durationSec, feeling, memo, recipe, createdAt, updatedAt) + `(userId, brewedAt DESC)` 인덱스.

- [ ] **Step 1: 스키마 존재를 검증하는 실패 테스트**

`apps/api/test/schema.integration.test.ts`:

```typescript
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("brewLogEntry schema", () => {
  it("has the expected columns", async () => {
    const cols = await env.DB.prepare(
      `SELECT name FROM pragma_table_info('brewLogEntry')`,
    ).all<{ name: string }>();
    const names = cols.results.map((r) => r.name).sort();
    expect(names).toEqual(
      [
        "brewedAt",
        "createdAt",
        "durationSec",
        "feeling",
        "id",
        "memo",
        "recipe",
        "updatedAt",
        "userId",
      ].sort(),
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun run --filter @pourover/api test:run schema`
Expected: FAIL — `brewLogEntry` 없음(빈 결과).

- [ ] **Step 3: 마이그레이션 작성**

`apps/api/migrations/0002_brew_log.sql`:

```sql
-- 브루 로그 일기 (#14). 도메인 테이블 첫 추가.
-- id는 클라이언트 생성 UUID(멱등 저장). recipe는 Recipe JSON 스냅샷.
-- forward-only.

CREATE TABLE "brewLogEntry" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "brewedAt"    TEXT NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "feeling"     TEXT,
  "memo"        TEXT,
  "recipe"      TEXT NOT NULL,
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);

CREATE INDEX "brewLogEntry_userId_brewedAt_idx"
  ON "brewLogEntry"("userId", "brewedAt" DESC);
```

- [ ] **Step 4: 로컬 D1에 적용 + 테스트 통과**

```bash
cd apps/api && bunx wrangler d1 migrations apply pourover-api --local && cd ../..
bun run --filter @pourover/api test:run schema
```
Expected: 마이그레이션 적용 로그 + 테스트 PASS. (`--remote` 적용은 PR 배포 시점 체크리스트로 미룬다.)

- [ ] **Step 5: 커밋**

```bash
git add apps/api/migrations/0002_brew_log.sql apps/api/test/schema.integration.test.ts
git commit -m "feat(api): brewLogEntry 스키마 + 마이그레이션 0002 (#14)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 4: 로그 엔드포인트 (`log.ts`) + 라우트 마운트 + CORS

**Files:**
- Create: `apps/api/src/log.ts`
- Modify: `apps/api/src/index.ts`
- Test: `apps/api/test/log.integration.test.ts`

**Interfaces:**
- Consumes: `createAuth` from `./auth`; `Env` from `./index`; `BrewMethodId`, `DripperId`, `Feeling` 타입은 문자열로 취급(도메인 import 불필요, 서버는 recipe를 opaque JSON으로 다룸).
- Produces: `const logRoutes: Hono<{ Bindings: Env }>` — `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`. `index.ts`가 `/api/log`에 마운트.
- Wire DTO:
  - `CreateLogBody = { id: string; recipe: string; brewedAt: string; durationSec: number; feeling?: string | null; memo?: string | null }` (recipe는 `recipeToJSON` 결과 문자열)
  - `LogSummary = { id: string; brewedAt: string; durationSec: number; method: string; dripper: string; coffee: number; totalWater: number; feeling: string | null; memoSnippet: string | null }`
  - `LogDetail = { id: string; brewedAt: string; durationSec: number; feeling: string | null; memo: string | null; recipe: string }`

- [ ] **Step 1: 통합 테스트 작성 (인증 가드 + 멱등 + 소유권 + 검증 + CRUD)**

`apps/api/test/log.integration.test.ts` — 실제 세션 쿠키 대신, 서버 핸들러가 세션을 읽는 지점을 실 better-auth로 태우기는 무겁다. 대신 **세션을 실 D1에 시드**하고 better-auth의 세션 토큰 쿠키를 만들어 붙인다. better-auth 세션 시드 헬퍼를 파일 상단에 둔다:

```typescript
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
```

> 주의: better-auth 세션 쿠키명이 이 버전에서 `better-auth.session_token`이 아닐 수 있다. Step 3 구현 후 첫 실행에서 401이 안 풀리면, `GET /api/auth/get-session`에 같은 쿠키를 던져 200/user가 나오는지로 쿠키명을 확정하고 `seedSession`의 쿠키명만 교정한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun run --filter @pourover/api test:run log.integration`
Expected: FAIL — `/api/log` 라우트 없음(대부분 404/401).

- [ ] **Step 3: `log.ts` 구현**

`apps/api/src/log.ts`:

```typescript
import { Hono } from "hono";
import { createAuth } from "./auth";
import type { Env } from "./index";

const FEELINGS = new Set(["calm", "neutral", "wave"]);
const MEMO_MAX = 280;

type Vars = { userId: string };

const logRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

// 세션 가드 — 통과 시 c.set("userId").
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
```

- [ ] **Step 4: `index.ts`에 마운트 + CORS 확장**

`apps/api/src/index.ts`에서 (a) import 추가, (b) CORS `allowMethods`에 PATCH·DELETE 추가, (c) 라우트 마운트.

import 블록에 추가:

```typescript
import { logRoutes } from "./log";
```

CORS 블록의 `allowMethods` 교체:

```typescript
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
```

`/api/auth/*` 핸들러 등록 아래에 마운트:

```typescript
app.route("/api/log", logRoutes);
```

- [ ] **Step 5: 통합 테스트 통과 확인**

Run: `bun run --filter @pourover/api test:run`
Expected: unit + integration 전부 PASS. (쿠키명 이슈 시 Step 1 주의사항대로 `seedSession` 교정.)

- [ ] **Step 6: 타입체크**

Run: `bun run --filter @pourover/api typecheck`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/log.ts apps/api/src/index.ts apps/api/test/log.integration.test.ts
git commit -m "feat(api): 브루 로그 엔드포인트 POST/GET/PATCH/DELETE (#14)

멱등 저장(ON CONFLICT), 세션 가드, 소유권 스코핑, CORS PATCH/DELETE 보강.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## PR 3 — 웹 저장 경로

### Task 5: diary API 클라이언트 + 실패 stash

**Files:**
- Create: `apps/web/src/features/diary/api.ts`
- Create: `apps/web/src/features/diary/localStash.ts`

**Interfaces:**
- Consumes: `Recipe` from `@pourover/domain/types`; `recipeToJSON` from `@pourover/domain/serialize`; `Feeling` from `@pourover/domain/session`.
- Produces:
  - `createLog(input: { id: string; recipe: Recipe; brewedAt: string; durationSec: number; feeling: Feeling | null; memo: string | null }): Promise<void>`
  - `patchLog(id: string, patch: { feeling?: Feeling | null; memo?: string | null }): Promise<void>`
  - `listLogs(): Promise<LogSummary[]>`
  - `getLog(id: string): Promise<LogDetail>`
  - `deleteLog(id: string): Promise<void>`
  - 타입 `LogSummary`, `LogDetail` (서버 DTO 복제).
  - `stashUnsynced(entry: UnsyncedLog): void` (localStash.ts)

- [ ] **Step 1: localStash 구현 (테스트 불요 — 얇은 write-only)**

`apps/web/src/features/diary/localStash.ts`:

```typescript
// D7: 로그인 유저의 자동 저장이 네트워크 실패할 때, 에러 표시 없이(침묵)
// memo 포함 엔트리를 로컬에 보관. 후속 오프라인 동기화가 재전송할 대기열.
const KEY = "bloom-coffee:unsynced-logs:v1";

export type UnsyncedLog = {
  readonly id: string;
  readonly recipe: string; // recipeToJSON 결과
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: string | null;
  readonly memo: string | null;
};

export function stashUnsynced(entry: UnsyncedLog): void {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as UnsyncedLog[]) : [];
    const next = [...list.filter((e) => e.id !== entry.id), entry];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — drop silently.
  }
}
```

- [ ] **Step 2: diary API 클라이언트 구현**

`apps/web/src/features/diary/api.ts`:

```typescript
import type { Recipe } from "@pourover/domain/types";
import { recipeToJSON } from "@pourover/domain/serialize";
import type { Feeling } from "@pourover/domain/session";
import { stashUnsynced } from "./localStash";

const API_BASE: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export type LogSummary = {
  readonly id: string;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly method: string;
  readonly dripper: string;
  readonly coffee: number;
  readonly totalWater: number;
  readonly feeling: Feeling | null;
  readonly memoSnippet: string | null;
};

export type LogDetail = {
  readonly id: string;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: Feeling | null;
  readonly memo: string | null;
  readonly recipe: string; // recipeFromJSON 으로 rehydrate
};

type CreateInput = {
  readonly id: string;
  readonly recipe: Recipe;
  readonly brewedAt: string;
  readonly durationSec: number;
  readonly feeling: Feeling | null;
  readonly memo: string | null;
};

// D7: 실패해도 throw 하지 않는다 — 조용히 stash.
export async function createLog(input: CreateInput): Promise<void> {
  const recipe = recipeToJSON(input.recipe);
  const payload = {
    id: input.id,
    recipe,
    brewedAt: input.brewedAt,
    durationSec: input.durationSec,
    feeling: input.feeling,
    memo: input.memo,
  };
  try {
    const res = await fetch(`${API_BASE}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createLog ${res.status}`);
  } catch {
    stashUnsynced({ ...payload });
  }
}

export async function patchLog(
  id: string,
  patch: { feeling?: Feeling | null; memo?: string | null },
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`patchLog ${res.status}`);
  } catch {
    // 조용히 무시 — v1은 patch 재시도 큐를 두지 않는다(YAGNI).
  }
}

export async function listLogs(): Promise<LogSummary[]> {
  const res = await fetch(`${API_BASE}/api/log`, { credentials: "include" });
  if (!res.ok) throw new Error(`listLogs ${res.status}`);
  return (await res.json()) as LogSummary[];
}

export async function getLog(id: string): Promise<LogDetail> {
  const res = await fetch(`${API_BASE}/api/log/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error(`getLog ${res.status}`);
  return (await res.json()) as LogDetail;
}

export async function deleteLog(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/log/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`deleteLog ${res.status}`);
}
```

- [ ] **Step 3: 타입체크 + 커밋**

Run: `bun run --filter @pourover/web typecheck`
Expected: 에러 없음.

```bash
git add apps/web/src/features/diary/api.ts apps/web/src/features/diary/localStash.ts
git commit -m "feat(web): diary API 클라이언트 + 실패 시 조용한 stash

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: `<BrewSummary>` 추출 (순수 리팩토링)

**Files:**
- Create: `apps/web/src/features/complete/BrewSummary.tsx`
- Modify: `apps/web/src/features/complete/CompleteScreen.tsx`

**Interfaces:**
- Produces: `BrewSummary({ recipe }: { readonly recipe: Recipe })` — CompleteScreen의 "레시피 요약 card" 섹션(드리퍼/레시피/원두·물/온도·분쇄 4셀 + hairline)을 그대로 렌더. `SummaryCell`도 이 파일로 이동.

- [ ] **Step 1: BrewSummary 컴포넌트 생성**

`apps/web/src/features/complete/BrewSummary.tsx` — CompleteScreen에서 `SummaryCell`과 "레시피 요약" `<section>`을 그대로 옮긴다:

```typescript
import { getMethodName } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import type { Recipe } from "@pourover/domain/types";
import { cx } from "@/ui/cx";
import { formatGrindHint } from "@/ui/format";

export function BrewSummary({ recipe }: { readonly recipe: Recipe }) {
  const dripperName = drippers[recipe.dripper].name;
  const methodName = getMethodName(recipe.method);
  return (
    <section aria-label="레시피 요약" className="mt-10">
      <div className="h-px bg-border" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-5">
        <SummaryCell label="드리퍼" value={dripperName} />
        <SummaryCell label="레시피" value={methodName} />
        <SummaryCell label="원두 · 물" value={`${recipe.coffee} · ${recipe.totalWater} g`} />
        <SummaryCell
          label="온도 · 분쇄"
          value={`${recipe.temperature}° · ${formatGrindHint(recipe.grindHint)}`}
        />
      </div>
      <div className="h-px bg-border" />
    </section>
  );
}

function SummaryCell({
  label,
  value,
  small,
}: {
  readonly label: string;
  readonly value: string;
  readonly small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption-xxs uppercase tracking-wider text-text-muted">{label}</span>
      <span className={cx("tabular-nums", small ? "text-body-sm text-text-secondary" : "text-body-md")}>
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: CompleteScreen에서 교체**

`CompleteScreen.tsx`에서 `import { BrewSummary } from "./BrewSummary";` 추가하고, "레시피 요약" `<section>` 전체를 `<BrewSummary recipe={recipe} />`로 대체. 파일 하단의 로컬 `SummaryCell` 함수 삭제. 미사용이 된 import(`getMethodName`, `drippers`, `formatGrindHint`)는 CompleteScreen에서 제거(dripperName/methodName 로컬 변수도 아직 다른 곳에서 안 쓰면 정리).

- [ ] **Step 3: 빌드 + 기존 테스트 그린**

Run: `bun run --filter @pourover/web typecheck && bun run --filter @pourover/web test:run`
Expected: 타입/테스트 PASS (동작 불변).

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/features/complete/BrewSummary.tsx apps/web/src/features/complete/CompleteScreen.tsx
git commit -m "refactor(web): CompleteScreen 요약 카드를 BrewSummary로 추출

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: CompleteScreen 자동 저장 + 메모 + 속삭임

**Files:**
- Modify: `apps/web/src/features/complete/CompleteScreen.tsx`
- Test: `apps/web/src/features/complete/CompleteScreen.test.tsx`

**Interfaces:**
- Consumes: `useSession` from `@/features/auth/useSession`; `signInWithGoogle` from `@/features/auth/api`; `createLog`, `patchLog` from `@/features/diary/api`; `sessionDurationSec` from `@pourover/domain/session`.
- CompleteScreen는 완료 시점의 로그 id를 `session`에 실어 받는다 → **`BrewSession`이 아니라 상위에서 id를 만든다.** 이를 위해 Task 9(AppRoot)에서 완료 시 `logId`를 생성해 CompleteScreen에 prop으로 전달한다. 본 태스크에서는 CompleteScreen에 `logId: string` prop을 추가하고, 테스트에서 직접 주입한다.

- [ ] **Step 1: 실패 테스트 작성**

`apps/web/src/features/complete/CompleteScreen.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CompleteScreen } from "./CompleteScreen";
import type { BrewSession } from "@pourover/domain/session";
import { brewMethods } from "@pourover/domain/methods";
import { g } from "@pourover/domain/units";

const recipe = brewMethods.kasuya_4_6.compute({
  method: "kasuya_4_6", dripper: "v60", coffee: g(20), roast: "medium",
  taste: { sweetness: "balanced", strength: "medium" },
});
const session: BrewSession = { recipe, startedAt: 1_000, completedAt: 201_000 };

const createLog = vi.fn(async () => {});
const patchLog = vi.fn(async () => {});
vi.mock("@/features/diary/api", () => ({
  createLog: (...a: unknown[]) => createLog(...a),
  patchLog: (...a: unknown[]) => patchLog(...a),
}));

const useSession = vi.fn();
vi.mock("@/features/auth/useSession", () => ({ useSession: () => useSession() }));

beforeEach(() => { createLog.mockClear(); patchLog.mockClear(); });
afterEach(() => { vi.restoreAllMocks(); });

const noop = () => {};

describe("CompleteScreen logging", () => {
  it("logged-in: auto-creates the log exactly once (StrictMode-safe)", async () => {
    useSession.mockReturnValue({ status: "loaded", session: { user: { id: "u1" } } });
    render(
      <StrictMode>
        <CompleteScreen session={session} logId="log_test" onFeelingChange={noop} onExit={noop} />
      </StrictMode>,
    );
    await waitFor(() => expect(createLog).toHaveBeenCalledTimes(1));
    expect(createLog.mock.calls[0]![0]).toMatchObject({ id: "log_test" });
  });

  it("logged-out: shows the whisper, no memo field, no createLog", async () => {
    useSession.mockReturnValue({ status: "loaded", session: null });
    render(
      <CompleteScreen session={session} logId="log_test" onFeelingChange={noop} onExit={noop} />,
    );
    expect(screen.getByText(/로그인하면.*일기에 남아요/)).toBeInTheDocument();
    expect(screen.queryByLabelText("메모")).not.toBeInTheDocument();
    expect(createLog).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun run --filter @pourover/web test:run CompleteScreen`
Expected: FAIL — `logId` prop 없음 / 자동저장·속삭임 미구현.

- [ ] **Step 3: CompleteScreen 구현**

`CompleteScreen.tsx` 변경:

(a) Props에 `logId: string` 추가:

```typescript
type Props = {
  readonly session: BrewSession;
  readonly logId: string;
  readonly onFeelingChange: (feeling: Feeling | null) => void;
  readonly onExit: () => void;
};
```

(b) import 추가:

```typescript
import { useEffect, useRef, useState } from "react";
import { sessionDurationSec, ... } from "@pourover/domain/session"; // 기존 import에 병합
import { useSession } from "@/features/auth/useSession";
import { signInWithGoogle } from "@/features/auth/api";
import { createLog, patchLog } from "@/features/diary/api";
```

(c) 컴포넌트 본문 상단에 로그인 상태 + 자동 저장 + 메모 상태:

```typescript
  const auth = useSession();
  const isLoggedIn = auth.status === "loaded" && auth.session != null;
  const [memo, setMemo] = useState("");
  const createdRef = useRef(false);

  // 완료 진입 시 1회 자동 저장(멱등). StrictMode 이중 마운트는 ref로 가드하고,
  // 서버도 ON CONFLICT 로 멱등이라 이중 안전.
  useEffect(() => {
    if (!isLoggedIn || createdRef.current) return;
    createdRef.current = true;
    void createLog({
      id: logId,
      recipe: session.recipe,
      brewedAt: new Date(session.startedAt).toISOString(),
      durationSec: sessionDurationSec(session),
      feeling: session.feeling ?? null,
      memo: null,
    });
  }, [isLoggedIn, logId, session]);
```

(d) `handleFeelingTap`를 변경해 로그인 시 PATCH 동반:

```typescript
  const handleFeelingTap = (feeling: Feeling): void => {
    const next = session.feeling === feeling ? null : feeling;
    onFeelingChange(next);
    if (isLoggedIn) void patchLog(logId, { feeling: next });
  };
```

(e) feeling 섹션 아래에 메모/속삭임 블록 추가:

```tsx
      {isLoggedIn ? (
        <section aria-label="메모" className="mt-6">
          <textarea
            aria-label="메모"
            value={memo}
            maxLength={280}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => void patchLog(logId, { memo: memo.trim() || null })}
            placeholder="한 줄 남겨둘까요"
            rows={2}
            className="w-full resize-none rounded-card border border-surface-hairline bg-surface-soft px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </section>
      ) : (
        <p className="mt-6 text-center text-caption-sm text-text-muted">
          <button
            type="button"
            onClick={() => void signInWithGoogle(window.location.href)}
            className="underline underline-offset-2 hover:text-text-secondary"
          >
            로그인
          </button>
          하면 이 기록이 일기에 남아요
        </p>
      )}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `bun run --filter @pourover/web test:run CompleteScreen`
Expected: PASS (auto-create 1회, 속삭임 노출).

- [ ] **Step 5: 타입체크 + 커밋**

Run: `bun run --filter @pourover/web typecheck`
Expected: 에러 없음 (AppRoot가 `logId`를 아직 안 넘겨 타입 에러가 나면 Task 9에서 해소 — 단, 이 커밋 시점에 웹 전체 typecheck가 깨지지 않도록 **Task 9의 AppRoot 변경을 이 PR에 포함**하거나, 임시로 AppRoot에서 `logId={crypto.randomUUID()}` 대신 Task 9의 안정 id를 바로 적용한다. → 아래 Task 9를 본 PR(PR 3)의 마지막 태스크로 함께 커밋한다.)

```bash
git add apps/web/src/features/complete/CompleteScreen.tsx apps/web/src/features/complete/CompleteScreen.test.tsx
git commit -m "feat(web): 완료 시 자동 로그 저장 + 메모 + 비로그인 속삭임 (#14)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

> **PR 경계 메모:** Task 7의 `logId` prop 때문에 AppRoot가 변경되어야 웹 typecheck가 통과한다. 따라서 **Task 9(AppRoot 라우팅)의 `logId` 생성·전달 부분을 PR 3에 포함**하고, diary 화면(Task 8)·DiaryLink는 PR 4로 둔다. 실행 시 Task 7 직후 Task 9의 "완료 시 logId 생성 + CompleteScreen 전달" 스텝을 먼저 적용해 typecheck를 그린으로 맞춘 뒤 커밋한다.

---

## PR 4 — 웹 일기 화면

### Task 8: DiaryScreen(목록) + DiaryDetailScreen(상세)

**Files:**
- Create: `apps/web/src/features/diary/DiaryScreen.tsx`
- Create: `apps/web/src/features/diary/DiaryDetailScreen.tsx`
- Test: `apps/web/src/features/diary/DiaryScreen.test.tsx`

**Interfaces:**
- Consumes: `listLogs`, `getLog`, `patchLog`, `deleteLog`, `LogSummary`, `LogDetail` from `./api`; `recipeFromJSON` from `@pourover/domain/serialize`; `BrewSummary` from `@/features/complete/BrewSummary`; `FeelingGlyph` from `@/features/complete/FeelingGlyph`; `formatBrewedAt`, `formatTime` from `@/ui/format`.
- Produces:
  - `DiaryScreen({ onBack, onOpen }: { readonly onBack: () => void; readonly onOpen: (id: string) => void })`
  - `DiaryDetailScreen({ id, onBack, onDeleted }: { readonly id: string; readonly onBack: () => void; readonly onDeleted: () => void })`

- [ ] **Step 1: 목록 실패 테스트**

`apps/web/src/features/diary/DiaryScreen.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiaryScreen } from "./DiaryScreen";

const listLogs = vi.fn();
vi.mock("./api", () => ({ listLogs: () => listLogs() }));
afterEach(() => vi.restoreAllMocks());

describe("DiaryScreen", () => {
  it("renders a row per log summary", async () => {
    listLogs.mockResolvedValue([
      { id: "l1", brewedAt: "2026-06-02T00:00:00.000Z", durationSec: 200,
        method: "kasuya_4_6", dripper: "v60", coffee: 20, totalWater: 300,
        feeling: "calm", memoSnippet: "좋았음" },
    ]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText("좋았음")).toBeInTheDocument());
  });

  it("shows an empty state when there are no logs", async () => {
    listLogs.mockResolvedValue([]);
    render(<DiaryScreen onBack={() => {}} onOpen={() => {}} />);
    await waitFor(() => expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run --filter @pourover/web test:run DiaryScreen`
Expected: FAIL — `DiaryScreen` 미정의.

- [ ] **Step 3: DiaryScreen 구현**

`apps/web/src/features/diary/DiaryScreen.tsx`:

```typescript
import { useEffect, useState } from "react";
import { getMethodName } from "@pourover/domain/methods";
import { drippers } from "@pourover/domain/drippers";
import type { DripperId, BrewMethodId } from "@pourover/domain/types";
import { Footer } from "@/ui/Footer";
import { formatTime } from "@/ui/format";
import { FeelingGlyph } from "@/features/complete/FeelingGlyph";
import { listLogs, type LogSummary } from "./api";

type Load =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "loaded"; readonly logs: LogSummary[] };

export function DiaryScreen({
  onBack,
  onOpen,
}: {
  readonly onBack: () => void;
  readonly onOpen: (id: string) => void;
}) {
  const [state, setState] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    void listLogs()
      .then((logs) => alive && setState({ status: "loaded", logs }))
      .catch(() => alive && setState({ status: "error" }));
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-12 text-text-primary">
      <header className="flex items-center justify-between">
        <h1 className="text-heading-sm font-medium">내 기록</h1>
        <button type="button" onClick={onBack} className="text-body-sm text-text-secondary underline-offset-2 hover:underline">
          닫기
        </button>
      </header>

      <div className="mt-8 flex-1">
        {state.status === "loading" && (
          <p className="text-body-sm text-text-muted">불러오는 중…</p>
        )}
        {state.status === "error" && (
          <p className="text-body-sm text-text-muted">기록을 불러오지 못했어요.</p>
        )}
        {state.status === "loaded" && state.logs.length === 0 && (
          <p className="text-body-sm text-text-muted">아직 기록이 없어요.</p>
        )}
        {state.status === "loaded" && state.logs.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {state.logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => onOpen(log.id)}
                  className="flex w-full items-center gap-3 py-4 text-left hover:bg-surface-soft/60"
                >
                  {log.feeling && <FeelingGlyph kind={log.feeling} size={28} />}
                  <span className="flex-1">
                    <span className="block text-body-md">
                      {getMethodName(log.method as BrewMethodId)} · {drippers[log.dripper as DripperId].name}
                    </span>
                    <span className="block text-caption-sm text-text-muted tabular-nums">
                      {log.coffee} · {log.totalWater} g · {formatTime(log.durationSec)}
                    </span>
                    {log.memoSnippet && (
                      <span className="mt-1 block text-body-sm text-text-secondary">{log.memoSnippet}</span>
                    )}
                  </span>
                  <span className="text-caption-sm text-text-muted tabular-nums">
                    {log.brewedAt.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: DiaryDetailScreen 구현**

`apps/web/src/features/diary/DiaryDetailScreen.tsx`:

```typescript
import { useEffect, useState } from "react";
import { recipeFromJSON } from "@pourover/domain/serialize";
import type { Recipe } from "@pourover/domain/types";
import { Footer } from "@/ui/Footer";
import { formatTime } from "@/ui/format";
import { BrewSummary } from "@/features/complete/BrewSummary";
import { deleteLog, getLog, patchLog, type LogDetail } from "./api";

export function DiaryDetailScreen({
  id,
  onBack,
  onDeleted,
}: {
  readonly id: string;
  readonly onBack: () => void;
  readonly onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    let alive = true;
    void getLog(id).then((d) => {
      if (!alive) return;
      setDetail(d);
      setMemo(d.memo ?? "");
      setRecipe(recipeFromJSON(d.recipe));
    });
    return () => { alive = false; };
  }, [id]);

  const handleDelete = async (): Promise<void> => {
    await deleteLog(id);
    onDeleted();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-surface px-6 pb-4 pt-12 text-text-primary">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-body-sm text-text-secondary underline-offset-2 hover:underline">
          ← 목록
        </button>
        <button type="button" onClick={() => void handleDelete()} className="text-body-sm text-text-muted underline-offset-2 hover:underline">
          삭제
        </button>
      </header>

      {detail && (
        <span className="mt-4 text-caption-sm text-text-muted tabular-nums">
          {detail.brewedAt.slice(0, 10)} · {formatTime(detail.durationSec)}
        </span>
      )}
      {recipe && <BrewSummary recipe={recipe} />}

      <section aria-label="메모" className="mt-6">
        <textarea
          aria-label="메모"
          value={memo}
          maxLength={280}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => void patchLog(id, { memo: memo.trim() || null })}
          rows={3}
          className="w-full resize-none rounded-card border border-surface-hairline bg-surface-soft px-3 py-2 text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </section>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: 목록 테스트 통과 + 타입체크**

Run: `bun run --filter @pourover/web test:run DiaryScreen && bun run --filter @pourover/web typecheck`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/features/diary/DiaryScreen.tsx apps/web/src/features/diary/DiaryDetailScreen.tsx apps/web/src/features/diary/DiaryScreen.test.tsx
git commit -m "feat(web): 일기 목록 + 상세(메모 편집/삭제) (#14)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: 라우팅 + Wall 진입점 (`state.ts`, `AppRoot`, `DiaryLink`, `WallScreen`)

**Files:**
- Modify: `apps/web/src/features/app/state.ts`
- Modify: `apps/web/src/features/app/AppRoot.tsx`
- Create: `apps/web/src/features/diary/DiaryLink.tsx`
- Modify: `apps/web/src/features/wall/WallScreen.tsx`

**Interfaces:**
- Consumes: `useSession` from `@/features/auth/useSession`; `DiaryScreen`, `DiaryDetailScreen` from `@/features/diary/*`.
- Produces: `AppState.screen`에 `"diary" | "diary-detail"` 추가, `selectedLogId?: string` 추가; `DiaryLink({ onOpen }: { readonly onOpen: () => void })`.

> **주의(PR 경계):** 이 태스크의 "완료 시 logId 생성 + CompleteScreen에 전달" 스텝(Step 2)은 **PR 3에서 Task 7 직후 함께 커밋**해 웹 typecheck를 그린으로 유지한다(Task 7 메모 참조). 나머지 스텝(diary 화면 라우팅·DiaryLink)은 PR 4.

- [ ] **Step 1: state.ts에 screen/selectedLogId 추가**

`state.ts`의 `Screen` 유니온과 `AppState` 확장:

```typescript
export type Screen =
  | "wall" | "recipe" | "brewing" | "complete" | "custom"
  | "diary" | "diary-detail";
```

`AppState`에 필드 추가:

```typescript
  readonly customRecipe?: Recipe;
  readonly selectedLogId?: string;
```

- [ ] **Step 2: AppRoot — 완료 시 logId 생성 + CompleteScreen 전달 (PR 3에 포함)**

`AppRoot`에 완료 로그 id 상태 추가:

```typescript
  const [logId, setLogId] = useState<string | null>(null);
```

`handleComplete`에서 id 생성:

```typescript
  const handleComplete = useCallback((): void => {
    setLogId(crypto.randomUUID());
    withViewTransition(() => {
      setSession((prev) => (prev ? { ...prev, completedAt: Date.now() } : null));
      setState((prev) => mergeState(prev, { screen: "complete" }));
    });
  }, []);
```

CompleteScreen 렌더에 `logId` 전달(로그인 여부와 무관하게 항상 값 존재하도록 fallback):

```tsx
  if (state.screen === "complete" && session) {
    return (
      <CompleteScreen
        session={session}
        logId={logId ?? "pending"}
        onFeelingChange={handleFeeling}
        onExit={handleExit}
      />
    );
  }
```

- [ ] **Step 3: DiaryLink 생성 (PR 4)**

`apps/web/src/features/diary/DiaryLink.tsx` — 로그인 상태에서만 보이는 진입:

```typescript
import { useSession } from "@/features/auth/useSession";

export function DiaryLink({ onOpen }: { readonly onOpen: () => void }) {
  const { status, session } = useSession();
  if (status !== "loaded" || session == null) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-pill bg-surface-strong px-4 py-2 text-body-sm text-text-secondary shadow-hairline hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      내 기록
    </button>
  );
}
```

- [ ] **Step 4: WallScreen에 DiaryLink 배치 (PR 4)**

`WallScreen`에 `onOpenDiary` prop 추가하고, `LoginPill` 옆에 `DiaryLink` 배치:

```typescript
type Props = {
  readonly selectedDripper: DripperId;
  readonly onPickDripper: (id: DripperId) => void;
  readonly onOpenDiary: () => void;
};
```

상단 행 교체:

```tsx
      <div className="flex items-center justify-end gap-2 px-5 pt-4">
        <DiaryLink onOpen={onOpenDiary} />
        <LoginPill />
      </div>
```

`import { DiaryLink } from "@/features/diary/DiaryLink";` 추가.

- [ ] **Step 5: AppRoot에 diary 라우팅 배선 (PR 4)**

import 추가:

```typescript
import { DiaryScreen } from "@/features/diary/DiaryScreen";
import { DiaryDetailScreen } from "@/features/diary/DiaryDetailScreen";
```

WallScreen에 `onOpenDiary` 전달:

```tsx
      <WallScreen
        selectedDripper={state.dripper}
        onPickDripper={handlePickDripper}
        onOpenDiary={() => withViewTransition(() =>
          setState((prev) => mergeState(prev, { screen: "diary" })))}
      />
```

diary 분기 추가(`wall` 분기 앞):

```tsx
  if (state.screen === "diary") {
    return (
      <DiaryScreen
        onBack={() => withViewTransition(() =>
          setState((prev) => mergeState(prev, { screen: "wall" })))}
        onOpen={(id) => withViewTransition(() =>
          setState((prev) => mergeState(prev, { screen: "diary-detail", selectedLogId: id })))}
      />
    );
  }
  if (state.screen === "diary-detail" && state.selectedLogId) {
    return (
      <DiaryDetailScreen
        id={state.selectedLogId}
        onBack={() => withViewTransition(() =>
          setState((prev) => mergeState(prev, { screen: "diary" })))}
        onDeleted={() => withViewTransition(() =>
          setState((prev) => mergeState(prev, { screen: "diary" })))}
      />
    );
  }
```

- [ ] **Step 6: 전체 그린 확인**

Run: `bun run typecheck && bun run test:run`
Expected: 모든 워크스페이스 타입/테스트 PASS.

- [ ] **Step 7: 커밋 (PR 4 마무리)**

```bash
git add apps/web/src/features/app/state.ts apps/web/src/features/app/AppRoot.tsx apps/web/src/features/diary/DiaryLink.tsx apps/web/src/features/wall/WallScreen.tsx
git commit -m "feat(web): 일기 라우팅 + Wall '내 기록' 진입점 (#14)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 원격 검증 체크리스트 (배포 PR 본문에 포함)

CLAUDE.md 백엔드 규약 + 메모리 `pre-prod 검증 갭`: D1 마이그레이션·CORS·세션 경계를 건드리므로 **로컬 그린은 안전 보장이 아니다.**

- [ ] `cd apps/api && bunx wrangler d1 migrations apply pourover-api --remote` 적용
- [ ] `bun run deploy:api` 배포
- [ ] 배포 환경 E2E 1회: 로그인 → 브루 완료(자동 저장) → Wall "내 기록" → 목록 → 상세 → 메모 편집 → 삭제
- [ ] "원격에서 어떻게 깨질 수 있나" PR 본문 명시: (a) 0002 원격 미적용 시 500, (b) CORS `allowMethods`에 PATCH/DELETE 누락 시 프리플라이트 실패, (c) 세션 쿠키 cross-origin(SameSite=None; Secure) 경계

---

## Self-Review (스펙 대비)

- **스펙 커버리지**: 데이터 모델(Task 3) · 도메인 직렬화(Task 1) · API 5 엔드포인트+가드+CORS(Task 4) · CompleteScreen 자동저장·메모·속삭임(Task 7) · 실패 stash D7(Task 5) · BrewSummary 추출(Task 6) · diary 목록/상세(Task 8) · Wall 진입점·라우팅(Task 9) · 실 D1 검증 인프라 B1(Task 2) · 원격 체크리스트 B3(마지막 섹션). 스펙 D1~D8 결정값 모두 태스크에 반영.
- **미커버 항목 없음**. 오프라인 동기화 재전송(stash replay)·사진·페이지네이션은 스펙에서 명시적으로 v1 제외.
- **타입 일관성**: `LogSummary`/`LogDetail` 필드가 서버(Task 4)와 웹(Task 5)에서 동일. `createLog` 입력 시그니처가 Task 5 정의와 Task 7 호출부 일치. `logId` prop이 Task 7·9에서 일치. `recipeFromJSON`(string→Recipe)이 Task 1 정의와 Task 8 사용 일치.
- **플레이스홀더 없음**: 모든 코드 스텝에 실제 코드 포함.
