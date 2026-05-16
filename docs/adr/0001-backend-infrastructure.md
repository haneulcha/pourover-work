# ADR 0001 — Backend Infrastructure: Cloudflare 풀스택 채택

- **Status**: Accepted
- **Date**: 2026-05-16
- **Related issue**: #17
- **Unblocks**: #14 (커피 로그 일기), 그 외 영속 데이터/이미지/사용자 식별이 필요한 후속 기능 일체

## Context

지금까지 앱은 도메인 로직(`@pourover/domain`)과 클라이언트 상태(`apps/web`)만으로 동작했고, 영속 저장소·사용자 식별·서버 측 코드 경로는 의도적으로 미뤄왔다. 커피 로그 일기(#14) 같은 기능은 다음을 요구한다:

- 사용자별 데이터 격리 (인증)
- 구조화된 영속 저장 (관계형 DB)
- 이미지 영속 저장 (객체 스토리지)
- 오프라인 작성분의 서버 동기화 (서버 측 API)

이 결정들을 한 번에 일관되게 박아두지 않으면 후속 이슈마다 반복 논의가 생기고, 운영 표면(이미 Cloudflare에 web 정적 자원 + `apps/webhook` Worker가 올라가 있음)을 일관성 없이 부풀리기 쉽다. 본 ADR은 이런 결정들의 단일 출처를 만든다.

스케일 제약: 1차 사용자는 본인 + 지인 수십 명 수준. 운영 비용은 무료 티어 안에서 끝나는 것이 목표이며, 트래픽이 한 자릿수 RPS를 넘는 시나리오는 가정하지 않는다.

## Decision

### D1. 런타임 / 호스팅 → Cloudflare Workers

새 워크스페이스 `apps/api`를 추가하고 그 위에서 [Hono](https://hono.dev)를 사용하는 Cloudflare Worker로 HTTP API를 제공한다.

근거:
- 현재 운영 표면(루트 `wrangler.jsonc`의 정적 web + `apps/webhook` Hono Worker)이 이미 CF에 있어 추가 벤더 도입 없이 일원화된다.
- 콜드 스타트가 없는 V8 isolate 모델은 한 자릿수 RPS 워크로드에서 가장 비용 효율이 높다.
- `apps/webhook`에서 이미 Hono + wrangler + workers-types 조합을 사용 중이라 학습/도구 재사용 가능.

### D2. 관계형 DB → Cloudflare D1

브루 로그, 사용자 메타, 빈 정보 등 구조화 데이터는 Cloudflare D1(SQLite 기반)에 둔다.

근거:
- 2026년 3월 GA. "프로덕션 OK"라고 부를 수 있는 단계에 도달.
- 무료 티어가 본 프로젝트의 1차 워크로드(개인 + 지인)에 충분: 계정당 DB 10개, 무료 한도 DB당 500 MB, 일 5M reads / 100K writes. 본 워크로드는 무료 한도의 1%도 채우지 않는다. (Paid 진입 시 DB당 10 GB까지.)
- Worker에서 바인딩 하나로 접근, 외부 커넥션 풀/방화벽/네트워크 홉이 없다.
- SQLite 방언은 트랜잭션·인덱스·외래 키 등 본 프로젝트가 필요로 하는 관계형 기능을 충족한다.

방언 락인은 후술 Consequences에 명시한다.

**갈아타기 트리거 (이런 조건이 되면 재평가):**
- → **Turso (libSQL)**: DB-per-user 멀티테넌시(브루 노트 사용자 간 공유 등) 또는 글로벌 read fan-out이 필요해질 때. embedded replica로 read latency 압도적이나 Workers 네이티브 바인딩의 단순함은 못 따라옴.
- → **Neon + Hyperdrive**: JSONB 인덱스, 다국어 full-text search, PostGIS, 또는 단일 DB 10 GB 초과 시.
- → **Supabase Postgres**: Auth + Realtime + Storage를 동시에 원할 때(브루 세션 라이브 공유 같은 시나리오). 단, 무료 티어는 1주 idle 시 자동 일시중지.

PlanetScale(2024년 무료 티어 폐지)·Xata(인수 후 미래 불확실)는 현시점 후보에서 제외.

### D3. 객체 스토리지 → Cloudflare R2 (원본) + CF Images Transformations (변환)

사진 원본은 **Cloudflare R2**에 저장한다. 화면 표시용 리사이즈/포맷 변환은 **Cloudflare Images Transformations의 "external origin" 모드**로 R2 URL을 source 삼아 on-the-fly 변환한다(`/cdn-cgi/image/width=800,format=auto/<r2-public-url>` 패턴).

업로드: 클라이언트 → Worker가 R2 presigned PUT URL 발급 → 클라이언트가 직접 R2로 업로드.
다운로드: 공개 R2 객체 + Images Transformations URL. 권한이 필요한 객체는 짧은 만료의 presigned GET (세부 정책은 후속 ADR).

근거:
- R2 무료 한도 10 GB 저장 + Class A 1M / Class B 10M 요청 + **egress 0원**. 사진 트래픽이 가장 큰 비용 리스크인데 R2가 이 점에서 다른 모든 대안 대비 명확히 유리.
- Worker 네이티브 바인딩(`env.BUCKET.put/get`)으로 직접 접근, S3 호환 API도 동시 제공해 락인 낮음.
- Images Transformations 변환 5,000건/월 무료. 사용자 수십 명 규모에서는 고유 variant 수가 5,000을 넘기 어렵다.

**중요한 함정 회피**: 원본을 CF Images에 *저장*하면 $5/10만장의 스토리지 과금이 발생한다. 본 ADR은 "**R2를 source-of-truth로 유지하고, CF Images는 변환 레이어로만 사용**"을 명시한다. 이 패턴은 락인도 가장 낮다 — 추후 R2를 다른 S3 호환 스토리지로 옮길 때 origin URL만 교체하면 된다.

### D4. 인증 → Google OAuth via `better-auth`

[`better-auth`](https://github.com/better-auth/better-auth) (D1 어댑터 + KV secondary storage)를 사용하고, 1차 신원 공급자는 **Google 단일**로 시작한다. 사용자/세션은 D1에, 짧은 만료의 세션 캐시는 KV에 둔다.

근거:
- **메인테넌스 모멘텀**: 2026년 5월 기준 주간 npm 다운로드 60만+, GitHub 27k stars, 주 단위 릴리즈. 2026년에 Auth.js를 인수해 사실상 표준 위치 확보.
- **CF Workers 1급 시민**: D1 네이티브 어댑터, KV secondary storage, `better-auth-cloudflare` CLI로 부트스트랩 자동화, Hono 공식 예제 존재.
- **Google + Apple OAuth 빌트인**: social provider로 1줄에 붙고, 특히 **Apple OAuth의 ES256 client_secret JWT 6개월 회전을 라이브러리가 자동 처리** — 직접 구현 대비 가장 큰 차별점.
- **락인 낮음**: 사용자/세션을 자체 D1에 보관(SaaS와 정반대). 추후 어댑터 교체로 이전 가능.

기각: `@cloudflare/workers-oauth-provider`는 "**우리가** OAuth provider가 되는" 케이스(MCP 서버 등)용 — Google/Apple을 *upstream*으로 쓰는 본 시나리오와 역할이 다르다. Lucia는 2025년 3월 deprecated. Auth.js는 better-auth가 인수했으며 Next.js 종속 색채가 강해 비-Next 프로젝트엔 과함. Clerk/Auth0는 사용자 DB가 벤더에 귀속돼 락인 비용이 높다.

**모바일 진입 시 Apple OAuth 추가가 강제됨을 미리 명시한다.** Apple의 App Store 정책상 다른 third-party 로그인을 제공하는 iOS 앱은 "Sign in with Apple"도 동등하게 제공해야 한다. 모바일 착수 시점에 (a) Apple Developer 계정 준비, (b) `better-auth`에 Apple provider 활성화(코드 변경은 1줄 수준, client_secret 자동 회전), (c) 기존 Google 사용자와 Apple 사용자 식별 통합(이메일 매칭 정책)을 후속 ADR로 다룬다. 데이터 모델은 "사용자 1명이 복수 OAuth 신원에 매핑될 수 있다"는 형태를 미리 가정한다(better-auth가 기본 제공하는 `account` 테이블이 이 구조).

### D5. 워크스페이스 / 코드 공유 경계

- 새 패키지 **`apps/api`** 신설. `bun` 워크스페이스 멤버로 추가하고, `apps/webhook`과 동일한 패턴(`wrangler.jsonc`, `src/index.ts`, Hono, 자체 `tsconfig.json` + `vitest.config.ts`)을 따른다.
- `@pourover/domain`은 클라이언트와 API가 **그대로 공유**한다. CLAUDE.md 핵심 원칙(도메인에 React/DOM/localStorage 등 플랫폼 의존성 금지)은 유지. 도메인은 Node/Workers/브라우저 어느 런타임에서도 동작해야 한다.
- API 전용 타입(요청·응답 스키마, DB row 타입)은 `apps/api/src/`에 두고, 도메인에는 끌어들이지 않는다. 클라이언트와 공유가 필요해지면 그 시점에 `packages/api-contract` 같은 별도 패키지로 분리한다(이번 ADR에서는 만들지 않는다 — YAGNI).
- `apps/webhook`은 현 위치 유지. 텔레그램→GitHub 이슈 변환은 일기 API와 무관한 별개 도메인이므로 `apps/api`로 합치지 않는다.

### D6. 환경 / 시크릿 관리

- **Production 시크릿**: `wrangler secret put <KEY>`. 코드/저장소에 평문으로 들어가지 않는다.
- **로컬 개발 시크릿**: 각 워크스페이스 디렉토리의 `.dev.vars` 파일. **gitignore 필수**.
- **비밀이 아닌 설정**: `wrangler.jsonc`의 `vars` 필드에 평문으로 둔다(예: 환경 이름, 외부 API base URL 중 공개해도 무방한 것).
- **바인딩(D1, R2, KV)**: `wrangler.jsonc`에 선언하고, 환경별로 다른 인스턴스를 쓸 때는 `env.production` / `env.preview` 객체로 분리한다.

기준: "코드 저장소를 그대로 공개해도 보안 사고가 나지 않아야 한다."

### D7. DB 마이그레이션 정책

- 도구: **`wrangler d1 migrations`** 내장 기능 사용.
- 파일 위치: **`apps/api/migrations/NNNN_<slug>.sql`** (`NNNN`은 4자리 zero-pad 순번).
- **Forward-only.** down 마이그레이션 작성하지 않는다. 잘못된 변경은 새 forward 마이그레이션으로 되돌린다. 개인 프로젝트 스케일에서 down은 비용 대비 효용이 없고, 운영 사고 시 더 위험하다.
- 적용 방법: 로컬은 `wrangler d1 migrations apply <DB> --local`, 프로덕션은 `--remote`. CI에서 자동 적용은 본 ADR 시점에는 도입하지 않는다(수동 + Worker 배포 직전 단계로 충분).
- 스키마 변경은 코드 변경과 동일 PR로 묶는다. PR 본문에 마이그레이션 파일을 명시.

## Considered alternatives (기각)

**스택 전체:**
- **Supabase + Vercel** — 풀-매니지드 Postgres, Realtime, Auth, Storage가 매력적이지만 본 프로젝트엔 과잉. 두 벤더로 운영 표면 분산. R2 대비 egress 비용 리스크. **기각.**
- **Neon(서버리스 PG) + Vercel** — 진짜 Postgres가 필요한 시점에만 합리적. 현 워크로드는 D1로 충분. 벤더 추가만 발생. **기각** (단, D2 갈아타기 트리거 충족 시 재평가).
- **자체 VPS + Postgres** — 운영 부담 비합리적(SSL 갱신, 백업, OS 패치). **기각.**
- **Firebase / Firestore** — NoSQL 문서 모델이 본 데이터(로그 엔트리, 빈, 사용자) 관계와 어긋남. **기각.**

**DB 단독:**
- **Turso (libSQL)** — embedded replica로 read latency 우수, 무료 한도가 D1보다 후함. 하지만 Workers에선 fetch 기반이라 D1 네이티브 바인딩의 단순함을 못 따라옴. DB-per-user나 글로벌 read fan-out이 필요해질 때 재고. **현시점 기각.**
- **PlanetScale** — 2024년 Hobby(무료) 플랜 폐지, 최저 $5/mo. 개인 프로젝트 부적합. **기각.**
- **Xata** — 모회사 인수 후 미래 불확실. **기각.**

**스토리지 단독:**
- **Backblaze B2** — Cloudflare 경유 egress는 무료지만 이미지 변환 부재, origin이 외부라 latency/운영 복잡도 증가. **기각.**
- **Supabase Storage** — 1 GB 무료 한도가 빠듯하고 다른 Supabase 서비스와 공유. **기각.**
- **Vercel Blob** — Hobby 전체 1 GB 공유, Vercel 종속. **기각.**
- **UploadThing** — 사용량 기반 과금 + 락인. **기각.**
- **CF Images에 원본 저장** — $5/10만장 스토리지 과금이 R2(10 GB 무료) 대비 비효율. **기각** (R2를 원본으로, CF Images는 변환 레이어로만).

**인증 단독:**
- **`@cloudflare/workers-oauth-provider`** — 우리가 OAuth provider가 되는 케이스용. Google/Apple을 upstream으로 쓰려면 핸들러를 직접 작성해야 함. 본 ADR의 시나리오(외부 IdP 소비)와 역할 불일치. **기각** — MCP 서버를 향후 노출할 일이 생기면 별건으로 *추가* 도입.
- **Lucia Auth** — 2025년 3월 deprecated, 어댑터 EOL. **기각.**
- **Auth.js (NextAuth v5)** — 2026년 better-auth가 인수. Next.js 종속 색채가 강해 비-Next에 부적합. **기각.**
- **Clerk / Auth0** — 무료 한도는 넉넉하나 사용자 DB가 벤더에 귀속돼 락인 비용이 높음. **기각.**
- **직접 OAuth 구현 (fetch + JWT)** — Apple ES256 client_secret 6개월 회전, PKCE, state, 세션 회전 모두 직접 처리. 비용 대비 가치 없음. **기각.**
- **인증 없이 익명 디바이스 ID** — 일기 데이터가 디바이스 분실 시 영구 손실. 사용자 약속 위반. **기각.**

## Consequences

**Positive**
- 단일 벤더(Cloudflare) 위에 모든 런타임 자원을 둠으로써 운영 표면 최소화 — 대시보드/계정/청구가 한 곳.
- 무료 티어 안에서 1차 출시 가능.
- R2 egress 0원이 사진 트래픽 비용 리스크를 사실상 제거.
- `apps/webhook`과 동일한 wrangler/Hono 패턴 재사용으로 학습 비용 추가 없음.

**Negative / Trade-offs**
- **벤더 락인**: D1 SQL 방언, R2 바인딩 API, KV 모델 모두 CF-specific. 이전 비용은 비자명. → 데이터 액세스는 `apps/api/src/db/` 한 곳에 모아 추후 마이그레이션 시 표면을 작게 유지.
- **D1 한계**: 단일 리전 마스터, 한 DB당 10 GB, 트랜잭션 사이즈 제한. 본 워크로드엔 무관하지만 사진 메타가 폭증하면 재평가 필요.
- **단일 벤더 장애 = 전체 장애**: CF 광역 장애 시 web + webhook + api + 로그인 + 사진 모두 영향. 본 프로젝트 스케일에서 수용.
- **Apple OAuth 부채**: 모바일 진입 시점에 Apple Developer 계정 + provider 활성화 필요. `better-auth`가 ES256 회전을 자동 처리하므로 코드 부담은 작지만 운영 작업(키 등록 등)은 남음. 데이터 모델은 `account` 테이블이 미리 다중 신원 구조라 부담 최소화.
- **`better-auth` 의존**: 메이저 변경 가능성. 단 모멘텀이 가장 큰 라이브러리라 stale 리스크는 낮다고 판단. 락인은 어댑터 교체로 회피 가능.
- **CF Images Transformations 무료 한도**: 월 5,000 변환 초과 시 과금. 사용자 수십 명 규모에선 초과 불가능하지만 trim 정책 미수립 시 폭주 가능 — 변환 URL은 고정된 variant 집합(예: 800w, 1600w)으로 제한할 것(후속 ADR).

## Future considerations (후속 ADR 후보)

이번 ADR에서 결정하지 *않은* 것들, 그러나 본 기반 위에서 곧 결정해야 할 것들:

- **Apple OAuth 추가** — 모바일 앱 착수와 함께. ID 통합 정책 포함.
- **사진 처리 정책** — 업로드 시 클라이언트 리사이즈/압축, HEIC 변환, 최대 해상도, R2 키 구조 (`users/{uid}/photos/{id}.jpg` 등), 만료/정리 정책.
- **오프라인 동기화 충돌 해결** — last-write-wins 이상으로 갈지, vector clock류가 필요한지.
- **레이트리밋 / 남용 방지** — IP 기반 vs 세션 기반, CF 내장 Rate Limiter 사용 여부.
- **백업** — D1 export 주기, R2 lifecycle.
- **관측 가능성** — Workers Analytics Engine, Logpush, 외부 APM 도입 여부.

## Next steps

본 ADR이 머지된 직후 만들 후속 이슈들(각각 별도 PR):

1. **`apps/api` 스켈레톤** — workspace 멤버 추가, `wrangler.jsonc`, `tsconfig.json`, `vitest.config.ts`, Hono 헬스체크 엔드포인트, 루트 `package.json` 스크립트(`dev:api`, `deploy:api`).
2. **D1 초기 스키마 + 마이그레이션 인프라** — `apps/api/migrations/0001_init.sql`로 `users`, `identities`, `brew_log_entries` 테이블 생성. `wrangler d1 migrations` 사용 흐름을 README에 기록.
3. **인증** — `better-auth` 통합 (D1 어댑터 + KV secondary), Google provider 활성화, `/auth/*` 라우트, 클라이언트 측 로그인 UI. `better-auth-cloudflare` CLI 활용.
4. **R2 presigned PUT 엔드포인트 + CF Images Transformations 설정** — `POST /photos/upload-url`이 R2 presigned URL을 반환. R2 버킷을 public으로 노출하고 zone에 Images Transformations 활성화, 허용 variant(예: `width=800`, `width=1600`) 결정.
5. **첫 도메인 엔드포인트** — `POST /log`, `GET /log` (#14의 진입점).
6. **CLAUDE.md 업데이트** — 아래 "CLAUDE.md updates required" 참고.

## CLAUDE.md updates required

본 ADR 머지 시 CLAUDE.md에 다음을 반영한다:

- **Stack 섹션**: "Runtime / PM" 외에 "Server runtime: Cloudflare Workers (Hono)", "DB: Cloudflare D1", "Object storage: Cloudflare R2 (원본) + CF Images Transformations (변환)", "Sessions: Cloudflare KV", "Auth: `better-auth` + Google provider (1차)" 항목 추가.
- **Layout 섹션**: `apps/api/` 항목 추가 — "@pourover/api — Cloudflare Worker, 영속 API".
- **Core Principles**: 도메인-UI 분리 원칙에 "도메인은 Workers 런타임에서도 import 가능해야 한다(Node-only API 금지)" 한 줄 보강.
- **Commands 섹션**: `bun run --filter @pourover/api dev` 등 새 워크스페이스 스크립트 예시 추가. D1 마이그레이션 명령어 한 줄 안내.

## References

- Cloudflare D1 limits & pricing — https://developers.cloudflare.com/d1/platform/limits/
- D1 GA announcement (2026-03) — https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues/
- Cloudflare R2 pricing — https://developers.cloudflare.com/r2/pricing/
- Cloudflare Images pricing — https://developers.cloudflare.com/images/pricing/
- CF Images + R2 reference architecture — https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/
- `better-auth` — https://github.com/better-auth/better-auth
- `better-auth` Apple provider — https://better-auth.com/docs/authentication/apple
- Better Auth on Cloudflare (Hono example) — https://hono.dev/examples/better-auth-on-cloudflare
- Lucia Auth deprecation (2025-03) — https://github.com/lucia-auth/lucia/discussions/1714
- `@cloudflare/workers-oauth-provider` (역할 비교용) — https://github.com/cloudflare/workers-oauth-provider
- Apple App Store guideline 4.8 (Sign in with Apple 요구) — https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple
- Hono on Cloudflare Workers — https://hono.dev/docs/getting-started/cloudflare-workers
