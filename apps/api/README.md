# @pourover/api

영속 데이터(브루 로그, 사용자, 사진)를 다루는 Cloudflare Worker. Hono 위에서
동작. 본 워크스페이스는 [ADR 0001](../../docs/adr/0001-backend-infrastructure.md)의
결정을 구현한다.

현재 상태: **D1 스키마 + 헬스체크**. 인증·도메인 엔드포인트는 후속 이슈에서 붙는다.

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
→ `{"ok":true,"name":"@pourover/api","version":"0.0.0","db":"ok"}`

D1 연결 실패 시 503 + `db: "fail"`.

## D1 셋업

### 처음 한 번만 (프로덕션 DB 생성)

```bash
cd apps/api
bunx wrangler d1 create pourover-api
```

출력에서 `database_id` UUID를 받아 `apps/api/wrangler.jsonc`의 `d1_databases[0].database_id`
값(`"local-only-replace-before-deploy"`)을 그 UUID로 교체.

### 마이그레이션 적용

```bash
cd apps/api

# 로컬 (개발용 SQLite, .wrangler/state/v3/d1/ 안)
bunx wrangler d1 migrations apply pourover-api --local

# 프로덕션 (Cloudflare D1)
bunx wrangler d1 migrations apply pourover-api --remote
```

멱등 — 이미 적용된 마이그레이션은 다시 실행되지 않는다.

### 새 마이그레이션 추가

- 파일명: `apps/api/migrations/NNNN_<slug>.sql` (4자리 zero-pad)
- **Forward-only.** down 스크립트 작성하지 않는다. 잘못된 변경은 다음 forward 마이그레이션으로 되돌린다 (ADR D7).
- PR 본문에 마이그레이션 파일을 명시한다.

### 로컬 DB 검사

```bash
cd apps/api

# 테이블 목록
bunx wrangler d1 execute pourover-api --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 임의 쿼리
bunx wrangler d1 execute pourover-api --local \
  --command "SELECT count(*) FROM user;"
```

## 배포

```bash
bun run deploy:api
```

전제: `wrangler.jsonc`의 `database_id`가 실제 UUID로 교체되어 있고, `wrangler secret`으로 필요한 시크릿(추후 이슈)이 등록되어 있을 것.

## 후속 작업

- `better-auth` + Google OAuth — issue #21
- R2 presigned PUT + CF Images Transformations — issue #22
- `POST /log`, `GET /log` 엔드포인트 — issue #23
- CLAUDE.md 업데이트 — issue #24

## 디렉토리 구조

```
apps/api/
  src/
    index.ts        Hono 진입점 (/healthz, D1 touch)
    index.test.ts   handler 테스트 (stub D1)
  migrations/
    0001_init.sql   user/session/account/verification + brewLogEntry
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
```
