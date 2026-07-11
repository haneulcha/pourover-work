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
        // kysely-d1(CJS)의 `require("kysely")`가 miniflare 워커 풀의
        // no-cjs-esm-shim 하에서 named export(SqliteQueryCompiler 등)를
        // 못 읽는 문제 회피 — 두 패키지를 인라인(SSR 번들)해 interop을
        // Vite가 처리하게 한다. 이래야 createAuth()/getSession()이 테스트
        // 환경에서도 로드된다.
        server: {
          deps: {
            inline: ["kysely", "kysely-d1"],
          },
        },
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
