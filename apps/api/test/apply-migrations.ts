import { applyD1Migrations, env } from "cloudflare:test";

// 각 테스트 워커 시작 시 migrations/*.sql 을 실 D1(env.DB)에 적용.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

declare module "cloudflare:test" {
  interface ProvidedEnv {
    TEST_MIGRATIONS: Parameters<typeof applyD1Migrations>[1];
  }
}
