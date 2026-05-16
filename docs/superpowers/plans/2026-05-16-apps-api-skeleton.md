# apps/api 스켈레톤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADR 0001(#17)의 결정에 따라 `apps/api`(`@pourover/api`) Cloudflare Worker 워크스페이스를 신설하고 헬스체크 엔드포인트까지 동작 가능한 상태로 만든다. 후속 이슈(D1, better-auth, R2/Images, /log 엔드포인트)가 모두 이 위에 빌드된다.

**Architecture:** `apps/webhook`과 동일한 패턴 — Hono on Cloudflare Workers, vitest(node 환경), wrangler 3, TypeScript strict + `noUncheckedIndexedAccess`. 본 plan은 D1/R2/KV 바인딩이나 인증을 포함하지 않는다(별도 이슈). 헬스체크는 `GET /healthz` → `{ ok: true, name: "@pourover/api", version: "0.0.0" }`.

**Tech Stack:** Hono 4, `@cloudflare/workers-types`, wrangler 3, vitest 2, TypeScript 5.7, Bun workspaces.

---

## File Structure

**Create:**
- `apps/api/package.json` — workspace manifest (`@pourover/api`), webhook과 동일한 dev/build/deploy/test 스크립트
- `apps/api/tsconfig.json` — TS strict + WebWorker lib (webhook과 동일)
- `apps/api/vitest.config.ts` — node 환경 vitest 설정 (webhook과 동일)
- `apps/api/wrangler.jsonc` — `pourover-api` Worker 매니페스트, compatibility_date 2026-05-16, `nodejs_compat` 플래그
- `apps/api/src/index.ts` — Hono 앱 + `GET /healthz`
- `apps/api/src/index.test.ts` — 헬스체크 vitest
- `apps/api/README.md` — 워크스페이스 안내(로컬 dev, 배포, 후속 이슈 링크)

**Modify:**
- `package.json` (루트) — `dev:api`, `deploy:api` 스크립트 추가

각 파일은 한 가지 역할만 한다 — 매니페스트, 설정, 진입점, 테스트, 문서. apps/webhook과 1:1 대응이라 디렉토리 구조 학습 비용은 0.

---

## Task 1: 디렉토리 + 워크스페이스 매니페스트

**Files:**
- Create: `apps/api/package.json`

- [ ] **Step 1: 디렉토리 생성**

Run: `mkdir -p apps/api/src`

- [ ] **Step 2: `apps/api/package.json` 작성**

```json
{
  "name": "@pourover/api",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "tsc --noEmit",
    "deploy": "wrangler deploy",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.14"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250109.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8",
    "wrangler": "^3.99.0"
  }
}
```

(버전은 `apps/webhook/package.json`과 정확히 일치시킨다 — lockfile 분기 방지.)

- [ ] **Step 3: 워크스페이스 install**

Run: `bun install`
Expected: 새 `node_modules` 심볼릭 링크가 `apps/api/`에 생기고, `bun.lockb`가 업데이트된다. 에러 없이 종료.

---

## Task 2: TypeScript 설정

**Files:**
- Create: `apps/api/tsconfig.json`

- [ ] **Step 1: `apps/api/tsconfig.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "WebWorker"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`apps/webhook/tsconfig.json`과 완전히 동일. 추후 `@pourover/domain`을 import해야 하면 별도 path/reference를 추가하지만 본 plan 범위는 아니다.

- [ ] **Step 2: 검증 (이 시점엔 `src/` 비어 있어 typecheck는 nothing-to-check)**

Run: `bun run --filter @pourover/api typecheck`
Expected: exit 0 (입력 파일 없어도 에러 아님 — `noEmit` 이므로 single tsc invocation으로 끝).

---

## Task 3: vitest 설정

**Files:**
- Create: `apps/api/vitest.config.ts`

- [ ] **Step 1: `apps/api/vitest.config.ts` 작성**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

- [ ] **Step 2: 빈 vitest 실행으로 설정 자체가 깨지지 않는지 확인**

Run: `bun run --filter @pourover/api test:run`
Expected: "No test files found" 메시지로 종료(`vitest run` 기본 동작, exit code 1이지만 설정 파일 자체 에러는 없음).

다음 태스크에서 첫 테스트를 추가하면 정상화된다.

---

## Task 4: wrangler 매니페스트

**Files:**
- Create: `apps/api/wrangler.jsonc`

- [ ] **Step 1: `apps/api/wrangler.jsonc` 작성**

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "pourover-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-16",
  "compatibility_flags": ["nodejs_compat"]
}
```

- 이름은 `pourover-api` — webhook(`pourover-webhook`)·root(`pourover`)와 충돌 없음.
- `compatibility_date`는 plan 작성 시점인 2026-05-16. 후속 이슈에서 바인딩(D1/R2/KV) 추가 시 이 파일을 수정한다.
- `nodejs_compat` 플래그는 webhook과 일치 — better-auth 등 일부 의존성이 Node API를 요구할 가능성에 대비.

- [ ] **Step 2: wrangler 인식 확인 — 아직 src/index.ts가 없으니 dev 실행은 미루고, dry-validate만**

Run: `bunx --filter @pourover/api wrangler types --dry-run` 또는 단순히 다음:
Run: `cat apps/api/wrangler.jsonc | python3 -c "import json,re,sys; src=sys.stdin.read(); src=re.sub(r'//.*','',src); json.loads(src); print('valid jsonc')"`
Expected: `valid jsonc` 출력.

(엄격한 wrangler 검증은 다음 태스크의 `wrangler dev` 부팅으로 자연스럽게 일어난다.)

---

## Task 5: 헬스체크 — failing test 먼저 (TDD)

**Files:**
- Create: `apps/api/src/index.test.ts`

- [ ] **Step 1: 헬스체크 테스트 작성 (RED)**

```ts
import { describe, expect, it } from "vitest";
import app from "./index";

describe("GET /healthz", () => {
  it("returns ok with package name and version", async () => {
    const res = await app.request("/healthz");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await res.json()) as {
      ok: boolean;
      name: string;
      version: string;
    };
    expect(body).toEqual({
      ok: true,
      name: "@pourover/api",
      version: "0.0.0",
    });
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.request("/does-not-exist");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 (import 자체가 깨짐)**

Run: `bun run --filter @pourover/api test:run`
Expected: FAIL — `Cannot find module './index'` 또는 동등한 에러.

---

## Task 6: 헬스체크 — minimal impl (GREEN)

**Files:**
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: `apps/api/src/index.ts` 작성**

```ts
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
```

- `Env`는 현재 비어 있다 (바인딩 없음). 후속 이슈에서 D1/R2/KV/secret이 들어오면 이 타입이 확장된다.
- `/healthz`는 운영 표면에 노출돼도 안전한 정보만 반환 — 이름과 버전. 비밀이나 헬스 외 정보는 넣지 않는다.
- Hono의 미정의 경로 기본 동작이 404라 두 번째 테스트가 자연스럽게 통과.

- [ ] **Step 2: 테스트 통과 확인 (GREEN)**

Run: `bun run --filter @pourover/api test:run`
Expected: PASS — 두 테스트 모두 통과.

- [ ] **Step 3: typecheck 통과 확인**

Run: `bun run --filter @pourover/api typecheck`
Expected: exit 0, 에러 없음.

---

## Task 7: 로컬 wrangler dev 부팅 검증

**Files:** (없음 — 실행 검증만)

- [ ] **Step 1: 백그라운드로 wrangler dev 실행**

Run (백그라운드): `bun run --filter @pourover/api dev`
Expected: wrangler가 로컬 8787 포트(또는 다른 free 포트)에 Worker를 부팅. "Ready on http://localhost:..." 라인 출력.

- [ ] **Step 2: 헬스체크 호출**

Run: `curl -s http://localhost:8787/healthz`
Expected: `{"ok":true,"name":"@pourover/api","version":"0.0.0"}`

- [ ] **Step 3: 알 수 없는 경로 호출**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/does-not-exist`
Expected: `404`

- [ ] **Step 4: 백그라운드 wrangler dev 종료**

(실행 중인 프로세스 stop)

검증이 끝나면 진행. 이후 단계는 더 이상 wrangler dev를 띄우지 않는다.

---

## Task 8: 루트 package.json scripts 추가

**Files:**
- Modify: `package.json` (루트)

- [ ] **Step 1: 현재 root scripts 확인**

Run: `cat package.json | python3 -c "import json,sys; print('\n'.join(json.load(sys.stdin)['scripts'].keys()))"`
Expected: `dev`, `build`, `preview`, `test`, `test:run`, `typecheck`, `lint`, `lint:fix`, `format`, `format:check` 가 출력됨.

- [ ] **Step 2: `dev:api`, `deploy:api` 추가**

Edit `package.json`의 `scripts` 객체에 다음 두 키를 추가 (기존 키 순서 보존, `dev` 바로 아래에 `dev:api`, `preview` 다음에 `deploy:api`):

```json
"dev:api": "bun run --filter @pourover/api dev",
"deploy:api": "bun run --filter @pourover/api deploy",
```

(전체 scripts 객체는 다음 형태가 된다 — 비교용 참고:)

```json
{
  "scripts": {
    "dev": "bun run --filter @pourover/web dev",
    "dev:api": "bun run --filter @pourover/api dev",
    "build": "bun run --filter @pourover/web build",
    "preview": "bun run --filter @pourover/web preview",
    "deploy:api": "bun run --filter @pourover/api deploy",
    "test": "bun run --filter '*' test",
    "test:run": "bun run --filter '*' test:run",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint",
    "lint:fix": "bun run --filter '*' lint:fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

`test` / `test:run` / `typecheck` / `lint`는 이미 `--filter '*'`라 새 워크스페이스가 자동으로 합류한다 — 별도 수정 불필요.

- [ ] **Step 3: 새 스크립트 동작 확인**

Run: `bun run dev:api -- --dry-run 2>&1 | head -5`
Expected: wrangler가 워크스페이스 인식 (실제 dry-run 결과보다 "filter @pourover/api" 라인이 나오는지 확인).

(실제 dev 부팅은 Task 7에서 이미 검증했으므로 여기서는 alias 자체가 워크스페이스에 도달하는지만 확인.)

- [ ] **Step 4: 전체 typecheck / test:run 통과 확인**

Run: `bun run typecheck`
Expected: 모든 워크스페이스(`@pourover/web`, `@pourover/domain`, `@pourover/webhook`, `@pourover/api`) typecheck 통과.

Run: `bun run test:run`
Expected: 모든 워크스페이스 vitest 통과. `@pourover/api`는 Task 5의 두 테스트가 PASS로 보고된다.

---

## Task 9: README

**Files:**
- Create: `apps/api/README.md`

- [ ] **Step 1: README 작성**

```markdown
# @pourover/api

영속 데이터(브루 로그, 사용자, 사진)를 다루는 Cloudflare Worker.
Hono 위에서 동작. 본 워크스페이스는 [ADR 0001](../../docs/adr/0001-backend-infrastructure.md)의 결정을 구현한다.

현재 상태: **스켈레톤 + 헬스체크만**. D1·R2·KV 바인딩과 인증·도메인 엔드포인트는 후속 이슈에서 붙는다.

## 로컬 개발

```bash
bun run --filter @pourover/api dev       # wrangler dev (로컬 워커)
bun run --filter @pourover/api test:run  # vitest 1회
bun run --filter @pourover/api typecheck
```

또는 루트에서:

```bash
bun run dev:api      # apps/api dev
bun run typecheck    # 전체 워크스페이스 typecheck
bun run test:run     # 전체 워크스페이스 테스트
```

헬스체크: `curl http://localhost:8787/healthz`
→ `{"ok":true,"name":"@pourover/api","version":"0.0.0"}`

## 배포

```bash
bun run deploy:api
```

(시크릿/바인딩은 후속 이슈에서 등록.)

## 후속 작업

- D1 스키마 + 마이그레이션 — issue #20
- `better-auth` + Google OAuth — issue #21
- R2 presigned PUT + CF Images Transformations — issue #22
- `POST /log`, `GET /log` 엔드포인트 — issue #23
- CLAUDE.md 업데이트 — issue #24

## 디렉토리 구조

\`\`\`
apps/api/
  src/
    index.ts        Hono 진입점 (/healthz)
    index.test.ts   handler 테스트
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
\`\`\`
```

(위 마지막 디렉토리 구조 블록의 백슬래시는 markdown 펜스 escape — 실제 파일에는 일반 \`\`\`로 들어가야 한다.)

- [ ] **Step 2: prettier 통과 확인**

Run: `bun run format:check`
Expected: 새 파일 포함 전부 통과 (또는 한 번 `bun run format` 실행 후 통과).

---

## Task 10: 커밋

**Files:** (없음 — git 작업)

- [ ] **Step 1: 변경 파일 확인**

Run: `git status`
Expected (추가된 파일):
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/vitest.config.ts`
- `apps/api/wrangler.jsonc`
- `apps/api/src/index.ts`
- `apps/api/src/index.test.ts`
- `apps/api/README.md`

(수정된 파일):
- `package.json` (루트)
- `bun.lockb` (Task 1의 install로 갱신)

- [ ] **Step 2: 브랜치 만들기 + 커밋**

Run:
```bash
git checkout -b feat/api-skeleton
git add apps/api package.json bun.lockb
git commit -m "$(cat <<'EOF'
feat(api): bootstrap apps/api Worker skeleton

#19. ADR 0001 후속 1/6. Hono on Cloudflare Workers, GET /healthz만
포함. D1/R2/KV 바인딩과 인증은 후속 이슈에서 붙는다.

apps/webhook과 동일한 패턴(package.json, tsconfig, vitest, wrangler)으로
구성해 학습 비용 0. 루트 package.json에 dev:api, deploy:api 스크립트 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: 푸시 + PR 생성**

Run:
```bash
git push -u origin feat/api-skeleton
gh pr create --title "feat(api): apps/api Worker 스켈레톤 (#19)" --body "$(cat <<'EOF'
Closes #19.

## Summary
- `apps/api` 워크스페이스 신설 — `@pourover/api`, Hono on Cloudflare Workers.
- `GET /healthz` → `{ ok: true, name, version }` 만 포함. 바인딩·인증·도메인 엔드포인트는 후속 이슈.
- `apps/webhook`과 1:1 동일 패턴.
- 루트 \`package.json\`에 \`dev:api\`, \`deploy:api\` 추가.

## Test plan
- [ ] \`bun install\` clean.
- [ ] \`bun run dev:api\` → 로컬 Worker 부팅 → \`curl localhost:8787/healthz\` 성공.
- [ ] \`bun run typecheck\` 전체 통과 (web/domain/webhook/api).
- [ ] \`bun run test:run\` 전체 통과 — api의 healthz 두 테스트 PASS.

## Related
- ADR: \`docs/adr/0001-backend-infrastructure.md\` (Next steps 1번 항목).
- Blocks: #20, #21, #22, #23, #24.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: PR URL 출력 확인**

Expected: `https://github.com/haneulcha/pourover-work/pull/<n>` 형태의 URL.

---

## Self-Review

**Spec coverage (issue #19 acceptance criteria):**
- ✅ "bun run --filter @pourover/api dev가 로컬 Worker를 띄우고 curl localhost:8787/healthz가 { ok: true, ... }를 반환" → Task 6 + Task 7.
- ✅ "bun run --filter @pourover/api test:run이 최소 1개 vitest 통과" → Task 5/6 (실제로 2개).
- ✅ "루트 bun run typecheck / bun run test:run이 새 워크스페이스 포함해서 통과" → Task 8 Step 4.
- ✅ "apps/api는 @pourover/domain 외 내부 패키지에 의존하지 않는다" → package.json에 internal dep 없음 (Task 1).
- ✅ "apps/webhook/wrangler.jsonc와 같은 구조 (compatibility_date, nodejs_compat 등)" → Task 4.

**Placeholder scan:** 코드 블록 모두 실행 가능한 완전한 내용. "적절한 에러 핸들링" 류 없음. 빌트인 404 동작에 의존하는 부분은 명시.

**Type consistency:** `Env`는 `Record<string, never>` (Task 6) 한 번만 등장. 후속 이슈가 이를 확장한다고 README/index.ts 주석에 언급.

**한 가지 짚을 것:** `noUncheckedIndexedAccess`가 켜져 있어 후속 이슈에서 dict 접근 시 `| undefined`가 따라붙는다 — webhook은 이미 이렇게 코딩돼 있어 패턴 그대로 따라가면 됨. 본 plan에서는 dict 접근이 없어 영향 없음.
