# @pourover/webhook

Telegram → GitHub Issues 파이프라인. Cloudflare Workers 위에 Hono로 동작.

봇에게 `/idea`, `/bug`, `/research` 명령으로 메시지를 보내면 자동으로 이
레포에 라벨이 달린 이슈가 생성됩니다.

## 사용 예시

```
/idea Add dark mode toggle to recipe screen
```

```
/bug Timer drifts after 5 min

Brewing for more than 5 min shows wrong elapsed time. Repro:
1. Start a 7-min brew
2. Compare timer to phone clock at 5:00
```

첫 줄이 이슈 제목, 빈 줄 이후가 본문이 됩니다. 라벨은 명령에 따라
`idea` / `bug` / `research` 자동 부착.

## 초기 셋업 (1회)

### 1. Telegram 봇 생성

1. Telegram에서 `@BotFather`와 대화 시작
2. `/newbot` → 이름/유저네임 입력 → **bot token** 받기 (저장)

### 2. 본인 chat_id 확인

1. 만든 봇에게 아무 메시지나 보내기
2. 브라우저에서: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. 응답에서 `result[].message.chat.id` 값 메모

### 3. GitHub Fine-grained PAT

1. https://github.com/settings/personal-access-tokens/new
2. Repository access → 이 레포만 선택
3. Permissions → Issues: **Read and write**
4. 토큰 생성 → 저장

### 4. Worker 시크릿 등록

`apps/webhook/` 디렉토리에서:

```bash
# 임의의 안전한 문자열 (e.g. openssl rand -hex 32)
bunx wrangler secret put TELEGRAM_WEBHOOK_SECRET

bunx wrangler secret put TELEGRAM_BOT_TOKEN     # BotFather가 준 토큰
bunx wrangler secret put ALLOWED_CHAT_IDS       # "12345" 또는 "12345,67890"
bunx wrangler secret put GITHUB_TOKEN           # PAT
bunx wrangler secret put GITHUB_REPO            # "haneulcha/pourover-work"
```

### 5. 배포

```bash
bun run --filter @pourover/webhook deploy
```

배포된 URL을 메모 (e.g. `https://pourover-webhook.kiksky.workers.dev`).

### 6. Telegram에 webhook 등록

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://pourover-webhook.<your>.workers.dev/telegram",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

`{"ok":true,"result":true,...}` 응답이면 성공. 봇에게 `/idea 테스트` 보내고
이슈가 생성되는지 확인.

## 로컬 개발

```bash
bun run --filter @pourover/webhook dev       # wrangler dev (로컬 워커)
bun run --filter @pourover/webhook test:run  # vitest 1회
bun run --filter @pourover/webhook typecheck
```

`dev`로 띄운 워커에 실제 Telegram이 닿게 하려면 ngrok 등 터널이 필요.
보통은 단위 테스트로 검증하고 staging Worker로 배포해 실제 흐름 확인.

## 운영 메모

- **남용 방지**: `ALLOWED_CHAT_IDS`에 없는 chat은 즉시 무시 (200 OK, no-op).
  이슈 폭주는 chat_id 알아내야 가능.
- **시크릿 토큰**: Telegram이 webhook 호출 시 `X-Telegram-Bot-Api-Secret-Token`
  헤더로 전달. 일치하지 않으면 401.
- **에러 처리**: GitHub API 실패 시 사용자에게 Telegram으로 통지 + 500 응답.
  Telegram은 자동 재시도하므로 일시 장애는 보통 자가복구.
- **새 카테고리 추가**: `src/parser.ts`의 `CATEGORIES` 셋만 확장. 라벨은
  카테고리 이름 그대로 GitHub에 전달되므로 GitHub에 라벨도 만들어 두기.

## 디렉토리 구조

```
apps/webhook/
  src/
    index.ts        Hono 진입점 + 라우팅 (/telegram, /health)
    index.test.ts   handler 통합 테스트 (fetch 모킹)
    parser.ts       /command 파싱 — 순수 함수
    parser.test.ts
    issue.ts        GitHub Issue payload 빌더 — 순수 함수
    issue.test.ts
    github.ts       GitHub REST API 클라이언트
    github.test.ts
    telegram.ts     Telegram Bot API 클라이언트
    telegram.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
```
