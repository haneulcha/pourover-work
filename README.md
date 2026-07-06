# Pourover — 핸드드립 계산기

핸드드립 레시피 계산기이자, 커피를 내리는 순간의 좋은 동료를 지향하는 앱. 커피/로스팅/맛 취향을 고르면 메서드별(Kasuya 4:6, Hoffmann V60 등 9종 + 커스텀) 푸어 스케줄을 계산하고, 실시간 브루잉 타이머(소리·진동 큐, 리드인 신호)로 안내한다.

제품 방향은 [`docs/product.md`](docs/product.md), 작업 규약은 [`CLAUDE.md`](CLAUDE.md) 참조.

## 워크스페이스

| 경로 | 패키지 | 역할 |
|---|---|---|
| `apps/web` | `@pourover/web` | Vite + React 19 앱 |
| `apps/api` | `@pourover/api` | Cloudflare Worker (Hono) — D1 + better-auth |
| `apps/webhook` | `@pourover/webhook` | Telegram → GitHub Issues 봇 |
| `packages/domain` | `@pourover/domain` | 순수 도메인 로직 (브루잉 메서드 플러그인 레지스트리) |

배포는 Cloudflare 단일 벤더 (web 정적 자산 + Workers, 루트/각 워크스페이스의 `wrangler.jsonc`). 근거는 [`docs/adr/0001-backend-infrastructure.md`](docs/adr/0001-backend-infrastructure.md).

## 시작하기

```bash
bun install
bun run dev        # web 개발 서버
bun run test:run   # 전체 테스트
bun run typecheck  # 전체 타입체크
```

## 문서 맵

- `docs/product.md` — 북극성·방향·로드맵
- `docs/brand.md` — 보이스·톤·비주얼 원칙
- `docs/design-tokens.md` — 디자인 토큰 시스템 (단일 출처)
- `docs/decisions.md` — 제품·디자인 결정 기록 / `docs/adr/` — 기술 ADR
- `docs/wiki/` — 검증 갖춘 커피 지식 그래프
- `docs/superpowers/` — 기능별 스펙·플랜·이월 이슈 (작업 히스토리)
