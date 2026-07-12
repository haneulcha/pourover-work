# 커피 로그 일기 (#14 v1) — 설계

- **Date**: 2026-07-12
- **Backlog**: #14 (브루잉 노트 / 커피 로그 일기)
- **기반**: ADR 0001 (Cloudflare 풀스택). 이 기능은 ADR이 명시적으로 unblock 대상으로 지목한 첫 도메인 기능.
- **Status**: 설계 확정, 구현 대기

## 목표

로그인한 유저가 커피를 내릴 때마다 그 브루가 **자동으로 계정에 영속 기록**되고, 나중에 **일기처럼 다시 꺼내 볼 수 있게** 한다. 로그 한 개 = 자동 캐처된 레시피·감정·시간 + 유저가 선택적으로 남긴 짧은 메모.

### 북극성 정렬

제품 북극성("내리는 순간의 좋은 동료, 덜어내기, 방해하지 않기")에 맞춰:

- 저장은 **완료 시 자동·조용히** — "저장" 버튼으로 리추얼을 방해하지 않는다.
- 유저 능동 표면은 **메모 한 칸**뿐. 감정은 이미 있던 표면 재사용.
- 비로그인 유저에게는 화면을 그대로 두고 **속삭임 한 줄**만 얹는다(권유 아님, 발견 경로).

## 범위

### 포함 (v1)

- 완료된 브루의 서버 영속 저장 (로그인 유저)
- 선택적 짧은 메모(최대 280자)
- 일기 목록(newest-first) + 상세(읽기 전용 요약 + 메모 편집 + 삭제)
- 네트워크 실패 시 조용한 localStorage 폴백

### 제외 (YAGNI / 후속)

- 사진 (R2 업로드 인프라 = ADR Next-step #4, 아직 미구현)
- 오프라인 동기화 큐 (ADR Future considerations) — v1은 실패 시 localStorage 보관까지만
- 페이지네이션 (수십 건 규모, 상한 200으로 충분)
- 로그 필터/검색/통계

## 결정된 세부 사항 (모호점 해소 기록)

구현 중 재논의를 막기 위해, 설계 리뷰에서 갈렸던 지점의 확정값을 남긴다.

- **D1. 로그 id는 클라이언트 생성.** 완료 시점의 `BrewSession`에 `crypto.randomUUID()`로 id를 고정하고 POST body에 실어 보낸다. 서버는 `INSERT ... ON CONFLICT(id) DO NOTHING`으로 멱등 처리. → StrictMode 이중 발화·재진입·재시도·오프라인 지연 저장이 모두 안전.
- **D2. 저장/갱신 타이밍.** complete 진입 시 POST(멱등) 1회. feeling/메모 변경은 로컬 상태만 갱신하고 **종료 또는 메모 blur 시 PATCH 1회로 flush**. 매 상호작용마다 PATCH 하지 않는다.
- **D3. PATCH 부분 갱신 의미.** 필드는 모두 optional. **키가 있으면(`null` 포함) 갱신, 없으면 유지.** `{feeling: null}`은 감정 지우기, `{}`는 무변경.
- **D4. recipe는 JSON 스냅샷.** 일기는 "그때 실제로 내린 것"의 불변 기록이어야 하므로 method 알고리즘이 바뀌어도 과거 로그는 고정. input 재계산 방식 기각.
- **D5. 목록은 요약 DTO, 상세는 전체.** `GET /api/log`는 서버가 recipe JSON을 파싱해 요약 필드만 반환. 전체 recipe가 필요한 상세는 `GET /api/log/:id`.
- **D6. 테이블명 `brewLogEntry`.** better-auth camelCase 컨벤션(DB에 이미 적용됨)에 맞춘다. ADR 본문의 `brew_log_entries`(snake) 표기는 이 결정으로 대체.
- **D7. 실패 시 조용히 localStorage 보관.** 에러 표시 없음(침묵 원칙). memo 포함 엔트리를 로컬에 stash. 후속 오프라인 동기화가 재전송.
- **D8. 제약값.** memo ≤ 280자(클라+서버, 초과 400). feeling ∈ `{calm, neutral, wave}`(그 외 400). custom 메서드 recipe도 그대로 스냅샷.

## 아키텍처

### 데이터 모델 — `apps/api/migrations/0002_brew_log.sql` (forward-only)

```sql
CREATE TABLE "brewLogEntry" (
  "id"          TEXT NOT NULL PRIMARY KEY,          -- 클라이언트 생성 UUID
  "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "brewedAt"    TEXT NOT NULL,                       -- ISO. BrewSession.startedAt
  "durationSec" INTEGER NOT NULL,                    -- completedAt - startedAt
  "feeling"     TEXT,                                -- calm | neutral | wave | null
  "memo"        TEXT,                                -- 선택, ≤280자
  "recipe"      TEXT NOT NULL,                       -- Recipe JSON 스냅샷
  "createdAt"   TEXT NOT NULL,
  "updatedAt"   TEXT NOT NULL
);
CREATE INDEX "brewLogEntry_userId_brewedAt_idx"
  ON "brewLogEntry"("userId", "brewedAt" DESC);
```

### 도메인 — `packages/domain/src/serialize.ts` (순수)

Recipe는 branded types(`Grams`/`Celsius`/`Seconds`/`Ratio`)를 담으므로 JSON 왕복 시 브랜드가 벗겨진다. Principle 2(branded types 강제)를 지키기 위해:

- `recipeToJSON(recipe: Recipe): string`
- `recipeFromJSON(json: string): Recipe` — `g/c/s/ratio` 생성자로 재-브랜딩, custom 메서드 포함.

도메인은 순수 유지(직렬화 로직만, 플랫폼 의존성 없음, Workers/Node/브라우저 공용).

### API — `apps/api/src/log.ts` (모든 라우트 세션 가드)

better-auth `auth.api.getSession({ headers })`로 userId 추출하는 미들웨어. 세션 없으면 **401**. 소유권 위반은 **404**(존재 노출 방지). API 전용 요청/응답 타입은 `apps/api/src/`에 두고 도메인에 끌어들이지 않는다(ADR D5).

| 메서드 | 경로 | 동작 | 반환 |
|---|---|---|---|
| `POST` | `/api/log` | `{id, recipe, brewedAt, durationSec, feeling?, memo?}` → 멱등 생성 | `201 {id}` |
| `GET` | `/api/log` | 본인 엔트리 newest-first (상한 200), 요약 DTO | `200 [{id, brewedAt, durationSec, method, dripper, coffee, totalWater, feeling, memoSnippet}]` |
| `GET` | `/api/log/:id` | 소유 엔트리 전체(recipe JSON 포함) | `200 {…, recipe}` / `404` |
| `PATCH` | `/api/log/:id` | `{feeling?, memo?}` 부분 갱신(D3) | `200 {id}` / `404` |
| `DELETE` | `/api/log/:id` | 소유 엔트리 삭제 | `204` / `404` |

**CORS**: `index.ts`의 `allowMethods`에 **`PATCH`·`DELETE` 추가**(현재 `GET/POST/OPTIONS`뿐 — 없으면 프로덕션 CORS에서만 터진다).

### 웹 — CompleteScreen 변경 (`features/complete/`)

- **로그인 유저**: complete 진입 시 자동 `POST /api/log`(멱등, D1) 1회, `entryId` 보관. 하단에 **메모 textarea**(≤280자) 추가. feeling 탭·메모 blur → 로컬 갱신 후 **flush 시 PATCH**(D2).
- **비로그인 유저**: 지금 화면 그대로 + 메모 자리에 **속삭임 한 줄** "로그인하면 이 기록이 일기에 남아요" + `signInWithGoogle` 진입. `text-muted`·소형.
- **실패 처리(D7)**: POST/PATCH 실패 시 에러 표시 없이 memo 포함 엔트리를 localStorage에 stash. 논블로킹.

### 웹 — 일기 (`features/diary/`, 신규)

- **진입점**: WallScreen의 `LoginPill` 옆, **로그인 시에만** 보이는 조용한 "내 기록" pill → `screen: "diary"`. 세션 loading 중엔 미노출(플리커 방지).
- **목록**: `GET /api/log` 요약 DTO를 newest-first 렌더. 행 = 날짜 · method·dripper · 원두·물 · 소요시간 · `FeelingGlyph` · 메모 스니펫.
- **상세**: 행 탭 → `GET /api/log/:id` → `recipeFromJSON`으로 rehydrate → 읽기 전용 요약 + 메모 편집(PATCH) + 삭제(DELETE).

### 공유 컴포넌트 추출

CompleteScreen의 레시피 요약 카드를 프레젠테이셔널 **`<BrewSummary>`**(`features/complete/` 또는 `ui/`)로 추출해 CompleteScreen과 DiaryDetail이 공유한다. 순수 리팩토링(동작 불변).

### 앱 라우팅 — `features/app/AppRoot.tsx`

`AppState.screen`에 `"diary"` 추가 + 선택된 로그 id 상태. Wall → diary → diary 상세 전이는 기존 `withViewTransition` 패턴 재사용.

## 데이터 흐름

1. 로그인 유저가 브루 완료 → CompleteScreen 진입 → 클라가 UUID 생성 → `POST /api/log`(멱등).
2. 유저가 감정 탭 / 메모 작성 → 로컬 상태 갱신 → 종료·blur 시 `PATCH`로 flush.
3. 실패 시 → localStorage stash(침묵).
4. 나중에 Wall → "내 기록" → `GET /api/log` 목록 → 행 탭 → `GET /api/log/:id` 상세 → 메모 편집/삭제.

## 에러 처리

- **API**: 401(미인증), 400(잘못된 body/제약 위반: memo>280, 잘못된 feeling), 404(미소유/부재), 500(DB). 소유권 위반은 404로 통일.
- **웹**: 저장 실패 → 침묵 + localStorage(D7). 목록/상세 로드 실패 → 조용한 빈/재시도 상태(에러 폭발 금지).

## 테스트 계획

CLAUDE.md 테스트 규약(도메인 위주 + 백엔드 실검증) 준수.

### 검증 인프라 (핵심 결정)

**API 엔드포인트 테스트는 실제 D1에서 실행한다.** 기존 `index.test.ts`처럼 `DB.prepare().first()`를 목킹하면 컬럼 오타·`WHERE userId` 소유권 누락·`ON CONFLICT` 동작을 검증하지 못한다(정확히 프로덕션에서 터지는 것들). → **`@cloudflare/vitest-pool-workers`** 도입: D1 바인딩 + 마이그레이션 자동 적용된 워커 환경에서 실 SQL 실행. 기존 순수 유닛 테스트(healthz 등)는 유지하고, D1-backed 엔드포인트 테스트를 별도 test project/config로 추가.

### 도메인

- `recipeFromJSON(recipeToJSON(r)) ≈ r` 라운드트립 + **브랜드 보존** + `totalWater === Σ pourAmount` 불변식 유지(기존 invariant 스위프에 얹기). custom 메서드 recipe 포함.

### API (실 D1)

- **인증 가드**: 미인증 → 401. 실제 better-auth 세션 1개 시드해 통과/거부 통합 검증(핸들러 로직 테스트는 `getSession` 스텁으로 빠르게).
- **멱등성**: 같은 id로 POST 2회 → 행 1개.
- **CRUD**: create → list(요약 DTO 형태) → get(:id 전체) → patch → delete 경로.
- **PATCH 부분 갱신(D3)**: feeling만 / memo만 / `feeling:null` 지우기 각각, 누락 필드 미변경.
- **소유권**: 남의 id로 GET·PATCH·DELETE → 404, 행 생존.
- **제약**: memo>280 → 400, 잘못된 feeling → 400.
- **CORS 프리플라이트**: PATCH·DELETE OPTIONS가 allow 반환(기존 CORS 테스트 패턴 확장, A5 회귀 방지).

### 웹 (testing-library, 가볍게)

- 로그인 상태에서 자동 POST가 **정확히 1회** 발화(StrictMode 이중 렌더 가드).
- 비로그인 상태에서 속삭임 한 줄 노출, 메모 textarea 미노출.
- diary 목록 렌더 + 삭제가 DELETE 호출.

## 원격 검증 체크리스트 (CLAUDE.md 규약 + 메모리 `pre-prod 검증 갭`)

D1 마이그레이션·CORS·세션 경계를 건드리므로 **로컬 그린은 안전 보장이 아니다.** PR 본문에 명시:

- [ ] `0002_brew_log.sql` `--remote` 적용
- [ ] 배포 환경에서 E2E 1회: 로그인 → 브루 완료(자동 저장) → 일기 목록 조회 → 상세 → 메모 편집 → 삭제
- [ ] "원격에서 어떻게 깨질 수 있나" 기술: 마이그레이션 원격 미적용 / CORS PATCH·DELETE 누락 / 세션 쿠키 cross-origin 경계

## 구현 순서 (예상 PR 분할)

1. **도메인 직렬화** — `serialize.ts` + 테스트 (독립, 순수).
2. **D1 스키마 + API 엔드포인트** — `0002` 마이그레이션, `log.ts`, CORS 보강, vitest-pool-workers 검증 인프라 + API 테스트.
3. **웹 저장 경로** — CompleteScreen 메모/자동저장/속삭임, `<BrewSummary>` 추출, localStorage 폴백.
4. **웹 일기** — diary 목록/상세, Wall 진입점, AppRoot 라우팅.

각 단계 1 PR 권장(CLAUDE.md).
