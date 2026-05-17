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
