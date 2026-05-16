# @pourover/api

영속 데이터(브루 로그, 사용자, 사진)를 다루는 Cloudflare Worker. Hono 위에서
동작. 본 워크스페이스는 [ADR 0001](../../docs/adr/0001-backend-infrastructure.md)의
결정을 구현한다.

현재 상태: **스켈레톤 + 헬스체크만**. D1·R2·KV 바인딩과 인증·도메인
엔드포인트는 후속 이슈에서 붙는다.

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

```
apps/api/
  src/
    index.ts        Hono 진입점 (/healthz)
    index.test.ts   handler 테스트
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
```
